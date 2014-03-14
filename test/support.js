"use strict";

var chai = require('chai');
chai.Assertion.includeStack = true;
var mqtt = require('mqtt');
var merge = require('utils-merge');
var bunyan = require('bunyan');

process.env.NODE_ENV = 'test';

exports.assert = chai.assert;

exports.plan = function (count, done) {
    return function() {
        count--;
        if (count === 0) {
            done();
        }
    };
};

var portCounter = 9042;
exports.nextPort = function() {
    return ++portCounter;
};

exports.logger = bunyan.createLogger({
    name: "moscaTests",
    level: 60
});

exports.buildSettings = function (settings) {
    return merge({
        port: exports.nextPort(),
        logger: {
            childOf: exports.logger,
            level: 60
        }
    }, settings);
};

exports.buildOpts = function() {
    return {
        keepalive: 1000,
        clientId: 'mors_' + require("crypto").randomBytes(8).toString('hex'),
        protocolId: 'MQIsdp',
        protocolVersion: 3
    };
};

/**
 *
 * (port, host, opts, callback)
 */
exports.buildClient = function buildClient(port, host, opts, callback) {
    if (typeof port === 'function') {
        callback = port;
        port = null;
        host = null;
        opts = null;
    } else if (typeof host === 'function') {
        callback = host;
        host = null;
        opts = null;
    } else if (typeof opts === 'function') {
        callback = opts;
        opts = null;
    }
    opts = merge(exports.buildOpts(), opts);
    callback = callback || function () {};

    var client = mqtt.createClient(port, host, opts);

    client.on("connect", function() {
        callback(client);
    });
};