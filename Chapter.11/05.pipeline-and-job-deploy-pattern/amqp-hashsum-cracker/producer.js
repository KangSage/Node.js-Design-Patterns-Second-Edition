import amqp from 'amqplib';
import variationsStream from 'variations-stream';

const alphabet = 'abcdefghijklmnopqrstuvwxyz';
const batchSize = 10000;
const maxLength = process.argv[2];
const searchHash = process.argv[3];

let connection, channel, count = 0;

amqp
  .connect('amqp://localhost')
  .then(conn => {
    connection = conn;
    return conn.createChannel();
  })
  .then(ch => {
    channel = ch;
    produce();
  })
  .catch(err => console.log(err));

function produce() {
  let batch = [];
  variationsStream(alphabet, maxLength)
    .on('data', combination => {
      batch.push(combination);
      // 생성된 변형 항목들을 각각 10000개의 항목으로 그룹화한 다음
      if (batch.length === batchSize) {
        count++;

        // 일치시킬 해시와 확인할 단어 묶음이 포함된 메시지를 작성
        const msg = { searchHash: searchHash, variations: batch };
        // 작업 대기열에 직접 메시지를 전달하는 역할
        channel.sendToQueue(
          'jobs_queue',
          new Buffer(JSON.stringify(msg)));
        batch = [];
      }
    })
    .on('end', () => {
      console.log('end');
      // send remaining combinations
      const msg = { searchHash: searchHash, variations: batch };
      channel.sendToQueue(
        'jobs_queue',
        new Buffer(JSON.stringify(msg)),
        // when the last message is sent, close the connection
        // to allow the application to exit
        function() {
          console.log('job close');
          channel.close();
          connection.close();
        }
      );
    })
}
