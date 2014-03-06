"use strict";

/* global describe, it, expect, before */
/* jshint expr: true */

var Authenticator = require('../../../lib/authenticator');
var framework = require('../../../lib/frameworks/mosca');
var s = require('../../support');
var t = s.assert;
var h = require('./helpers');


describe('mosca/authenticate', function() {

    describe('with multiple strategies, the first of which succeeds', function() {
        function StrategyA() {
        }
        StrategyA.prototype.authenticate = function() {
            this.success({ username: 'bob-a' });
        };

        function StrategyB() {
        }
        StrategyB.prototype.authenticate = function() {
            this.success({ username: 'bob-b' });
        };

        var authenticator = new Authenticator();
        authenticator.use('a', new StrategyA());
        authenticator.use('b', new StrategyB());

        var server, client, error;

        before(function(done) {
            var settings = s.buildSettings();
            server = h.server(settings)
                .authenticate(framework.authenticate(authenticator, ['a', 'b']))
                .client(function (c) {
                    client = c;

                    client.login = function (user, options, done) {
                        this.user = user;
                        done();
                    };
                })
                .connect(function (err) {
                    error = err;
                    done();
                })
                .start();

            s.buildClient(settings.port, settings.host, {reconnectPeriod: 0}); // disable reconnect

        });

        it('should not error', function() {
            t.isUndefined(error);
        });

        it('should set user', function() {
            t.isObject(client.user);
            t.equal(client.user.username, 'bob-a');
        });
    });

    describe('with multiple strategies, the second of which succeeds', function() {
        function StrategyA() {
        }
        StrategyA.prototype.authenticate = function() {
            this.fail('A challenge');
        };

        function StrategyB() {
        }
        StrategyB.prototype.authenticate = function() {
            this.success({ username: 'bob-b' });
        };

        var authenticator = new Authenticator();
        authenticator.use('a', new StrategyA());
        authenticator.use('b', new StrategyB());

        var server, client, error;

        before(function(done) {
            var settings = s.buildSettings();
            server = h.server(settings)
                .authenticate(framework.authenticate(authenticator, ['a', 'b']))
                .client(function (c) {
                    client = c;

                    client.login = function (user, options, done) {
                        this.user = user;
                        done();
                    };
                })
                .connect(function (err) {
                    error = err;
                    done();
                })
                .start();

            s.buildClient(settings.port, settings.host, {reconnectPeriod: 0}); // disable reconnect
        });

        it('should not error', function() {
            t.isUndefined(error);
        });

        it('should set user', function() {
            t.isObject(client.user);
            t.equal(client.user.username, 'bob-b');
        });
    });

});
