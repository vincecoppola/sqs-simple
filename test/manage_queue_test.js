const assume = require('assume');
const sqs = require('./create-sqs-client');
const subject = require('../lib/sqs');
const url = require('url');
const debug = require('debug')('queue-management');
const slugid = require('slugid');

describe('Management', () => {
  it('should create and empty a live queue', async () => {
    let queueName
    if (process.env.CONSTANT_QUEUE_NAME) {
      queueName = 'queue-tests-mgmt-' + process.env.USER;
    } else {
      queueName = 'queue-tests-mgmt-' + slugid.nice().slice(0,7);
    }

    let result = await subject.initQueue({sqs, queueName});
    debug('can create queue');

    let qurl = await subject.getQueueUrl({sqs, queueName});
    assume(qurl).equals(result.queueUrl);
    debug('can get QueueUrl from QueueName');

    assume(result.queueUrl).matches("^https://sqs.us-west-2.amazonaws.com/[0-9]*/" + queueName + "$");
    debug('QueueUrls are correctly formed');

    await sqs.sendMessage({
      MessageBody: 'junk',
      QueueUrl: result.queueUrl,
    }).promise();
    debug('sent message to queue');

    await subject.emptyQueue({
      sqs: sqs,
      queueUrl: result.queueUrl,
    });
    debug('can empty queue');

    let queueAttributes = await sqs.getQueueAttributes({
      QueueUrl: result.queueUrl,
      AttributeNames: ['ApproximateNumberOfMessages'],
    }).promise();

    assume(queueAttributes.Attributes.ApproximateNumberOfMessages).equals('0');

    await subject.deleteQueue({
      sqs: sqs,
      queueUrl: result.queueUrl,
    });
    debug('can delete queue');
    debug('deleted other queue');
  });
});
