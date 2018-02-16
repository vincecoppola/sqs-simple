'use strict';

var _getPrototypeOf = require('babel-runtime/core-js/object/get-prototype-of');

var _getPrototypeOf2 = _interopRequireDefault(_getPrototypeOf);

var _possibleConstructorReturn2 = require('babel-runtime/helpers/possibleConstructorReturn');

var _possibleConstructorReturn3 = _interopRequireDefault(_possibleConstructorReturn2);

var _inherits2 = require('babel-runtime/helpers/inherits');

var _inherits3 = _interopRequireDefault(_inherits2);

var _getIterator2 = require('babel-runtime/core-js/get-iterator');

var _getIterator3 = _interopRequireDefault(_getIterator2);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _asyncToGenerator2 = require('babel-runtime/helpers/asyncToGenerator');

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

var _stringify = require('babel-runtime/core-js/json/stringify');

var _stringify2 = _interopRequireDefault(_stringify);

/**
 * Initialize a queue. This function will overwrite existing VisibiltyTimeout and
 * RedrivePolicy attributes on the queues if they already exist.
 *
 * TODO: This function should check on error to see if the reason for the error
 * is the 60 between-delete-and-create api imposed limit is the error for
 * creation and if so, try again in 5 seconds up to a max of 65 seconds before
 * giving up
 */
var initQueue = function () {
  var _ref = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee(opts) {
    var sqs, _debug, Attributes, queueUrl, queueArn;

    return _regenerator2.default.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            opts = parseOptions(opts, ['sqs', 'queueName', 'maxReceiveCount', 'visibilityTimeout', 'delaySeconds', 'fifo']);

            // Shorthand
            sqs = opts.sqs;
            _debug = debug('queue:initQueue:' + opts.queueName);

            if (validateQueueName(opts.queueName)) {
              _context.next = 5;
              break;
            }

            throw new Error('Invalid Queue Name: ' + opts.queueName);

          case 5:
            Attributes = {
              // Bug in AWS-Sdk? the receiveMessage VisibiltyTimeout accepts strings
              // but not here...
              DelaySeconds: opts.delaySeconds.toString(),
              VisibilityTimeout: Number(opts.visibilityTimeout).toString()
            };


            if (opts.fifo) {
              Attributes.FifoQueue = 'true';
              Attributes.ContentBasedDeduplication = 'true';
            }

            // Now we'll create the queue
            _context.next = 9;
            return sqs.createQueue({
              QueueName: opts.queueName,
              Attributes: Attributes
            }).promise();

          case 9:
            queueUrl = _context.sent.QueueUrl;
            _context.next = 12;
            return sqs.getQueueAttributes({
              QueueUrl: queueUrl,
              AttributeNames: ['QueueArn']
            }).promise();

          case 12:
            queueArn = _context.sent.Attributes.QueueArn;


            _debug('created queue %s', queueUrl);

            return _context.abrupt('return', { queueUrl: queueUrl, queueArn: queueArn });

          case 15:
          case 'end':
            return _context.stop();
        }
      }
    }, _callee, this);
  }));

  return function initQueue(_x2) {
    return _ref.apply(this, arguments);
  };
}();

/**
 * Given a queueName, return some basic statistics about that queue
 */


var getQueueStats = function () {
  var _ref2 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee2(opts) {
    var stats, queueUrl, result;
    return _regenerator2.default.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            opts = parseOptions(opts, ['sqs', 'queueName']);

            stats = ['ApproximateNumberOfMessages', 'ApproximateNumberOfMessagesDelayed', 'ApproximateNumberOfMessagesNotVisible', 'DelaySeconds', 'VisibilityTimeout'];
            _context2.next = 4;
            return opts.sqs.getQueueUrl({
              QueueName: opts.queueName
            }).promise();

          case 4:
            queueUrl = _context2.sent.QueueUrl;
            _context2.next = 7;
            return opts.sqs.getQueueAttributes({
              QueueUrl: queueUrl,
              AttributeNames: stats
            }).promise();

          case 7:
            result = _context2.sent;
            return _context2.abrupt('return', result.Attributes);

          case 9:
          case 'end':
            return _context2.stop();
        }
      }
    }, _callee2, this);
  }));

  return function getQueueStats(_x3) {
    return _ref2.apply(this, arguments);
  };
}();

/**
 * Given a queueName, determine the queueUrl and queueArn
 */


var getQueueInfo = function () {
  var _ref3 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee3(opts) {
    var queueUrl, queueArn;
    return _regenerator2.default.wrap(function _callee3$(_context3) {
      while (1) {
        switch (_context3.prev = _context3.next) {
          case 0:
            opts = parseOptions(opts, ['sqs', 'queueName']);

            _context3.next = 3;
            return opts.sqs.getQueueUrl({
              QueueName: opts.queueName
            }).promise();

          case 3:
            queueUrl = _context3.sent.QueueUrl;
            _context3.next = 6;
            return opts.sqs.getQueueAttributes({
              QueueUrl: queueUrl,
              AttributeNames: ['QueueArn']
            }).promise();

          case 6:
            queueArn = _context3.sent.Attributes.QueueArn;
            return _context3.abrupt('return', { queueUrl: queueUrl, queueArn: queueArn });

          case 8:
          case 'end':
            return _context3.stop();
        }
      }
    }, _callee3, this);
  }));

  return function getQueueInfo(_x4) {
    return _ref3.apply(this, arguments);
  };
}();

/**
 * Given a queueName, determine the queueUrl
 */


var getQueueUrl = function () {
  var _ref4 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee4(opts) {
    return _regenerator2.default.wrap(function _callee4$(_context4) {
      while (1) {
        switch (_context4.prev = _context4.next) {
          case 0:
            opts = parseOptions(opts, ['sqs', 'queueName']);

            _context4.next = 3;
            return opts.sqs.getQueueUrl({
              QueueName: opts.queueName
            }).promise();

          case 3:
            return _context4.abrupt('return', _context4.sent.QueueUrl);

          case 4:
          case 'end':
            return _context4.stop();
        }
      }
    }, _callee4, this);
  }));

  return function getQueueUrl(_x5) {
    return _ref4.apply(this, arguments);
  };
}();

/**
 * Use the correct API function to purge the queue of items.  This has the
 * unfortunate consequence of only being able to run once every 60 seconds on
 * the specified queue.
 * 
 *
 * TODO: like initQueue, this should retry every 5s if the reason for failure is
 * that there was a previous purge in the last 60s.
 */


var purgeQueue = function () {
  var _ref5 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee5(opts) {
    var _debug;

    return _regenerator2.default.wrap(function _callee5$(_context5) {
      while (1) {
        switch (_context5.prev = _context5.next) {
          case 0:
            opts = parseOptions(opts, ['sqs', 'queueUrl']);
            _debug = debug('queue:purgeQueue:' + url.parse(opts.queueUrl).pathname.slice(1));
            _context5.next = 4;
            return opts.sqs.purgeQueue({ QueueUrl: opts.queueUrl }).promise();

          case 4:
            _debug('purged queue %s', opts.queueUrl);

          case 5:
          case 'end':
            return _context5.stop();
        }
      }
    }, _callee5, this);
  }));

  return function purgeQueue(_x6) {
    return _ref5.apply(this, arguments);
  };
}();

/**
 * Delete a queue.  
 */


var deleteQueue = function () {
  var _ref6 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee6(opts) {
    var _debug;

    return _regenerator2.default.wrap(function _callee6$(_context6) {
      while (1) {
        switch (_context6.prev = _context6.next) {
          case 0:
            opts = parseOptions(opts, ['sqs', 'queueUrl']);
            _debug = debug('queue:deleteQueue:' + url.parse(opts.queueUrl).pathname.slice(1));
            _context6.next = 4;
            return opts.sqs.deleteQueue({ QueueUrl: opts.queueUrl }).promise();

          case 4:
            _debug('deleted queue %s', opts.queueUrl);

          case 5:
          case 'end':
            return _context6.stop();
        }
      }
    }, _callee6, this);
  }));

  return function deleteQueue(_x7) {
    return _ref6.apply(this, arguments);
  };
}();

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


var emptyQueue = function () {
  var _ref7 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee7(opts) {
    var sqs, queueUrl, _debug, msg, totalDeleted, start, msgs;

    return _regenerator2.default.wrap(function _callee7$(_context7) {
      while (1) {
        switch (_context7.prev = _context7.next) {
          case 0:
            opts = parseOptions(opts, ['sqs', 'queueUrl']);
            // shorthand
            sqs = opts.sqs;
            queueUrl = opts.queueUrl;
            _debug = debug('queue:emptyQueue:' + url.parse(queueUrl).pathname.slice(1));
            msg = void 0;
            totalDeleted = 0;
            start = Date.now();

          case 7:
            _context7.next = 9;
            return sqs.receiveMessage({
              QueueUrl: queueUrl,
              VisibilityTimeout: 4,
              MaxNumberOfMessages: 10,
              WaitTimeSeconds: 1
            }).promise();

          case 9:
            msg = _context7.sent;
            msgs = msg.Messages || [];

            // TODO: Use the batch version of this function

            _context7.next = 13;
            return _promise2.default.all(msgs.map(function (msg) {
              return sqs.deleteMessage({
                QueueUrl: queueUrl,
                ReceiptHandle: msg.ReceiptHandle
              }).promise();
            }));

          case 13:
            totalDeleted += msgs.length;
            _debug('deleted %d msgs, %d total msgs', msgs.length, totalDeleted);

          case 15:
            if (msg.length > 0 || Date.now() - start < 5000) {
              _context7.next = 7;
              break;
            }

          case 16:
            // ^^^ We'll try to delete until there are no messages and we will try for at
            // least 5 seconds.  This is for eventual consistency concerns
            _debug('emptied queue %s (maybe!)', queueUrl);

          case 17:
          case 'end':
            return _context7.stop();
        }
      }
    }, _callee7, this);
  }));

  return function emptyQueue(_x8) {
    return _ref7.apply(this, arguments);
  };
}();

/**
 * A QueueSender knows how to insert items into an SQS Queue.  The messages
 * given to the `.insert()` method should be in the format that the eventual
 * handler will be given.  The QueueSender will internally serialise this
 * payload, the QueueListener will deserialise the payload.
 */


function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * A Queue backed by SQS
 */

var _ = require('lodash');
var debug = require('debug');
var url = require('url');
var SQS = require('aws-sdk').SQS;

/**
 * The default internal version of the message payload
 */
var MSG_VERSION = 1;
var SQS_QUEUE_NAME_PATTERN = /^[a-zA-Z0-9_-]{1,80}$/;

var assert = require('assert');

var EventEmitter = require('events');

function validateQueueName(queueName) {
  if (queueName.length > 80 || !queueName.length) return false;
  return SQS_QUEUE_NAME_PATTERN.test(queueName) || SQS_QUEUE_NAME_PATTERN.test(queueName.slice(0, -5)) && isFifoQueue(queueName);
}

function isFifoQueue(queueName) {
  return queueName && queueName.slice(queueName.length - 5) === '.fifo';
}

/**
 * Parse out the options, sets defaults and allows
 * user to specify which options they expect
 */
function parseOptions(_opts, keys) {
  if (_opts.sqs && _opts.sqsConfig) {
    throw new Error('If you provide SQS client, don\'t provide SQS configuration');
  }

  var opts = _.defaults({}, _opts, {
    fifo: false,
    visibilityTimeout: 30,
    waitTimeSeconds: 1,
    maxNumberOfMessages: 1,
    maxReceiveCount: 5,
    encodeMessage: true,
    decodeMessage: true,
    sequential: false,
    delaySeconds: 0,
    sqsConfig: {
      region: 'us-west-2',
      apiVersion: '2012-11-15'
    }
  });

  // Create the SQS object if we don't have one but we want one.
  if (!opts.sqs && _.includes(keys, 'sqs')) {
    assert(opts.sqsConfig.region, 'Must provide SQS Region');
    opts.sqs = new SQS(opts.sqsConfig);
  }

  // Because lodash is weird, it assumes falsy values in a _.defaults means
  // that it should not be set.
  opts.decodeMessage = _opts.decodeMessage;
  opts.encodeMessage = _opts.encodeMessage;
  if (typeof opts.decodeMessage === 'undefined') {
    opts.decodeMessage = true;
  }
  if (typeof opts.encodeMessage === 'undefined') {
    opts.encodeMessage = true;
  }

  // If provided, a QueueUrl must be a valid URL
  if (opts.queueUrl) {
    var u = url.parse(opts.queueUrl);
    if (!u.host || !u.protocol) {
      throw new Error('Invalid QueueUrl provided');
    }
  }

  // If provided, QueueName should be valid
  if (opts.queueName) {
    if (opts.fifo && !isFifoQueue(opts.queueName)) {
      opts.queueName = opts.queueName + '.fifo';
    }
    if (!validateQueueName(opts.queueName)) {
      throw new Error('Invalid Queue Name: ' + opts.queueName);
    }
  }

  if (opts.handler && _.includes(keys, 'handler') && typeof opts.handler !== 'function') {
    throw new Error('If provided, handler must be a promise-returning function');
  }

  var present = _.keys(opts);
  var missing = keys.filter(function (key) {
    return !_.includes(present, key);
  });

  if (missing.length > 0) {
    var err = new Error('Missing options: ' + missing.join(', '));
    err.missing = missing;
    err.present = present;
    throw err;
  }

  return _.pick(opts, keys);
}

/**
 * Encode a key into the desired format
 */
function __encodeMsg(input) {
  var version = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : MSG_VERSION;

  switch (version) {
    case 1:
      return (0, _stringify2.default)({
        version: 1,
        data: input
      });
      break;
    default:
      throw new Error('Encoding for unknown version of message payload');
  }
}

/**
 * Decode a message.  If we know how to get the data we want from a message
 * encoded with a different version we do
 */
function __decodeMsg(input) {
  var msg = JSON.parse(input);
  switch (msg.version) {
    case 1:
      return msg.data;
      break;
    default:
      throw new Error('Decoding unknown version of message payload');
  }
}
var QueueSender = function () {
  function QueueSender(opts) {
    (0, _classCallCheck3.default)(this, QueueSender);


    // These are the options that a QueueListener
    // must have
    var requiredOpts = ['sqs', 'queueUrl', 'encodeMessage', 'fifo'];

    // Figure them out
    opts = parseOptions(opts, requiredOpts);

    // Now set them
    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
      for (var _iterator = (0, _getIterator3.default)(requiredOpts), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
        var opt = _step.value;

        this[opt] = opts[opt];
      }

      // We want to make sure that debugging output is somewhat useful, so we'll
      // include a little bit of info in each debug message.
    } catch (err) {
      _didIteratorError = true;
      _iteratorError = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion && _iterator.return) {
          _iterator.return();
        }
      } finally {
        if (_didIteratorError) {
          throw _iteratorError;
        }
      }
    }

    this.debug = debug('queue:QueueSender:' + url.parse(opts.queueUrl).pathname.slice(1));
  }

  /**
   * Insert a message into the Queue.  `msg` must be JSON serializable and must
   * be a truthy value
   */


  (0, _createClass3.default)(QueueSender, [{
    key: 'insert',
    value: function () {
      var _ref8 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee8(msg) {
        var body, message, result;
        return _regenerator2.default.wrap(function _callee8$(_context8) {
          while (1) {
            switch (_context8.prev = _context8.next) {
              case 0:
                assert(typeof msg !== 'undefined');
                body = void 0;

                if (this.encodeMessage) {
                  body = __encodeMsg(msg);
                } else {
                  assert(typeof msg === 'string', 'msg body must be string');
                  body = msg;
                }

                message = {
                  QueueUrl: this.queueUrl,
                  MessageBody: body
                };


                if (this.fifo) message.MessageGroupId = '1';

                _context8.next = 7;
                return this.sqs.sendMessage(message).promise();

              case 7:
                result = _context8.sent;


                this.debug('inserted message');

                return _context8.abrupt('return', result);

              case 10:
              case 'end':
                return _context8.stop();
            }
          }
        }, _callee8, this);
      }));

      function insert(_x9) {
        return _ref8.apply(this, arguments);
      }

      return insert;
    }()
  }]);
  return QueueSender;
}();

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


var QueueListener = function (_EventEmitter) {
  (0, _inherits3.default)(QueueListener, _EventEmitter);

  function QueueListener(opts) {
    (0, _classCallCheck3.default)(this, QueueListener);

    // These are the options that a QueueListener
    // must have
    var _this = (0, _possibleConstructorReturn3.default)(this, (QueueListener.__proto__ || (0, _getPrototypeOf2.default)(QueueListener)).call(this));

    var requiredOpts = ['sqs', 'queueUrl', 'visibilityTimeout', 'waitTimeSeconds', 'maxNumberOfMessages', 'handler', 'decodeMessage', 'sequential'];

    // Figure them out
    opts = parseOptions(opts, requiredOpts);

    // Now set them
    var _iteratorNormalCompletion2 = true;
    var _didIteratorError2 = false;
    var _iteratorError2 = undefined;

    try {
      for (var _iterator2 = (0, _getIterator3.default)(requiredOpts), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
        var opt = _step2.value;

        _this[opt] = opts[opt];
      }

      // We want to make sure that debugging output is somewhat useful, so we'll
      // include a little bit of info in each debug message.
    } catch (err) {
      _didIteratorError2 = true;
      _iteratorError2 = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion2 && _iterator2.return) {
          _iterator2.return();
        }
      } finally {
        if (_didIteratorError2) {
          throw _iteratorError2;
        }
      }
    }

    _this.debug = debug('queue:QueueListener:' + url.parse(opts.queueUrl).pathname.slice(1));

    // used to decide whether to launch another __receiveMsg() call
    _this.running = false;

    return _this;
  }

  /*
   * Start listening on a queue
   */


  (0, _createClass3.default)(QueueListener, [{
    key: 'start',
    value: function start() {
      var _this2 = this;

      this.debug('starting listening to queue');
      this.running = true;
      // Using setTimeout instead of nextTick because we want this to happen
      // after all the other jazz in the event loop happens, rather than starving
      // it by always forcing it to happen before using nextTick
      setTimeout((0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee9() {
        return _regenerator2.default.wrap(function _callee9$(_context9) {
          while (1) {
            switch (_context9.prev = _context9.next) {
              case 0:
                _this2.emit('starting');
                _context9.next = 3;
                return _this2.__receiveMsg();

              case 3:
              case 'end':
                return _context9.stop();
            }
          }
        }, _callee9, _this2);
      })), 0);
    }

    /**
     * Stop listening on a queue.  Might not stop queue instantly
     */

  }, {
    key: 'stop',
    value: function stop() {
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

  }, {
    key: '__receiveMsg',
    value: function () {
      var _ref10 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee11() {
        var _this3 = this;

        var msg, msgs, _iteratorNormalCompletion3, _didIteratorError3, _iteratorError3, _iterator3, _step3, _msg, error;

        return _regenerator2.default.wrap(function _callee11$(_context11) {
          while (1) {
            switch (_context11.prev = _context11.next) {
              case 0:
                msg = void 0;
                _context11.prev = 1;
                _context11.next = 4;
                return this.sqs.receiveMessage({
                  QueueUrl: this.queueUrl,
                  MaxNumberOfMessages: this.maxNumberOfMessages,
                  WaitTimeSeconds: this.waitTimeSeconds,
                  VisibilityTimeout: this.visibilityTimeout
                }).promise();

              case 4:
                msg = _context11.sent;
                _context11.next = 11;
                break;

              case 7:
                _context11.prev = 7;
                _context11.t0 = _context11['catch'](1);

                this.emit('error', _context11.t0, 'api');
                return _context11.abrupt('return');

              case 11:
                msgs = [];

                if (!msg.Messages) {
                  _context11.next = 20;
                  break;
                }

                if (Array.isArray(msg.Messages)) {
                  _context11.next = 16;
                  break;
                }

                this.emit('error', new Error('SQS Api returned non-list'), 'api');
                return _context11.abrupt('return');

              case 16:
                this.debug('received %d messages', msgs.length);
                msgs = msg.Messages;
                _context11.next = 21;
                break;

              case 20:
                this.debug('received 0 messages');

              case 21:
                _context11.prev = 21;

                if (!this.sequential) {
                  _context11.next = 51;
                  break;
                }

                _iteratorNormalCompletion3 = true;
                _didIteratorError3 = false;
                _iteratorError3 = undefined;
                _context11.prev = 26;
                _iterator3 = (0, _getIterator3.default)(msgs);

              case 28:
                if (_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done) {
                  _context11.next = 35;
                  break;
                }

                _msg = _step3.value;
                _context11.next = 32;
                return this.__handleMsg(_msg);

              case 32:
                _iteratorNormalCompletion3 = true;
                _context11.next = 28;
                break;

              case 35:
                _context11.next = 41;
                break;

              case 37:
                _context11.prev = 37;
                _context11.t1 = _context11['catch'](26);
                _didIteratorError3 = true;
                _iteratorError3 = _context11.t1;

              case 41:
                _context11.prev = 41;
                _context11.prev = 42;

                if (!_iteratorNormalCompletion3 && _iterator3.return) {
                  _iterator3.return();
                }

              case 44:
                _context11.prev = 44;

                if (!_didIteratorError3) {
                  _context11.next = 47;
                  break;
                }

                throw _iteratorError3;

              case 47:
                return _context11.finish(44);

              case 48:
                return _context11.finish(41);

              case 49:
                _context11.next = 53;
                break;

              case 51:
                _context11.next = 53;
                return _promise2.default.all(msgs.map(function (x) {
                  return _this3.__handleMsg(x);
                }));

              case 53:
                _context11.next = 62;
                break;

              case 55:
                _context11.prev = 55;
                _context11.t2 = _context11['catch'](21);
                error = new Error('__handleMsg is rejecting when it ought not to.  ' + 'This is a programming error in QueueListener.__handleMsg()');

                error.underlyingErr = _context11.t2;
                error.underlyingStack = _context11.t2.stack || '';
                this.debug('This really should not happen... %j', error);
                this.emit('error', error, 'api');

              case 62:

                if (this.running) {
                  // Same as the call in .start(), but here we do a small timeout of 50ms
                  // just to make sure that we're not totally starving eveything
                  setTimeout((0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee10() {
                    return _regenerator2.default.wrap(function _callee10$(_context10) {
                      while (1) {
                        switch (_context10.prev = _context10.next) {
                          case 0:
                            _context10.next = 2;
                            return _this3.__receiveMsg();

                          case 2:
                          case 'end':
                            return _context10.stop();
                        }
                      }
                    }, _callee10, _this3);
                  })), 50);
                } else {
                  this.emit('stopped');
                }

              case 63:
              case 'end':
                return _context11.stop();
            }
          }
        }, _callee11, this, [[1, 7], [21, 55], [26, 37, 41, 49], [42,, 44, 48]]);
      }));

      function __receiveMsg() {
        return _ref10.apply(this, arguments);
      }

      return __receiveMsg;
    }()

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

  }, {
    key: '__handleMsg',
    value: function () {
      var _ref12 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee14(msg) {
        var _this4 = this;

        var msgId, rh, changetimeout, deleteMsg, body, contentPreview;
        return _regenerator2.default.wrap(function _callee14$(_context14) {
          while (1) {
            switch (_context14.prev = _context14.next) {
              case 0:
                msgId = msg.MessageId;
                rh = msg.ReceiptHandle;

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

                changetimeout = function () {
                  var _ref13 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee12(newTimeout) {
                    var newSetting, outcome;
                    return _regenerator2.default.wrap(function _callee12$(_context12) {
                      while (1) {
                        switch (_context12.prev = _context12.next) {
                          case 0:
                            assert(typeof newTimeout === 'number');
                            assert(newTimeout >= 0);
                            // I suspect that the API doesn't honour a setting of 0, so using something simliar :(
                            newSetting = newTimeout || 1;
                            _context12.prev = 3;
                            _context12.next = 6;
                            return _this4.sqs.changeMessageVisibility({
                              QueueUrl: _this4.queueUrl,
                              ReceiptHandle: rh,
                              VisibilityTimeout: newSetting
                            }).promise();

                          case 6:
                            outcome = _context12.sent;

                            _this4.debug('message %s now expires %s (+%ds)', msgId, new Date(Date.now() + newSetting * 1000), newSetting);
                            _context12.next = 16;
                            break;

                          case 10:
                            _context12.prev = 10;
                            _context12.t0 = _context12['catch'](3);

                            _this4.debug('error changing message %s visibility', msgId);
                            _this4.debug(_context12.t0);
                            _this4.emit('error', _context12.t0, 'api');
                            throw new Error('Failed to change timeout');

                          case 16:
                          case 'end':
                            return _context12.stop();
                        }
                      }
                    }, _callee12, _this4, [[3, 10]]);
                  }));

                  return function changetimeout(_x11) {
                    return _ref13.apply(this, arguments);
                  };
                }();

                // Delete this message


                deleteMsg = function () {
                  var _ref14 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee13() {
                    return _regenerator2.default.wrap(function _callee13$(_context13) {
                      while (1) {
                        switch (_context13.prev = _context13.next) {
                          case 0:
                            _context13.prev = 0;
                            _context13.next = 3;
                            return _this4.sqs.deleteMessage({
                              QueueUrl: _this4.queueUrl,
                              ReceiptHandle: rh
                            }).promise();

                          case 3:
                            _this4.debug('removed message %s from queue', msgId);
                            _context13.next = 11;
                            break;

                          case 6:
                            _context13.prev = 6;
                            _context13.t0 = _context13['catch'](0);

                            _this4.debug('error deleting message %s visibility', msgId);
                            _this4.debug(_context13.t0);
                            _this4.emit('error', _context13.t0, 'api');

                          case 11:
                          case 'end':
                            return _context13.stop();
                        }
                      }
                    }, _callee13, _this4, [[0, 6]]);
                  }));

                  return function deleteMsg() {
                    return _ref14.apply(this, arguments);
                  };
                }();

                // Parse the message.


                body = void 0;

                if (!this.decodeMessage) {
                  _context14.next = 27;
                  break;
                }

                _context14.prev = 7;

                body = __decodeMsg(msg.Body);
                _context14.next = 25;
                break;

              case 11:
                _context14.prev = 11;
                _context14.t0 = _context14['catch'](7);

                this.emit('error', _context14.t0, 'payload');
                // Let's pretty print some debugging information
                contentPreview = msg.Body;
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
                _context14.prev = 17;
                _context14.next = 20;
                return changeTimeout(0);

              case 20:
                _context14.next = 24;
                break;

              case 22:
                _context14.prev = 22;
                _context14.t1 = _context14['catch'](17);

              case 24:
                return _context14.abrupt('return');

              case 25:
                _context14.next = 28;
                break;

              case 27:
                body = msg.Body;

              case 28:
                _context14.prev = 28;
                _context14.next = 31;
                return this.handler(body, changetimeout);

              case 31:
                _context14.prev = 31;
                _context14.next = 34;
                return deleteMsg();

              case 34:
                _context14.next = 38;
                break;

              case 36:
                _context14.prev = 36;
                _context14.t2 = _context14['catch'](31);

              case 38:
                this.debug('handler successfully processed message %s', msgId);
                return _context14.abrupt('return');

              case 42:
                _context14.prev = 42;
                _context14.t3 = _context14['catch'](28);

                debug('handler failed to process message %s', msgId);
                _context14.prev = 45;
                _context14.next = 48;
                return changetimeout(0);

              case 48:
                _context14.next = 52;
                break;

              case 50:
                _context14.prev = 50;
                _context14.t4 = _context14['catch'](45);

              case 52:
                this.emit('error', _context14.t3, 'handler');
                return _context14.abrupt('return');

              case 54:
              case 'end':
                return _context14.stop();
            }
          }
        }, _callee14, this, [[7, 11], [17, 22], [28, 42], [31, 36], [45, 50]]);
      }));

      function __handleMsg(_x10) {
        return _ref12.apply(this, arguments);
      }

      return __handleMsg;
    }()
  }]);
  return QueueListener;
}(EventEmitter);

module.exports = {
  QueueSender: QueueSender,
  QueueListener: QueueListener,
  initQueue: initQueue,
  getQueueUrl: getQueueUrl,
  getQueueStats: getQueueStats,
  purgeQueue: purgeQueue,
  emptyQueue: emptyQueue,
  deleteQueue: deleteQueue,
  __sqsMsgStorageVersion: MSG_VERSION,
  __encodeMsg: __encodeMsg,
  __decodeMsg: __decodeMsg
};
//# sourceMappingURL=sqs.js.map
