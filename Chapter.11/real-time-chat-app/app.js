const WebSocketServer = require('ws').Server;

// Node.js 어플리케잇현을 Redis 서버에 연결하기 위해 사용 가능한
// 모든 Redis 명령을 지원하는 Client Package
const redis = require('redis');

// 두 개의 다른 연결을 인스턴스화

// 구독 전용 연결 인스턴스
const redisSub = redis.createClient();
// 게시 전용 연결 인스턴스
const redisPub = redis.createClient();

// 정적 파일을 서비스하는 서버
const server = require('http').createServer(
  // HTTP 서버를 만들고 정적 파일을 제공하기 위해 ecstatic이라는 미들웨어를 추가
  // 어플리케이션의 클라이언트에서 필요로 하는 리소스들을 제공 하는데 필요
  require('ecstatic')({ root: `${__dirname}/www` })
);

// WebSocket 서버의 새 인스턴스를 만들고 기존의 HTTP 서버에 연결
const wss = new WebSocketServer({ server: server });

// 연결 이벤트에 대한 이벤트 리스너를 등록하고 대기
wss.on('connection', ws => {
  console.log('Client connected');
  // 새로운 클라이언트가 연결될 때 마다 수신 메시지를 listening하고 그 메시지를 전파
  ws.on('message', msg => {
    console.log(`message: ${msg}`);
    // 연결된 클라이언트에서 새 메시지를 받아서 chat_message 채널에 게시
    redisPub.publish('chat_message', msg);
    // Redis를 통해서 돌아올 것이기 때문에 직접 전파하지 않음
    // broadcast(msg);
  });
});

// chat_message 채널을 구독
redisSub.subscribe('chat_message');
// 게시된 모든 메시지를 수신하도록 리스너 등록
redisSub.on('message', (channel, msg) => {
  // 현재 WebSocket 서버에 연결된 모든 클라이언트에 메시지를 전파
  wss.clients.forEach(client => {
    client.send(msg);
  });
});

// 연결된 모든 클라이언트에게 send 함수를 반복 호출
// function broadcast(msg) {
//   wss.clients.forEach(client => {
//     client.send(msg);
//   });
// }

server.listen(process.argv[2] || 8080);
