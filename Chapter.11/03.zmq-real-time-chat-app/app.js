// 제2판의 소스는 zmq 모듈의 유지보수가 중단되어 3판의 깃허브 소스를 가져와 작성함

// package.json에 "type": "module"을 선언하여 ES Module 방식 사용
import { createServer } from 'http'
import staticHandler from 'serve-handler'
import ws from 'ws'
import yargs from 'yargs'
import zmq from 'zeromq'

// serve static files
const server = createServer((req, res) => {
  return staticHandler(req, res, { public: 'www' })
})

let pubSocket
async function initializeSockets () {

  // PUB 소켓을 만들고
  pubSocket = new zmq.Publisher()
  // CLI의 --pub 인수로 들어온 포트를 바인딩
  await pubSocket.bind(`tcp://127.0.0.1:${yargs.argv.pub}`)

  // SUB 소켓을 만들고
  const subSocket = new zmq.Subscriber()

  // 다른 인스턴의 PUB 소켓에 연결
  const subPorts = [].concat(yargs.argv.sub)
  // 대상 포트는 인스턴스의 갯수와 같아야 하므로 인자로 여러개 들어올 수 있다.
  for (const port of subPorts) {
    console.log(`Subscribing to ${port}`)
    subSocket.connect(`tcp://127.0.0.1:${port}`)
  }
  // chat으로 시작되는 메시지만 수신하도록 구독시 prefixes = chat 필터 사용
  subSocket.subscribe('chat')


  for await (const [msg] of subSocket) {
    // subSocket에 구독된 메시지를 출력하고
    console.log(`Message from another server: ${msg}`)
    // chat 을 떼어내서 웹소켓 클라이언트에 전파한다
    broadcast(msg.toString().split(' ')[1])
  }
}

initializeSockets().then(r => console.log('r: %o', r));

const wss = new ws.Server({ server })
wss.on('connection', client => {
  console.log('Client connected')
  // WebSocket에서 새 메시지를 받으면 연결된 모든 클라이언트에게 전파하고
  client.on('message', msg => {
    console.log(`Message: ${msg}`)
    broadcast(msg)
    // PUB 소켓을 통해서도 게시함
    pubSocket.send(`chat ${msg}`)
  })
})

function broadcast (msg) {
  for (const client of wss.clients) {
    if (client.readyState === ws.OPEN) {
      client.send(msg)
    }
  }
}

server.listen(yargs.argv.http || 8080)
