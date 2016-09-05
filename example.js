'use strict';
// Force logging ON for just the queue library
process.env.DEBUG = 'queue*';

let sqs = require('./') || require('sqs-simple');

// Example of what we're going to do when a 'soft' error is hit.  This might be
// equivalent to doing a debug level log message in your application
function reportQuietly(err) {
  console.log('Unimportant error: ' + err.stack || err);
}

// Example of what we're going to do when a 'hard' error is hit.  This might be
// reporting to a watching service for your application
function reportVeryLoudly(err) {
  console.log('##################################################');
  console.log('# OMG RUN AROUND WITH YOUR PANTS ON YOUR HEAD!!! #');
  console.log('##################################################');
  console.dir(err.stack || err);
  process.exit(1);
}

// Simple operation to do on the queue.  This is a contrived simple example
// since the important thing to demonstrate is the queueing portion
function myOperation(input) {
  input.sort();
  console.log(`Sorted ${JSON.stringify(input)}`);
  return input;
}

async function main() {

  // We want to make sure that the Queues we'll listen to exist
  let qUrls = await sqs.initQueue({queueName: 'Q'});

  // Setting up the normal work queue listener
  let queueListener = new sqs.QueueListener({
    queueUrl: qUrls.queueUrl,
    handler: async (msg, changeVisbility) => {
      if (msg.listOfThings.length > 10000000) {
        await changeVisibility(100);
      }
      await myOperation(msg.listOfThings);
    },
  });

  // Setting up the dead-letter queue listener
  let deadQueueListener = new sqs.QueueListener({
    queueUrl: qUrls.deadQueueUrl,
    handler: async (msg) => {
      console.dir(msg);
      let err = new Error('dead letter');
      err.originalMsg = msg;
      reportVeryLoudly(err);
    },
  });

  // Setting up error handling for the normal queue
  queueListener.on('error', (err, errType) => {
    switch (errType) {
      case "handler":
        reportQuietly(err);
        break;
      case "payload":
        console.log('ignoring payload errors');
        break;
      default:
        reportVeryLoudly(err);
    }
  });

  // Setting up error handling for the dead-letter listener
  deadQueueListener.on('error', (err, errType) => {
    reportVeryLoudly(err);
  });

  // Start listening
  queueListener.start();
  deadQueueListener.start();

  // Create a queue sender
  let queueSender = new sqs.QueueSender({
    queueUrl: qUrls.queueUrl,
  });

  // Send a sample message
  await queueSender.insert({
    listOfThings: [3,2,1,5,7,3,1,2,3,5,8,9,0,7],
  });

  // Wait for 5 seconds then shut things down.  We only do
  // this to ensure that the example finishes
  setTimeout(() => {
    queueListener.stop();
    deadQueueListener.stop();
  }, 5000);
}

main().catch(err => {
  console.error(err.stack || err);
  process.exit(1);
});
