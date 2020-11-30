const WebSocketServer = require('ws').Server;
// 정적 파일을 서비스하는 서버
const server = require('http').createServer(
  require('ecstatic')({ root: `${__dirname}/www` })
);

const wss = new WebSocketServer({ server: server });
wss.on('connection', ws => {
  console.log('Client connected');
  ws.on('message', msg => {
    console.log(`message: ${msg}`);
    broadcast(msg);
  });
});

function broadcast(msg) {
  wss.clients.forEach(client => {
    client.send(msg);
  });
}

server.listen(process.argv[2] || 8080);
