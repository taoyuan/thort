"use strict";

var Authenticator = require('../../../lib/authenticator');
var framework = require('../../../lib/frameworks/mosca');
var s = require('../../support');
var t = s.assert;
var h = require('./helpers');

describe('mosca/authenticate', function() {

    it('should be named authenticate', function() {
        t.equal(framework.authenticate().name, 'authenticate');
    });

    describe('with unknown strategy', function() {
        var authenticator = new Authenticator();

        var server, client, error;

        before(function(done) {
            var settings = s.buildSettings();
            server = h.server(settings)
                .authenticate(framework.authenticate(authenticator, 'foo'))
                .client(function (c) {
                    client = c;
                })
                .connect(function (err) {
                    error = err;
                    done();
                })
                .start();

            s.buildClient(settings.port, settings.host, {reconnectPeriod: 0}); // disable reconnect
        });

        it('should not error', function() {
            t.instanceOf(error, Error);
            t.equal(error.message, 'Unknown authentication strategy "foo"');
        });

        it('should not set user', function() {
            t.isUndefined(client.user);
        });

        it('should not set authInfo', function() {
            t.isUndefined(client.authInfo);
        });
    });

});