"use strict";

/* global describe, it, expect, before */
/* jshint expr: true */

var Authenticator = require('../../../lib/authenticator');
var framework = require('../../../lib/frameworks/mosca');
var s = require('../../support');
var t = s.assert;
var h = require('./helpers');


describe('mosca/authenticate', function() {

    describe('success', function() {
        function Strategy() {
        }
        Strategy.prototype.authenticate = function() {
            var user = { id: '1', username: 'jaredhanson' };
            this.success(user);
        };

        var authenticator = new Authenticator();
        authenticator.use('success', new Strategy());

        var server, client, error;

        before(function(done) {
            var settings = s.buildSettings();
            server = h.server(settings)
                .authenticate(framework.authenticate(authenticator, 'success'))
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
            t.equal(client.user.id, '1');
            t.equal(client.user.username, 'jaredhanson');
        });

        it('should set authInfo', function() {
            t.isObject(client.authInfo);
            t.lengthOf(Object.keys(client.authInfo), 0);
        });
    });

    describe('success that assigns a specific property', function() {
        function Strategy() {
        }
        Strategy.prototype.authenticate = function() {
            var user = { id: '1', username: 'jaredhanson' };
            this.success(user);
        };

        var authenticator = new Authenticator();
        authenticator.use('success', new Strategy());

        var server, client, error;

        before(function(done) {
            var settings = s.buildSettings();
            server = h.server(settings)
                .authenticate(framework.authenticate(authenticator, 'success', { assignProperty: 'account' }))
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
            t.notOk(error);
        });

        it('should not set user', function() {
            t.isUndefined(client.user);
        });

        it('should set account', function() {
            t.isObject(client.account, 'object');
            t.equal(client.account.id, '1');
            t.equal(client.account.username, 'jaredhanson');
        });

        it('should not set authInfo', function() {
            t.isUndefined(client.authInfo);
        });
    });

    describe('success with strategy-specific options', function() {
        function Strategy() {
        }
        Strategy.prototype.authenticate = function(client, username, password, options) {
            var user = { id: '1', username: 'jaredhanson' };
            if (options.scope == 'email') {
                user.email = 'jaredhanson@example.com';
            }
            this.success(user);
        };

        var authenticator = new Authenticator();
        authenticator.use('success', new Strategy());

        var server, client, error;

        before(function(done) {
            var settings = s.buildSettings();
            server = h.server(settings)
                .authenticate(framework.authenticate(authenticator, 'success', { scope: 'email' }))
                .client(function (c) {
                    client = c;

                    client.login = function (user, options, done) {
                        if (options.scope != 'email') { return done(new Error('invalid options')); }
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
            t.isObject(client.user, 'object');
            t.equal(client.user.id, '1');
            t.equal(client.user.username, 'jaredhanson');
            t.equal(client.user.email, 'jaredhanson@example.com');
        });

        it('should set authInfo', function() {
            t.isObject(client.authInfo, 'object');
            t.lengthOf(Object.keys(client.authInfo), 0);
        });
    });

    describe('success, but login that encounters an error', function() {
        function Strategy() {
        }
        Strategy.prototype.authenticate = function() {
            var user = { id: '1', username: 'jaredhanson' };
            this.success(user);
        };

        var authenticator = new Authenticator();
        authenticator.use('success', new Strategy());

        var server, client, error;

        before(function(done) {

            var settings = s.buildSettings();
            server = h.server(settings)
                .authenticate(framework.authenticate(authenticator, 'success'))
                .client(function (c) {
                    client = c;

                    client.login = function (user, options, done) {
                        done(new Error('something went wrong'));
                    };
                })
                .connect(function (err) {
                    error = err;
                    done();
                })
                .start();

            s.buildClient(settings.port, settings.host, {reconnectPeriod: 0}); // disable reconnect
        });

        it('should error', function() {
            t.instanceOf(error, Error);
            t.equal(error.message, 'something went wrong');
        });

        it('should not set user', function() {
            t.isUndefined(client.user);
        });

        it('should not set authInfo', function() {
            t.isUndefined(client.authInfo);
        });
    });

});
