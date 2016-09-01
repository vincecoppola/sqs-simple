# SQS Simple

Install with
```sh
npm i --save sqs-simple
```
Import with
```javascript
var sqs = require('sqs-simple');
```

The `sqs-simple` package exports the following:

## `async initQueue(opts)`
This function creates two SQS Queues.  One is a normal queue for processing.
The other is a dead-letter queue.  The dead-letter queue is connected to the
normal queue after being created.  If there's a redrive policy already
specified on an identically named normal queue, it will be overwritten.

*NOTE:* This function creates two queues based on names, this is the only
function in the package that performs operations on more than one queue.

The `opts` object should have the following keys:

* `queueName`: Name of normal work queue.  This must be 80 characters or fewer
  alphanumeric characters 
* `sqs` (optional): Provide a custom SQS Client object.  If unspecified
  the library will create its own SQS Client in `us-west-2` region
* `maxReceiveCount` (default: `5`): This is the number of times a handler
  will attempt to be run for each message.  This number is unique per
  message in the queue.  If this value is exceeded, the message will be
  redirected to the dead-letter queue
* `visibilityTimeout` (default: `30`): The default VisibilityTimeout value
  for the queue.  This value specifies to SQS how long a handler should be
  able to work on a message before it is delivered to a different handler
  or is redirected to the dead-letter queue
* `deadLetterSuffix` (default `"_dead"`): A string that is appended to the
  `queueName` value provided in these options.  The result of this
  concatenation will be used as the name for the dead letter queue

This function returns an object in the following format:
```json
{
  "queueUrl": ".../${opts.queueName}",
  "deadQueueUrl": ".../${opts.queueName + opts.deadLetterSuffix}"
}
```

## `async getQueueUrl(opts)`
This function is used to determine a `QueueUrl` based only on the `QueueName`.
It is useful when you want to create a `QueueListener` without having to run
`initQueue`.

The `opts` object should have the following keys:

* `queueName`: Name of normal work queue.  This must be 80 characters or fewer
  alphanumeric characters 
* `sqs` (optional): Provide a custom SQS Client object.  If unspecified
  the library will create its own SQS Client in `us-west-2` region

## `async deleteQueue(opts)`
This function can be used to delete a queue.

*NOTE:* This function can only be called once every 60 seconds

The `opts` object should have the following keys:

* `queueUrl`: URL of the queue to delete.  Must be a fully formed URL
* `sqs` (optional): Provide a custom SQS Client object.  If unspecified
  the library will create its own SQS Client in `us-west-2` region

## `async purgeQueue(opts)`
This function can be used to purge a queue.

*NOTE:* This function can only be called once every 60 seconds

The `opts` object should have the following keys:

* `queueUrl`: URL of the queue to purge.  Must be a fully formed URL
* `sqs` (optional): Provide a custom SQS Client object.  If unspecified
  the library will create its own SQS Client in `us-west-2` region

## `async emptyQueue(opts)`
This function can be used to empty a queue.

*NOTE:* This function can only be called many times but does not
offer the same assurances that `purgeQueue` does.

The `opts` object should have the following keys:

* `queueUrl`: URL of the queue to empty.  Must be a fully formed URL
* `sqs` (optional): Provide a custom SQS Client object.  If unspecified
  the library will create its own SQS Client in `us-west-2` region

## `class QueueSender { constructor(opts) }`
This class is used to insert things into the SQS Queue.  It has the following
constructor options:

* `queueUrl`: URL of the queue to empty.  Must be a fully formed URL
* `sqs` (optional): Provide a custom SQS Client object.  If unspecified
  the library will create its own SQS Client in `us-west-2` region

### Methods
* `insert(msg)`: Serialise the `msg` argument and put it into the SQS
  queue.  If you want your `QueueListener` to receive an `Object`, then
  pass this function an object.


## `class QueueListener { constructor (opts) }`
This class is used to listen to SQS Queues for messages and handle them.
It has the following constructor options:

* `queueUrl`: URL of the queue to empty.  Must be a fully formed URL
* `handler`: This is a promise returning function that performs the logic
  which you desire to process each message inserted into the queue with
  `QueueSender.insert()`.  This function is called with two arguments.  The
  first argument is the `JSON.parse()`'d copy of the JSON serialised message
  that was in the queue.  The second arugment is a promise returning function
  which can takes an integer number of seconds to move back the visibility
  timeout.  This number of seconds is the number of seconds from the time of
  invocation to move the visibility timeout.  If your message originally had
  90s visibility timeout and you call this function 20s into your handler with
  a value of 100s, your message will be redelivered or redirected to the
  dead-letter queue 170s from when the handler started.  Failure to complete
  this API operation will reject the promise.  This is purely informational in
  the handler, all error handling needed by the library will still occur.  The
  main case for this is if you start with a timeout of 30s, realise you need
  1000s to perform your operation but cannot extend.  Catching this exception
  will allow you to cancel your operation.
* `sqs` (optional): Provide a custom SQS Client object.  If unspecified
  the library will create its own SQS Client in `us-west-2` region
* `visibilityTimeout` (default: `30`): The VisibilityTimeout value
  for each message received by this listener.  This value specifies to SQS how
  long a handler should be able to work on a message before it is delivered
  to a different handler or is redirected to the dead-letter queue
* `waitTimeSeconds` (default `1`): This is the number of seconds that
  the SQS Client should wait to receive messages from the API before giving up
  on that polling iteration
* `maxNumberOfMessages` (default: `1`): This is the maximum number of
  messages that should be fetched in each polling of the API.  *Note* that even
  though we call the handler asynchronously for all of these messages, we will
  not poll the API again until all of the handlers have run through to
  completion.  This option should always be set to `1` unless you know that
  your handlers take approximately the same time to complete or you are OK with
  your listener waiting on the longest message to complete its processing


### Methods
* `start()`: start polling the api for messages
* `stop()`: stop polling the api for messages

### Events

* `starting`: Emitted with no arguments before the first poll of the API
* `stopping`: Emitted when the last handler has completed
* `error`: Emitted when *any* error occurs.  It is passed two arguments.
  The first argument is the underlying `Error`.  The second argument is
  a string of value 'api', 'handler', or 'payload'.
    * `api`: These are errors which are caused by SQS Api issues or
      are library-created, but are severe enough to be equivalent in
      importance.  These errors indicate that the SQS Queue is not functioning.
      These are the errors that you should be logging and investigating
    * `payload`: These are errors cause by malformed payloads.  If you
      manually insert things into the queue which are not in the required
      format, one of these errors will be reported.  They should be safe
      to ignore, but because they are `error` events, they must be explicityly
      ignored and care must be taken to avoid ignoring other errors
    * `handler`: These are errors that occur while running your handler against
      the message provided.  Whether these should be logged is up to you.

Example of handling error events:
```javascript
queue.on('error', (err, errtype) => {
  if (errtype !== 'payload') {
    makeLoudNoiseInReportingSystem(err);
    process.exit(1);
  }
});
```

# Example Usage
Here's an example of how you could use this library to send messages.  It's
written `async` and `await` because that's the only sane way to write async js.
```javascript
let sqs = require('sqs-simple');

function myOperation(input) {
  return input.sort();
}

async function main() {
  let qUrls = sqs.initQueue({queueName: 'Q'});

  let queueListener = new sqs.QueueListener({
    queueUrl: qUrls.queueUrl,
    handler: async (msg, changeVisbility) => {
      if (msg.listOfThings.length > 10000000) {
        await changeVisibility(100); 
      }
      await doStuff(msg.listOfThings);
    },
  });


  let deadQueueListener = new sqs.QueueListener({
    queueUrl: qUrls.queueUrl,
    handler: async (msg) => {
      reportVeryLoudly(err);
    },
  });

  q.on('error', err, errType) {
    switch (errType) {
      case "handler":
        reportQuietly(err);
        break;
      case "payload":
        break;
      default:
        reportVeryLoudly(err);
        process.exit(1);
    }
  }

  q.start();

  let queueSender = new sqs.QueueSender({
    queueUrl: qUrls.queueUrl,
  });

  await queueSender.insert({
    listOfThings: [1,2,3,4,5],
  });
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
```

# More Reading
If you're unsure about the properties of SQS Queues, check out this document
that gives great information.  Where possible, I've tried to retain the SQS
Api's naming for options.

http://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/SQSConcepts.html

# Hacking!
Find something to hack on, hack on it, then submit a PR.  Issues should be
tracked in Github Issues.

You probably want to do this to start:
```sh
git clone http://github.com/jhford/sqs-simple
cd sqs-simple
npm install
npm test
```

There are a couple environment variables you probably should know about:

* `CONSTANT_QUEUE_NAME=1`
* `TEST_QUEUE_URL=https://sqs.us-west-2.amazonaws.com/<snip>/<snip>`
* `AWS_ACCESS_KEY_ID=<snip>`
* `AWS_SECRET_ACCESS_KEY=<snip>`

The first two let you reuse a queue so you don't get the default behaviour of
creating and deleting a bunch of queues.  This lets you run the unit tests
completely more than once a minute and doesn't mess up your sqs account

The last two are used by the upstream aws-sdk library if an SQS Client is not
provided to set the authorization parameters correctly.

## TODO:
- [x] add function to get a QueueUrl from a QueueName.  This didn't matter when
  there was only a single class, but now that they're split into sender and
  listener it's a pain to set up the listener.  High priority
- [ ] init/delete/purge queue should retry for up to 65s if the reason for
  failure was that a create/delete/purge queue operation was less than 60
  seconds before.  Medium priority
- [ ] add ability to create a single queue without creating DL-Queue.  Low
  priority
- [ ] be able to have more than receiveMessages running at a time in a single
  `QueueListener`.  Not priority

