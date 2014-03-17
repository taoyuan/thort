"use strict";

var client = module.exports = {};

client.login = function (user, options, done) {
    if (typeof options == 'function') {
        done = options;
        options = {};
    }
    options = options || {};

    var property = 'user';
    if (this._thort) {
        property = this._thort._userProperty || 'user';
    }

    this[property] = user;
    done && done();
};