'use strict';

import level from 'level';
import timestamp  from 'monotonic-timestamp';
import JSONStream from 'JSONStream';
import amqp from 'amqplib';
import * as http from 'http';

const db = level('./msgHistory');

http.createServer((req, res) => {
  res.writeHead(200);
  db.createValueStream()
    .pipe(JSONStream.stringify())
    .pipe(res);
}).listen(8090);

let channel, queue;
amqp // amqp 브로커와의 연결 수립 - RabbitMQ 사용
  .connect('amqp://localhost')
  // 커뮤니케이션 상태를 유지하기 위해 세션과 비슷한 역할을 할 채널 생성
  .then(conn => conn.createChannel())
  .then(ch => {
    channel = ch;
    // chat이라는 이름의 교환기 설정 - 팬아웃 교환기
    // assertExchange() 함수는 브로커에 교환기가 있는지 확인하고 없다면 브로커가 생성
    return channel.assertExchange('chat', 'fanout');
  })
  // chat_history라는 대기열 생성
  // 기본적인 큐가 내구성을 가지므로 독점적/자동삭제 큐가 아니라면 옵션 X
  .then(() => channel.assertQueue('chat_history'))
  .then((q) => {
    queue = q.queue;
    // 교환기에 대기열을 바인딩
    // 팬아웃 교환기이므로 필터링, 라우팅 키, 패턴 등 없음
    return channel.bindQueue(queue, 'chat');
  })
  .then(() => {
    // 작성한 대기열에서 오는 메시지를 수신
    return channel.consume(queue, msg => {
      const content = msg.content.toString();
      console.log(`Saving message ${content}`);
      // 타임스탬프를 key로 사용해서 LevelDB에 저장하여 메시지를 날짜별로 정렬
      db.put(timestamp(), content, err => {
        // 모든 메시지를 승인하고 메시지가 DB에 성공적으로 저장된 후에만 볼 수 있음
        if (!err) channel.ack(msg);
        // 브로커에서 err로 인해 ACK(수신확인)를 받지 못하면 메시지가 재처리되도록 대기열에 보관
        // 대기열에 보관하는 것으로 서비스의 신뢰성을 끌어올려주는 AMQP의 기능
        // 만약 명시적 확인 응답을 보내지 않겠다면 consume() 함수에 { noAck: true }를 전달
      })
    });
  }).catch(err => console.log('err: %o', err));
