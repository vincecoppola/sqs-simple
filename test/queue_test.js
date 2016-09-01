const assume = require('assume');
const sqs = require('./create-sqs-client');
const subject = require('../lib/sqs');
const url = require('url');
const slugid = require('slugid');
const debug = require('debug')('queue-tests');

/**
 * Tests for queues.  Because we want to handle the case that the queue has
 * junk from other people in it, any test that needs to see a specific message
 * should use a slugid.v4() value to make sure that the current messgae is
 * actually the specific message requested or just something from a different
 * test run.  This would work without doing this, but it means that we'd need
 * to wait at least 60 seconds to start each set of tests after initializing
 * the queues.
 */


describe('Message Formatting', () => {
  it('should encode a message correctly', () => {
    let expected = {
      version: 1,
      data: 'hi',
    }
    let actual = JSON.parse(subject.__encodeMsg('hi'));
    assume(actual).deeply.equals(expected);
  });

  it('should decode a valid version 1 message correctly', () => {
    let expected = 'hi';
    let internalFormat = {
      version: 1,
      data: expected,
    }
    let actual = subject.__decodeMsg(JSON.stringify(internalFormat));
    assume(actual).deeply.equals(expected);
  });

  it('should throw an error trying to decode an invalid version message correctly', done => {
    let internalFormat = {
      version: 'unicorn',
      data: 'lalalalal',
    }
    try {
      let actual = subject.__decodeMsg(JSON.stringify(internalFormat));
      done(new Error('should not execute'));
    } catch (err) {
      done();
    }
  });


  it('should throw an error trying to handle non-json', done => {
    try {
      let actual = subject.__decodeMsg('{hi}');
      done(new Error('should not execute'));
    } catch (err) {
      done();
    }
  });
});

describe('Queues', () => {
  let qurl;
  let qname = 'queue-tests-' + slugid.nice().slice(0,7);

  // While developing, it's really handy to have static names for the queues
  // used in testing.  For things like travis, let's generate a unique name for
  // the test.
  if (!process.env.CONSTANT_QUEUE_NAME) {
    qname = 'queue-tests-' + process.env.USER;
  } else {
    qname = 'queue-tests-' + slugid.nice().slice(0,7);
  }

  before(async () => {
    if (!process.env.CONSTANT_QUEUE_NAME) {
      // If we're using constant queue names, then we want to create the queue
      // and wait 65 seconds.  This 65s wait is because the API seems to use
      // 60s as sync timeout for the eventual consistency for queue operations
      // like delete and I have a gut feeling that it does this for dead-letter
      // queue redirecting as well.  Half of working against AWS Apis feels
      // like trusting gut feelings about how it's not doing what you expect
      // :'(
      qurl = await subject.initQueue({sqs, queueName: qname});
      debug('Waiting 65 seconds to allow the SQS API to catch up to itself');
      return new Promise(res => {
        setTimeout(() => { 
          debug('OK, done waiting!');
          res();
        }, 65 * 1000);
      });
    } else {
      // If we're using constant queue name, we want to know what the URL for
      // the Queues are.
      // TODO: make this not suck
      qurl = {
        queueUrl: (process.env.TEST_QUEUE_URL || '').trim(),
        deadQueueUrl: (process.env.TEST_QUEUE_URL || '').trim() + '_dead',
      };
      debug('NOTE: Skipping initQueue, assuming last Queue is still OK');
    }
  });

  beforeEach(async () => {
    // Sometimes you just want to empty the queue, but that's not really quite
    // as good as the API's purge option which is more likely to result in
    // correct return values
    await Promise.all([
      subject.emptyQueue({
        sqs: sqs,
        queueUrl: qurl.queueUrl,
      }),
      subject.emptyQueue({
        sqs: sqs,
        queueUrl: qurl.deadQueueUrl,
      }),
    ]);
  });

  after(async () => {
    // For local testing, since we have a single name, let's leave the results
    // around for debugging
    if (!process.env.CONSTANT_QUEUE_NAME) {
      await Promise.all([
        subject.deleteQueue({
          sqs: sqs,
          queueUrl: qurl.queueUrl
        }),
        subject.deleteQueue({
          sqs: sqs,
          queueUrl: qurl.deadQueueUrl
        }),
      ]);
    }
  });

  it('QueueSender should initialize and send a message', async () => {
    let q = new subject.QueueSender({sqs, queueUrl: qurl.queueUrl});
    let msg = slugid.v4();
    debug('inserting %s', msg);
    await q.insert(msg);
  });

  it('QueueListener should initialize, start and stop with a handler', async () => {
    let listener = new subject.QueueListener({
      queueUrl: qurl.queueUrl,
      sqs: sqs,
      handler: async x => {
        debug('received: %s', x);
        return x;
      },
    });


    return new Promise((res, rej) => {
      listener.on('error', rej);
      listener.start();
      setTimeout(() => {
        try {
          listener.stop();
          res();
        } catch (err) {
          rej(err);
        }
      }, 1000);
    });

  });
  
  it('QueueListener should run a handler', async () => {
    let msg = slugid.v4();
    debug('message content: %s', msg);

    return new Promise(async (res, rej) => {
      let listener = new subject.QueueListener({
        queueUrl: qurl.queueUrl,
        sqs: sqs,
        handler: async x => {
          debug('received: %s', x);
          if (x === msg) {
            listener.stop();
            res();
          }
        },
      });

      let sender = new subject.QueueSender({sqs, queueUrl: qurl.queueUrl});

      listener.on('error', rej);

      listener.start();

      await sender.insert(msg);
    });
  });

 it('should emit error when handler fails', async () => {
    let msg = slugid.v4();
    let errmsg = slugid.v4();
    debug('message content: %s, error content: %s', msg, errmsg);

    return new Promise(async (res, rej) => {
      let listener = new subject.QueueListener({
        queueUrl: qurl.queueUrl,
        sqs: sqs,
        handler: async x => {
          debug('received: %s', x);
          if (x === msg) {
            debug('throwing: new Error("%s")', errmsg);
            throw new Error(errmsg);
          }
        },
      });

      let sender = new subject.QueueSender({sqs, queueUrl: qurl.queueUrl});

      listener.on('error', function (err, errtype) {
        // For some reason, this function can't have more than a single line
        // and still be interpreted.  wth.
        if (errtype === 'handler' && err.message === errmsg) {
          listener.stop();
          return res();
        } else {
          return rej(err);
        }
      });

      listener.start();

      await sender.insert(msg);
    });
  });

  it('should put things in the dead letter queue', async () => {
    let msg = slugid.v4();
    let errmsg = slugid.v4();
 
    return new Promise(async (res, rej) => {
      let listener = new subject.QueueListener({
        queueUrl: qurl.queueUrl,
        sqs: sqs,
        handler: async x => {
          debug('received: %s', x);
          if (x === msg) {
            throw new Error(errmsg);
          }
        },
      });

      let sender = new subject.QueueSender({sqs, queueUrl: qurl.queueUrl});
      
      let dlListener = new subject.QueueListener({
        queueUrl: qurl.queueUrl,
        sqs: sqs,
        handler: async x => {
          debug('dlq-received: %s', x);
          if (x === msg) {
            listener.stop();
            dlListener.stop();
            res();
          }
        },
      });

      listener.on('error', (err, errtype) => {
        if (errtype === 'handler' && err.message === errmsg) {
          debug('ignoring %j', err);
        } else {
          rej(err);
        }
      });
      dlListener.on('error', rej);

      dlListener.start();
      listener.start();

      let insertOutcome = await sender.insert(msg);
      debug('inserted: %s', insertOutcome.MessageId);

      
    });
  });
});
