"use strict";

var Server = require('mosca').Server;

exports.server = function (settings) {
    return new Mosca(settings);
};

function Mosca(settings) {
    this._settings = settings || {};
    this._authenticate = function () {};
}

Mosca.prototype.authenticate = function (authenticate) {
    this._authenticate = authenticate;
    return this;
};

Mosca.prototype.client = function (fn) {
    this._client = fn;
    return this;
};

Mosca.prototype.connect = function (fn) {
    this._connect = fn;
    return this;
};

Mosca.prototype.start = function () {
    var self = this;
    var server = new Server(this._settings);
    server.authenticate = function (client, user, pass, callback) {
        self._client && self._client(client);

        function done(err, verdict) {
            callback(err, verdict);
            self._connect && self._connect(err, verdict);
        }

        self._authenticate(client, user, pass, done);
    };
    return server;
};