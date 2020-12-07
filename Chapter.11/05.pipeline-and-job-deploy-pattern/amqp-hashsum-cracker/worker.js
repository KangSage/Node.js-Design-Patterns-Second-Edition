import amqp from 'amqplib';
import crypto from 'crypto';

let channel, queue;

amqp
  .connect('amqp://127.0.0.1')
  .then(conn => conn.createChannel())
  .then(ch => {
    channel = ch;
    return channel.assertQueue('jobs_queue');
  })
  .then(q => {
    queue = q.queue;
    consume();
  })
  .catch(err => console.log(err.stack));

function consume() {
  channel.consume(queue, function(msg) {
    const data = JSON.parse(msg.content.toString());
    const variations = data.variations;
    variations.forEach(word => {
      console.log(`Processing ${word}`);
      const shasum = crypto.createHash('sha1');
      shasum.update(word);
      const digest = shasum.digest('hex');
      if (digest === data.searchHash) {
        console.log(`Found! => ${word}`);
        channel.sendToQueue('results_queue',
          new Buffer(`Found! => ${digest} => ${word} ${process.env.PORT}`));
      }
    });
    channel.ack(msg);
  });
}
