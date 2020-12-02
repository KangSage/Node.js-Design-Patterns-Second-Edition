"use strict";

import { createServer } from "http";
import staticHandler from 'serve-handler'
import amqp from "amqplib";
import JSONStream from "JSONStream";
import request from "request";
import ws from "ws";

let httpPort = process.argv[2] || 8080;

//static file server
const server = createServer((req, res) => {
  return staticHandler(req, res, { public: 'www' })
})

let channel, queue;
amqp
  .connect('amqp://127.0.0.1')
  .then(conn => conn.createChannel())
  .then(ch => {
    channel = ch;
    return channel.assertExchange('chat', 'fanout');
  })
  .then(() => {
    // exclusive: true를 넘겨서 독점적 큐로 만든다
    return channel.assertQueue(`chat_srv_${httpPort}`, {exclusive: true});
  })
  .then(q => {
    queue = q.queue;
    return channel.bindQueue(queue, 'chat');
  })
  .then(() => {
    return channel.consume(queue, msg => {
      msg = msg.content.toString();
      console.log('From queue: ' + msg);
      broadcast(msg);
    }, {noAck: true});
  })
  .catch(err => console.log(err))
;

const wss = new ws.Server({server});
wss.on('connection', ws => {
  console.log('Client connected');
  //query the history service
  request('http://localhost:8090')
    .on('error', err => console.log(err))
    .pipe(JSONStream.parse('*'))
    .on('data', msg => ws.send(msg))
  ;

  ws.on('message', msg => {
    console.log(`Message: ${msg}`);
    // 대상 교환기(chat)와 라우팅 키를 지정한다.
    // 우리는 fanout 교환기이므로 ''을 넣는다
    channel.publish('chat', '', new Buffer(msg));
  });
});

function broadcast(msg) {
  wss.clients.forEach(client => client.send(msg));
}

server.listen(httpPort);
