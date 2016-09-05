/**
 * A Queue backed by SQS
 */

const _ = require('lodash');
const debug = require('debug');
const url = require('url');
const SQS = require('aws-sdk').SQS;

/**
 * The default internal version of the message payload
 */
const MSG_VERSION = 1;
const SQS_QUEUE_NAME_PATTERN = /^[a-zA-Z0-9_-]{1,80}$/;

const assert = require('assert');

const EventEmitter = require('events');

/**
 * Parse out the options, sets defaults and allows
 * user to specify which options they expect
 */
function parseOptions(_opts, keys) {
  if (_opts.sqs && _opts.sqsConfig) {
    throw new Error('If you provide SQS client, don\'t provide SQS configuration');
  }

  let opts = _.defaults({}, {
    visibilityTimeout: 30,
    waitTimeSeconds: 1,
    maxNumberOfMessages: 1,
    deadLetterSuffix: '_dead',
    maxReceiveCount: 5,
    sqsConfig: {
      region: 'us-west-2',
      apiVersion: '2012-11-15',
    }
  }, _opts);

  // Create the SQS object if we don't have one but we want one.
  if (!opts.sqs && _.includes(keys, 'sqs')) {
    assert(opts.sqsConfig.region, 'Must provide SQS Region');
    opts.sqs = new SQS(opts.sqsConfig);
  }

  // If provided, a QueueUrl must be a valid URL
  if (opts.queueUrl) {
    let u = url.parse(opts.queueUrl);
    if (!u.host || !u.protocol) {
      throw new Error('Invalid QueueUrl provided');
    }
  }

  // If provided, QueueName should be valid as should the deadQueueUrl
  if (opts.queueName) {
    if (!SQS_QUEUE_NAME_PATTERN.exec(opts.queueName)) {
      throw new Error('Invalid Queue Name: ' + opts.queueName);
    }
  }

  // If we're caring about a dead letter queue, let's validate it
  if (_.includes(keys, 'deadQueueName')) {
    let deadQueueName = opts.queueName + opts.deadLetterSuffix;

    if (!opts.queueName) {
      throw new Error('Dead Letter Queue needs a basis');
    }

    if (!SQS_QUEUE_NAME_PATTERN.exec(deadQueueName)) {
      throw new Error('Invalid Dead-Letter Queue Name: ' + deadQueueName);
    }
  }


  if (opts.handler && _.includes(keys, 'handler') && typeof opts.handler !== 'function') {
    throw new Error('If provided, handler must be a promise-returning function');
  }

  let present = _.keys(opts);
  let missing = keys.filter(key => !_.includes(present, key));

  if (missing.length > 0) {
    let err = new Error('Missing options: ' + missing.join(', '));
    err.missing = missing;
    err.present = present;
    throw err;
  }

  return _.pick(opts, keys);
}

/**
 * Encode a key into the desired format
 */
function __encodeMsg (input, version = MSG_VERSION) {
  switch(version) {
    case 1:
      return JSON.stringify({
        version: 1,
        data: input,
      })
      break;
    default:
      throw new Error('Encoding for unknown version of message payload');
  }
}

/**
 * Decode a message.  If we know how to get the data we want from a message
 * encoded with a different version we do
 */
function __decodeMsg (input) {
  let msg = JSON.parse(input);
  switch (msg.version) {
    case 1:
      return msg.data;
      break;
    default:
      throw new Error('Decoding unknown version of message payload');
  }
}

/**
 * Initialize a queue and a matching dead-letter queue.  This function will
 * automatically associate connect the dead-letter queue.  This function will
 * overwrite existing VisibiltyTimeout and RedrivePolicy attributes on the
 * queues if they already exist.
 *
 * TODO: This function should check on error to see if the reason for the error
 * is the 60 between-delete-and-create api imposed limit is the error for
 * creation and if so, try again in 5 seconds up to a max of 65 seconds before
 * giving up
 */
async function initQueue (opts) {
  opts = parseOptions(opts, [
    'sqs',
    'queueName',
    'maxReceiveCount',
    'visibilityTimeout',
    'deadLetterSuffix',
  ]);

  // Shorthand
  let sqs = opts.sqs;

  const _debug = debug('queue:initQueue:' + opts.queueName);

  let deadQueueName = opts.queueName + opts.deadLetterSuffix;

  if (!/^[a-zA-Z0-9_-]{1,80}$/.exec(opts.queueName)) {
    throw new Error('Invalid Queue Name: ' + opts.queueName);
  }

  if (!/^[a-zA-Z0-9_-]{1,80}$/.exec(deadQueueName)) {
    throw new Error('Invalid Dead-Letter Queue Name: ' + deadQueueName);
  }

  // We need to create the dead letter queue first because we need to query the ARN
  // of the queue so that we can set it when creating the main queue
  let deadQueueUrl = (await sqs.createQueue({
    QueueName: deadQueueName,
  }).promise()).QueueUrl;

  _debug('created dead letter queue %s', deadQueueUrl);

  // Now we'll find the dead letter put queue's ARN
  let deadQueueArn = (await sqs.getQueueAttributes({
    QueueUrl: deadQueueUrl,
    AttributeNames: ['QueueArn'],
  }).promise()).Attributes.QueueArn;

  let queueUrl = (await sqs.createQueue({
    QueueName: opts.queueName,
  }).promise()).QueueUrl;

  await sqs.setQueueAttributes({
    QueueUrl: queueUrl,
    Attributes: {
      // Bug in AWS-Sdk? the receiveMessage VisibiltyTimeout accepts strings
      // but not here...
      VisibilityTimeout: Number(opts.visibilityTimeout).toString(),
      RedrivePolicy: JSON.stringify({
        maxReceiveCount: opts.maxReceiveCount,
        deadLetterTargetArn: deadQueueArn,
      }),
    },
  }).promise();

  _debug('created queue %s', queueUrl);

  return {queueUrl, deadQueueUrl};
}

/**
 * Given a queueName, determine the queueUrl
 */
async function getQueueUrl(opts) {
  opts = parseOptions(opts, ['sqs', 'queueName']);

  return (await opts.sqs.getQueueUrl({
    QueueName: opts.queueName,
  }).promise()).QueueUrl;
}


/**
 * Use the correct API function to purge the queue of items.  This has the
 * unfortunate consequence of only being able to run once every 60 seconds on
 * the specified queue.
 * 
 *
 * TODO: like initQueue, this should retry every 5s if the reason for failure is
 * that there was a previous purge in the last 60s.
 */
async function purgeQueue(opts) {
  opts = parseOptions(opts, ['sqs', 'queueUrl']);
  const _debug = debug('queue:purgeQueue:' + url.parse(opts.queueUrl).pathname.slice(1));

  await opts.sqs.purgeQueue({QueueUrl: opts.queueUrl}).promise();
  _debug('purged queue %s', opts.queueUrl);
}

/**
 * Delete a queue.  
 */
async function deleteQueue(opts) {
  opts = parseOptions(opts, ['sqs', 'queueUrl']);
  const _debug = debug('queue:deleteQueue:' + url.parse(opts.queueUrl).pathname.slice(1));

  await opts.sqs.deleteQueue({QueueUrl: opts.queueUrl}).promise();
  _debug('deleted queue %s', opts.queueUrl);
}

/**
 * Hack the system!  Basically, we want something for unit tests and the sort
 * to let us have an empty queue.  This function will try to receive messages.
 * It will go for 5s (5 calls to receiveMessage) or as long as there is more
 * than a single message returned by the API.
 *
 * This is a best effort only!
 *
 * TODO: Make the 5s count only since the first of a series of returns with
 * zero items in the return value.
 */
async function emptyQueue(opts) {
  opts = parseOptions(opts, ['sqs', 'queueUrl']);
  // shorthand
  let sqs = opts.sqs;
  let queueUrl = opts.queueUrl;

  const _debug = debug('queue:emptyQueue:' + url.parse(queueUrl).pathname.slice(1));


  let msg;
  let totalDeleted = 0;

  let start = Date.now();

  do {
    // We don't use the configuration from opts, since we're trying to empty
    // the queue.  We want the default of 10 messages so we can kill them all,
    // and we shouldn't need too much time to delete them 
    msg = await sqs.receiveMessage({
      QueueUrl: queueUrl,
      VisibilityTimeout: 4,
      MaxNumberOfMessages: 10,
      WaitTimeSeconds: 1,
    }).promise();

    let msgs = msg.Messages || [];
    
    // TODO: Use the batch version of this function
    await Promise.all(msgs.map(msg => {
      return sqs.deleteMessage({
        QueueUrl: queueUrl,
        ReceiptHandle: msg.ReceiptHandle,
      }).promise();
    }));
    totalDeleted += msgs.length;
    _debug('deleted %d msgs, %d total msgs', msgs.length, totalDeleted);
  } while (msg.length > 0 || (Date.now() - start) < 5000);
  // ^^^ We'll try to delete until there are no messages and we will try for at
  // least 5 seconds.  This is for eventual consistency concerns
  _debug('emptied queue %s (maybe!)', queueUrl);
}


/**
 * A QueueSender knows how to insert items into an SQS Queue.  The messages
 * given to the `.insert()` method should be in the format that the eventual
 * handler will be given.  The QueueSender will internally serialise this
 * payload, the QueueListener will deserialise the payload.
 */
class QueueSender {
  constructor(opts) {
    
    // These are the options that a QueueListener
    // must have
    let requiredOpts = [
      'sqs',
      'queueUrl',
    ];

    // Figure them out
    opts = parseOptions(opts, requiredOpts);

    // Now set them
    for (let opt of requiredOpts) {
      this[opt] = opts[opt];
    }

    // We want to make sure that debugging output is somewhat useful, so we'll
    // include a little bit of info in each debug message.
    this.debug = debug('queue:QueueSender:' + url.parse(opts.queueUrl).pathname.slice(1));
  }

  /**
   * Insert a message into the Queue.  `msg` must be JSON serializable and must
   * be a truthy value
   */
  async insert(msg) {
    assert(typeof msg !== 'undefined');

    let result = await this.sqs.sendMessage({
      QueueUrl: this.queueUrl,
      MessageBody: __encodeMsg(msg),
    }).promise();

    this.debug('inserted message');

    return result;
  }

}


/**
 * A QueueListener knows how to listen on an SQS queue for messages and run a
 * handler function on them.  The handler function is a promise-returning
 * function (await'd).  This handler function is passed in a deserialised
 * version of of the message given to the `QueueSender.insert()` method as its
 * first argument.  The second argument is a promise-returning function which
 * can be used to change the visibility time of the message directly.  If the
 * handler promise rejects, the message is immediately marked as a failed
 * receipt.  You do not need to call this second arugment function to mark a
 * failure, it's provided so that handlers can set longer timeouts if they
 * think that their payload might take longer than originally expected.
 *
 * This class is an event emitter.  The following events get emitted:
 *   - `starting` is emitted just before starting the polling loop.  Emitted
 *     without arguments
 *   - `stopped` after the last handler completes running. Emitted without
 *     arguments
 *   - `error` is emitted when an error occurs.  The firt arugment to the
 *     handler is the Error() object which caused the emission.  The second
 *     argument is a string specifying the type of error.  This string will
 *     be 'api', 'payload' or 'handler'.  An api error is an error running
 *     an underlying SQS Api.  A payload error is an encoding problem with
 *     the payload.  A handler error is an error which was caused by a
 *     handler returning a promise rejection.  A handler error means
 *     that the API and message encoding worked as normal.  I
 */
class QueueListener extends EventEmitter {
  constructor(opts) {
    super();
    
    // These are the options that a QueueListener
    // must have
    let requiredOpts = [
      'sqs',
      'queueUrl',
      'visibilityTimeout',
      'waitTimeSeconds',
      'maxNumberOfMessages',
      'handler',
    ];

    // Figure them out
    opts = parseOptions(opts, requiredOpts);

    // Now set them
    for (let opt of requiredOpts) {
      this[opt] = opts[opt];
    }

    // We want to make sure that debugging output is somewhat useful, so we'll
    // include a little bit of info in each debug message.
    this.debug = debug('queue:QueueListener:' + url.parse(opts.queueUrl).pathname.slice(1));

    // used to decide whether to launch another __receiveMsg() call
    this.running = false;


  }

  /*
   * Start listening on a queue
   */
  start() {
    this.debug('starting listening to queue');
    this.running = true;
    // Using setTimeout instead of nextTick because we want this to happen
    // after all the other jazz in the event loop happens, rather than starving
    // it by always forcing it to happen before using nextTick
    setTimeout(async () => {
      this.emit('starting');
      await this.__receiveMsg();
    }, 0);
  }

  /**
   * Stop listening on a queue.  Might not stop queue instantly
   */
  stop() {
    this.running = false;
    this.debug('stopping listening to queue');
  }

  /**
   * Internal-only method which is the actual code that polls SQS and hands off
   * the messages it received onto the handler of the class.  Since this method
   * is *alway* called from a setTimeout handler, it's important for it to
   * handle all errors.  This function *must* not be capable of rejecting since
   * it's where all the later promise code chains off
   *
   * The __handleMsg() function should also take care of all of its own error
   * situations... basically __receiveMsg() and __handleMsg() are fire and
   * forget methods...  Here thar be dragons!
   */
  async __receiveMsg() {
    let msg;
    try {
      msg = await this.sqs.receiveMessage({
        QueueUrl: this.queueUrl,
        MaxNumberOfMessages: this.maxNumberOfMessages,
        WaitTimeSeconds: this.waitTimeSeconds,
        VisibilityTimeout: this.visibilityTimeout,
      }).promise();
    } catch (err) {
      this.emit('error', err, 'api');
      return;
    }

    let msgs = [];
    if (msg.Messages) {
      if (!Array.isArray(msg.Messages)) {
        this.emit('error', new Error('SQS Api returned non-list'), 'api');
        return;
      }
      this.debug('received %d messages', msgs.length);
      msgs = msg.Messages;
    }

    // We never want this to actually throw.  The __handleMsg function should
    // take care of emitting the error event
    try {
      await Promise.all(msgs.map(x => this.__handleMsg(x)));
    } catch (err) {
      let error = new Error('__handleMsg is rejecting when it ought not to.  ' +
                    'This is a programming error in QueueListener.__handleMsg()');
      error.underlyingErr = err;
      error.underlyingStack = err.stack || '';
      this.debug('This really should not happen... %j', error);
      this.emit('error', error, 'api');
    }

    if (this.running) {
      // Same as the call in .start(), but here we do a small timeout of 50ms
      // just to make sure that we're not totally starving eveything
      setTimeout(async () => {
        await this.__receiveMsg();
      }, 50);
    } else {
      this.emit('stopped');
    }
  }

  /**
   * Internal method for handling each received message.  This function *must*
   * not throw because of the way that it's called.  It should emit 'error'
   * events and return early as the method of showing an exceptional sitaution
   *
   * The control flow in this function should work like this:
   * the closures should take care of emitting the events required.  The main
   * function body itself should never throw.  Use return in the main function
   * body to terminate the execution of this function
   */
  async __handleMsg(msg) {
    let msgId = msg.MessageId;
    let rh = msg.ReceiptHandle;
    this.debug('handling message %s', msgId);

    // This is passed into the handler to change the current visibility
    // timeout.  This can be used to allow for a short initial visibility
    // timeout.  The shorter initial timeout would be used for processing the
    // message, but the handler should call this message with however long it
    // thinks that it needs to process the message.  The `newTimeout` parameter
    // is the number of seconds that the message should be visible after the
    // call is made.
    //
    // https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/SQS.html#changeMessageVisibility-property.
    let changetimeout = async (newTimeout) => {
      assert(typeof newTimeout === 'number');
      assert(newTimeout >= 0);
      // I suspect that the API doesn't honour a setting of 0, so using something simliar :(
      let newSetting = newTimeout || 1;
      try {
        let outcome = await this.sqs.changeMessageVisibility({
          QueueUrl: this.queueUrl,
          ReceiptHandle: rh,
          VisibilityTimeout: newSetting,
        }).promise();
        this.debug('message %s now expires %s (+%ds)', msgId, new Date(Date.now() + newSetting * 1000), newSetting);
      } catch (err) {
        this.debug('error changing message %s visibility', msgId);
        this.debug(err);
        this.emit('error', err, 'api');
        throw new Error('Failed to change timeout');
      }
    }

    // Delete this message
    let deleteMsg = async () => {
      try {
        await this.sqs.deleteMessage({
          QueueUrl: this.queueUrl,
          ReceiptHandle: rh,
        }).promise();
        this.debug('removed message %s from queue', msgId);
      } catch (err) {
        this.debug('error deleting message %s visibility', msgId);
        this.debug(err);
        this.emit('error', err, 'api');
      }
    }

    // Parse the message.
    let body;
    try {
      body = __decodeMsg(msg.Body);
    } catch (err) {
      this.emit('error', err, 'payload');
      // Let's pretty print some debugging information
      let contentPreview = msg.Body;
      // not perfect, but meh, i don't care
      if (contentPreview.length > 100) {
        contentPreview = contentPreview.slice(0, 97) + '...';
      }
      this.debug('message %s has malformed payload, deleting: %s', msgId, contentPreview);

      // We now know that this message isn't valid on this instance of
      // QueueListener.  Since we might have a mixed pool of listeners and
      // another one might be able to understand this, let's mark the message
      // as a failure and put it back into the queue.  This is mainly to
      // support gradual upgrades
      try {
        await changeTimeout(0);
      } catch(err) { }
      return;
    }

    // Run the handler.  If the handler promise rejects, then we'll delete the
    // message and return.  If the handler promise resolves, then we'll delete
    // the message and return.  If the deletion on handler resolution or
    // changetimeout on handler rejection failes, then we return then.
    try {
      await this.handler(body, changetimeout);
      try {
        await deleteMsg();
      } catch(err) { }
      this.debug('handler successfully processed message %s', msgId);
      return;
    } catch (err) {
      debug('handler failed to process message %s', msgId);
      try {
        await changetimeout(0);
      } catch(err) { } 
      this.emit('error', err, 'handler');
      return;
    }
  }
}

module.exports = {
  QueueSender,
  QueueListener,
  initQueue,
  getQueueUrl,
  purgeQueue,
  emptyQueue,
  deleteQueue,
  __sqsMsgStorageVersion: MSG_VERSION,
  __encodeMsg,
  __decodeMsg,
}
