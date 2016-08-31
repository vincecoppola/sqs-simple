'use strict';

let SQS = require('aws-sdk').SQS;

let sqs = new SQS({
  region: 'us-west-2',
  apiVersion: '2012-11-05',
});

module.exports = sqs;
