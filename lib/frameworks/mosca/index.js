"use strict";

require('./client');

var mosca = {};

module.exports = mosca;

mosca.initialize = function (thort) {
    return function initialize(client) {
        client._thort = thort;
    }
};

mosca.authenticate = function (thort, name, options) {
    options = options || {};

    var multi = true;

    // Cast `name` to an array, allowing authentication to pass through a chain of
    // strategies.  The first strategy to succeed, redirect, or error will halt
    // the chain.  Authentication failures will proceed through each strategy in
    // series, ultimately failing if all strategies fail.
    //
    // This is typically used on API endpoints to allow clients to authenticate
    // using their preferred choice of Basic, Digest, token-based schemes, etc.
    // It is not feasible to construct a chain of multiple strategies that involve
    // redirection (for example both Facebook and Twitter), since the first one to
    // redirect will halt the chain.
    if (!Array.isArray(name)) {
        name = [ name ];
        multi = false;
    }

    return function authenticate(client, username, password, callback) {
        callback = callback || function () {};
        // accumulator for failures from each strategy in the chain
        var failures = [];

        function allFailed() {
            if (!multi) {
                return callback(null, false, failures[0].challenge, failures[0].status);
            } else {
                var challenges = failures.map(function(f) { return f.challenge; });
                var statuses = failures.map(function(f) { return f.status; });
                return callback(null, false, challenges, statuses);
            }
        }

        (function attempt(i) {
            var layer = name[i];
            // If no more strategies exist in the chain, authentication has failed.
            if (!layer) { return allFailed(); }

            // Get the strategy, which will be used as prototype from which to create
            // a new instance.
            var prototype = thort._strategy(layer);
            if (!prototype) { return callback(new Error('Unknown authentication strategy "' + layer + '"')); }

            var strategy = Object.create(prototype);

            // ----- BEGIN STRATEGY AUGMENTATION -----
            // Augment the new strategy instance with action functions. The end
            // goal of the strategy is to invoke *one* of these action methods, in
            // order to indicate successful or failed authentication, redirect to a
            // third-party identity provider, etc.

            /**
             * Authenticate `user`, with optional `info`.
             *
             * Strategies should call this function to successfully authenticate a
             * user.  `user` should be an object supplied by the application after it
             * has been given an opportunity to verify credentials.  `info` is an
             * optional argument containing additional user information.  This is
             * useful for third-party authentication strategies to pass profile
             * details.
             *
             * @param {Object} user
             * @param {Object} info
             * @api public
             */
            strategy.success = function(user, info) {
                info = info || {};
                if (options.assignProperty) {
                    client[options.assignProperty] = user;
                    return callback(null, user);
                }
                client.login(user, options, function (err) {
                    if (err) { return callback(err); }

                    function complete() {
                        callback(err, user);
                    }

                    if (options.authInfo !== false) {
                        thort.transformAuthInfo(info, function(err, tinfo) {
                            if (err) { return callback(err); }
                            client.authInfo = tinfo;
                            complete();
                        });
                    } else {
                        complete();
                    }
                });
            };

            /**
             * Fail authentication, with optional `challenge` and `status`, defaulting
             * to 401.
             *
             * Strategies should call this function to fail an authentication attempt.
             *
             * @param {String|Number|?} challenge
             * @param {Number} status
             * @api public
             */
            strategy.fail = function(challenge, status) {
                if (typeof challenge == 'number') {
                    status = challenge;
                    challenge = undefined;
                }

                // push this failure into the accumulator and attempt authentication
                // using the next strategy
                failures.push({ challenge: challenge, status: status });
                attempt(i + 1);
            };

            /**
             * Internal error while performing authentication.
             *
             * Strategies should call this function when an internal error occurs
             * during the process of performing authentication; for example, if the
             * user directory is not available.
             *
             * @param {Error} err
             * @api public
             */
            strategy.error = function(err) {
                callback(err);
            };

            // ----- END STRATEGY AUGMENTATION -----

            strategy.authenticate(client, username, password, options);
        })(0); // attempt
    };
};

