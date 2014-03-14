"use strict";

var Authorizer = require('mosca').Authorizer;
var merge = require('utils-merge');

module.exports = AuthorizerStrategy;

function AuthorizerStrategy() {
    this.authorizer = new Authorizer();
}

AuthorizerStrategy.prototype.authenticate = function(client, user, pass) {
    var self = this;
    return this.authorizer.authenticate(client, user, pass, function (err, success) {
        if (err) return self.error(err);
        if (success) return self.success(merge({username: user}, self.authorizer.users[user]));
        return self.fail("user or pass incorrect!");
    });
};

