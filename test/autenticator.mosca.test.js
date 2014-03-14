"use strict";

var Authenticator = require('../lib/authenticator');
var AuthorizerStrategy = require('../lib/strategies/thort-authorizer');
var s = require('./support');
var t = s.assert;
var h = require('./frameworks/mosca/helpers');

describe('Authenticator', function() {

    describe('#initialize', function() {

        it('should have correct arity', function() {
            var authenticator = new Authenticator();
            t.lengthOf(authenticator.initialize, 1);
        });

        it('should set user property on authenticator', function() {
            var authenticator = new Authenticator();
            authenticator.initialize({ userProperty: 'currentUser' });
            t.equal(authenticator._userProperty, 'currentUser');
        });
    });


    describe('#authenticate', function() {

        it('should have correct arity', function() {
            var authenticator = new Authenticator();
            t.lengthOf(authenticator.authenticate, 2);
        });

        describe('handling a client', function() {
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
                    .authenticate(authenticator.authenticate('success'))
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
    });


    describe('#authorize', function() {

        it('should have correct arity', function() {
            var authenticator = new Authenticator();
            t.lengthOf(authenticator.authorize, 2);
        });

        describe('handling a client', function() {
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
                    .authenticate(authenticator.authorize('success'))
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
                t.isObject(client.account);
                t.equal(client.account.id, '1');
                t.equal(client.account.username, 'jaredhanson');
            });

            it('should not set authInfo', function() {
                t.isUndefined(client.authInfo);
            });
        });

    });
    describe('authenticate using authorizer', function() {
        var strategy = new AuthorizerStrategy();

        var authenticator = new Authenticator();
        authenticator.use('success', strategy);

        var server, client, error;

        before(function(done) {
            strategy.authorizer.addUser("user", "pass", function () {
                var settings = s.buildSettings();
                server = h.server(settings)
                    .authenticate(authenticator.authenticate('success'))
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

                s.buildClient(settings.port, settings.host, {username: "user", password: "pass", reconnectPeriod: 0}); // disable reconnect
            });
        });

        it('should not error', function() {
            t.notOk(error);
        });

        it('should set user', function() {
            t.isObject(client.user);
            t.equal(client.user.username, 'user');
        });

        it('should set authInfo', function() {
            t.isObject(client.authInfo);
            t.lengthOf(Object.keys(client.authInfo), 0);
        });
    });
});
