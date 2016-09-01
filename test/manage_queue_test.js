const assume = require('assume');
const sqs = require('./create-sqs-client');
const subject = require('../lib/sqs');
const url = require('url');

describe('Management', () => {
  it('should create and empty a live and dead queue', async () => {
    let result = await subject.initQueue({sqs, queueName: 'manage_test'});

    let qurl = await subject.getQueueUrl({sqs, queueName: 'manage_test'});
    assume(qurl).equals(result.queueUrl);

    assume(result.queueUrl).matches("^https://sqs.us-west-2.amazonaws.com/[0-9]*/manage_test$");
    assume(result.deadQueueUrl).matches("^https://sqs.us-west-2.amazonaws.com/[0-9]*/manage_test_dead$");

    await sqs.sendMessage({
      MessageBody: 'junk',
      QueueUrl: result.queueUrl,
    }).promise();

    await subject.emptyQueue({
      sqs: sqs,
      queueUrl: result.queueUrl,
    });

    let queueAttributes = await sqs.getQueueAttributes({
      QueueUrl: result.queueUrl,
      AttributeNames: ['ApproximateNumberOfMessages'],
    }).promise();

    //assume(queueAttributes.Attributes.ApproximateNumberOfMessages).equals('0');

    await subject.deleteQueue({
      sqs: sqs,
      queueUrl: result.queueUrl,
    });

    await subject.deleteQueue({
      sqs: sqs,
      queueUrl: result.deadQueueUrl,
    });
  });
});
