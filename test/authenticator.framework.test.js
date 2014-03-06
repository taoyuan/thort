"use strict";

var Authenticator = require('../lib/authenticator');
var s = require('./support');
var t = s.assert;

describe('Authenticator', function() {

    describe('#framework', function() {

        describe('with an authenticate function used for authorization', function() {
            var authenticator = new Authenticator();
            authenticator.framework({
                initialize: function() {
                    return function() {};
                },
                authenticate: function(authenticator, name, options) {
                    return function() {
                        return 'authenticate(): ' + name + ' ' + options.assignProperty;
                    };
                }
            });

            var rv = authenticator.authorize('foo')();
            it('should call authenticate', function() {
                t.equal(rv, 'authenticate(): foo account');
            });
        });

        describe('with an authorize function used for authorization', function() {
            var authenticator = new Authenticator();
            authenticator.framework({
                initialize: function() {
                    return function() {};
                },
                authenticate: function(authenticator, name, options) {
                    return function() {
                        return 'authenticate(): ' + name + ' ' + options.assignProperty;
                    };
                },
                authorize: function(authenticator, name, options) {
                    return function() {
                        return 'authorize(): ' + name + ' ' + options.assignProperty;
                    };
                }
            });

            var rv = authenticator.authorize('foo')();
            it('should call authorize', function() {
                t.equal(rv, 'authorize(): foo account');
            });
        });

    });

});