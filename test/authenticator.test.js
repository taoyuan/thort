"use strict";

var Authenticator = require('../lib/authenticator');
var s = require('./support');
var t = s.assert;

describe('Authenticator', function() {

    describe('#use', function() {

        describe('with instance name', function() {
            function Strategy() {
                this.name = 'default';
            }
            Strategy.prototype.authenticate = function(req) {
            };

            var authenticator = new Authenticator();
            authenticator.use(new Strategy());

            it('should register strategy', function() {
                t.isObject(authenticator._strategies['default']);
            });
        });

        describe('with registered name', function() {
            function Strategy() {
            }
            Strategy.prototype.authenticate = function(req) {
            };

            var authenticator = new Authenticator();
            authenticator.use('foo', new Strategy());

            it('should register strategy', function() {
                t.isObject(authenticator._strategies['foo']);
            });
        });

        describe('with registered name overridding instance name', function() {
            function Strategy() {
                this.name = 'default';
            }
            Strategy.prototype.authenticate = function(req) {
            };

            var authenticator = new Authenticator();
            authenticator.use('bar', new Strategy());

            it('should register strategy', function() {
                t.isObject(authenticator._strategies['bar']);
                t.isUndefined(authenticator._strategies['default']);
            });
        });

        it('should throw if lacking a name', function() {
            function Strategy() {
            }
            Strategy.prototype.authenticate = function(req) {
            };

            t.throw(function() {
                var authenticator = new Authenticator();
                authenticator.use(new Strategy());
            }, Error, 'Authentication strategies must have a name');
        });
    });



    describe('#unuse', function() {
        function Strategy() {
        }
        Strategy.prototype.authenticate = function(req) {
        };

        var authenticator = new Authenticator();
        authenticator.use('one', new Strategy());
        authenticator.use('two', new Strategy());

        t.isObject(authenticator._strategies['one']);
        t.isObject(authenticator._strategies['two']);

        authenticator.unuse('one');

        it('should unregister strategy', function() {
            t.isUndefined(authenticator._strategies['one']);
            t.isObject(authenticator._strategies['two']);
        });
    });



    describe('#transformAuthInfo', function() {

        describe('without transforms', function() {
            var authenticator = new Authenticator();
            var error, obj;

            before(function(done) {
                authenticator.transformAuthInfo({ clientId: '1', scope: 'write' }, function(err, o) {
                    error = err;
                    obj = o;
                    done();
                });
            });

            it('should not error', function() {
                t.isNull(error);
            });

            it('should not transform info', function() {
                t.lengthOf(Object.keys(obj), 2);
                t.equal(obj.clientId, '1');
                t.equal(obj.scope, 'write');
            });
        });

        describe('with one transform', function() {
            var authenticator = new Authenticator();
            authenticator.transformAuthInfo(function(info, done) {
                done(null, { clientId: info.clientId, client: { name: 'Foo' }});
            });

            var error, obj;

            before(function(done) {
                authenticator.transformAuthInfo({ clientId: '1', scope: 'write' }, function(err, o) {
                    error = err;
                    obj = o;
                    done();
                });
            });

            it('should not error', function() {
                t.isNull(error);
            });

            it('should not transform info', function() {
                t.lengthOf(Object.keys(obj), 2);
                t.equal(obj.clientId, '1');
                t.equal(obj.client.name, 'Foo');
                t.isUndefined(obj.scope);
            });
        });

        describe('with one transform that encounters an error', function() {
            var authenticator = new Authenticator();
            authenticator.transformAuthInfo(function(info, done) {
                done(new Error('something went wrong'));
            });

            var error, obj;

            before(function(done) {
                authenticator.transformAuthInfo({ clientId: '1', scope: 'write' }, function(err, o) {
                    error = err;
                    obj = o;
                    done();
                });
            });

            it('should error', function() {
                t.instanceOf(error, Error);
                t.equal(error.message, 'something went wrong');
            });

            it('should not transform info', function() {
                t.isUndefined(obj);
            });
        });

        describe('with one transform that throws an exception', function() {
            var authenticator = new Authenticator();
            authenticator.transformAuthInfo(function(info, done) {
                throw new Error('something went horribly wrong');
            });

            var error, obj;

            before(function(done) {
                authenticator.transformAuthInfo({ clientId: '1', scope: 'write' }, function(err, o) {
                    error = err;
                    obj = o;
                    done();
                });
            });

            it('should error', function() {
                t.instanceOf(error, Error);
                t.equal(error.message, 'something went horribly wrong');
            });

            it('should not transform info', function() {
                t.isUndefined(obj);
            });
        });

        describe('with one sync transform', function() {
            var authenticator = new Authenticator();
            authenticator.transformAuthInfo(function(info) {
                return { clientId: info.clientId, client: { name: 'Foo' }};
            });

            var error, obj;

            before(function(done) {
                authenticator.transformAuthInfo({ clientId: '1', scope: 'write' }, function(err, o) {
                    error = err;
                    obj = o;
                    done();
                });
            });

            it('should not error', function() {
                t.isNull(error);
            });

            it('should not transform info', function() {
                t.lengthOf(Object.keys(obj), 2);
                t.equal(obj.clientId, '1');
                t.equal(obj.client.name, 'Foo');
                t.isUndefined(obj.scope);
            });
        });

        describe('with three transform, the first of which passes and the second of which transforms', function() {
            var authenticator = new Authenticator();
            authenticator.transformAuthInfo(function(info, done) {
                done('pass');
            });
            authenticator.transformAuthInfo(function(info, done) {
                done(null, { clientId: info.clientId, client: { name: 'Two' }});
            });
            authenticator.transformAuthInfo(function(info, done) {
                done(null, { clientId: info.clientId, client: { name: 'Three' }});
            });

            var error, obj;

            before(function(done) {
                authenticator.transformAuthInfo({ clientId: '1', scope: 'write' }, function(err, o) {
                    error = err;
                    obj = o;
                    done();
                });
            });

            it('should not error', function() {
                t.isNull(error);
            });

            it('should not transform info', function() {
                t.lengthOf(Object.keys(obj), 2);
                t.equal(obj.clientId, '1');
                t.equal(obj.client.name, 'Two');
                t.isUndefined(obj.scope);
            });
        });

    });
});