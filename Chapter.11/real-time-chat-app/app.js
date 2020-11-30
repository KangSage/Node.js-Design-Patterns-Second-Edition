const WebSocketServer = require('ws').Server;
// 정적 파일을 서비스하는 서버
const server = require('http').createServer(
  // HTTP 서버를 만들고 정적 파일을 제공하기 위해 ecstatic이라는 미들웨어를 추가
  // 어플리케이션의 클라이언트에서 필요로 하는 리소스들을 제공 하는데 필요
  require('ecstatic')({ root: `${__dirname}/www` })
);

// WebSocket 서버의 새 인스턴스를 만들고 기존의 HTTP 서버에 연
const wss = new WebSocketServer({ server: server });

// 연결 이벤트에 대한 이벤트 리스너를 등록하고 대기
wss.on('connection', ws => {
  console.log('Client connected');
  // 새로운 클라이언트가 연결될 때 마다 수신 메시지를 listening하고 그 메시지를 전파
  ws.on('message', msg => {
    console.log(`message: ${msg}`);
    broadcast(msg);
  });
});

// 연결된 모든 클라이언트에게 send 함수를 반복 호출
function broadcast(msg) {
  wss.clients.forEach(client => {
    client.send(msg);
  });
}

server.listen(process.argv[2] || 8080);
