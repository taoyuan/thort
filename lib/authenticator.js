"use strict";

var path = require('path');
var fs = require('fs');

var existsSync = fs.existsSync || path.existsSync;

/**
 * Expose `Authenticator`.
 */
module.exports = Authenticator;

function Authenticator(fw) {
    if (!(this instanceof Authenticator)) {
        return new Authenticator(fw);
    }

    fw = fw || 'mosca';

    this._strategies = {};
    this._framework = null;
    this._infoTransformers = [];
    this._userProperty = 'user';

    var framework;
    if (typeof fw === 'object') {
        framework = fw;
    } else if (fw.match(/^\//)) {
        // try absolute path
        framework = require(fw);
    } else if (existsSync(__dirname + '/frameworks/' + fw + '.js') || existsSync(__dirname + '/frameworks/' + fw + '/index.js')) {
        // try built-in framework
        framework = require('./frameworks/' + fw);
    } else {
        // try foreign framework
        try {
            framework = require('thort-' + fw);
        } catch (e) {
            return console.log('\nWARNING: Thort framework "' + fw + '" is not installed,\nso thort would not work, to fix run:\n\n    npm install thort-' + fw, '\n');
        }
    }

    this.framework(framework);
}

/**
 * Utilize the given `strategy` with optional `name`, overridding the strategy's
 * default name.
 *
 * Examples:
 *
 *     thort.use(new TwitterStrategy(...));
 *
 *     thort.use('api', new http.BasicStrategy(...));
 *
 * @param {String|Strategy} name
 * @param {Strategy|?} strategy
 * @return {Authenticator} for chaining
 * @api public
 */
Authenticator.prototype.use = function(name, strategy) {
    if (!strategy) {
        strategy = name;
        name = strategy.name;
    }
    if (!name) { throw new Error('Authentication strategies must have a name'); }

    this._strategies[name] = strategy;
    return this;
};

/**
 * Un-utilize the `strategy` with given `name`.
 *
 * In typical applications, the necessary authentication strategies are static,
 * configured once and always available.  As such, there is often no need to
 * invoke this function.
 *
 * However, in certain situations, applications may need dynamically configure
 * and de-configure authentication strategies.  The `use()`/`unuse()`
 * combination satisfies these scenarios.
 *
 * Examples:
 *
 *     thort.unuse('legacy-api');
 *
 * @param {String} name
 * @return {Authenticator} for chaining
 * @api public
 */
Authenticator.prototype.unuse = function(name) {
    delete this._strategies[name];
    return this;
};

/**
 * Setup Passport to be used under framework.
 *
 * By default, Passport exposes middleware that operate using Connect-style
 * middleware using a `fn(req, res, next)` signature.  Other popular frameworks
 * have different expectations, and this function allows Passport to be adapted
 * to operate within such environments.
 *
 * If you are using a Connect-compatible framework, including Express, there is
 * no need to invoke this function.
 *
 * Examples:
 *
 *     thort.framework(require('hapi-thort')());
 *
 * @param {Object} fw
 * @return {Authenticator} for chaining
 * @api public
 */
Authenticator.prototype.framework = function(fw) {
    this._framework = fw;
    return this;
};

Authenticator.prototype.initialize = function(options) {
    options = options || {};
    this._userProperty = options.userProperty || 'user';
};

Authenticator.prototype.authenticate = function(strategy, options) {
    var initialize = this._framework.initialize(this);
    var fn = this._framework.authenticate(this, strategy, options);
    return function () {
        initialize.apply(undefined, arguments);
        return fn.apply(undefined, arguments);
    }
};

/**
 * Middleware that will authorize a third-party account using the given
 * `strategy` name, with optional `options`.
 *
 * If authorization is successful, the result provided by the strategy's verify
 * callback will be assigned to `obj.account`.  The existing login session and
 * `obj.user` will be unaffected.
 *
 * This function is particularly useful when connecting third-party accounts
 * to the local account of a user that is currently authenticated.
 *
 * Examples:
 *
 *    passport.authorize('twitter-authz', { failureRedirect: '/account' });
 *
 * @param {String} strategy
 * @param {Object|?} options
 * @return {Function} middleware
 * @api public
 */
Authenticator.prototype.authorize = function(strategy, options) {
    options = options || {};
    options.assignProperty = 'account';

    var authfn = this._framework.authorize || this._framework.authenticate;
    var initialize = this._framework.initialize(this);
    var fn = authfn(this, strategy, options);
    return function () {
        initialize.apply(undefined, arguments);
        return fn.apply(undefined, arguments);
    }
};

/**
 * Registers a function used to transform auth info.
 *
 * In some circumstances authorization details are contained in authentication
 * credentials or loaded as part of verification.
 *
 * For example, when using bearer tokens for API authentication, the tokens may
 * encode (either directly or indirectly in a database), details such as scope
 * of access or the client to which the token was issued.
 *
 * Such authorization details should be enforced separately from authentication.
 * Because Passport deals only with the latter, this is the responsiblity of
 * middleware or routes further along the chain.  However, it is not optimal to
 * decode the same data or execute the same database query later.  To avoid
 * this, Passport accepts optional `info` along with the authenticated `user`
 * in a strategy's `success()` action.  This info is set at `req.authInfo`,
 * where said later middlware or routes can access it.
 *
 * Optionally, applications can register transforms to proccess this info,
 * which take effect prior to `req.authInfo` being set.  This is useful, for
 * example, when the info contains a client ID.  The transform can load the
 * client from the database and include the instance in the transformed info,
 * allowing the full set of client properties to be convieniently accessed.
 *
 * If no transforms are registered, `info` supplied by the strategy will be left
 * unmodified.
 *
 * Examples:
 *
 *     thort.transformAuthInfo(function(info, done) {
 *       Client.findById(info.clientID, function (err, client) {
 *         info.client = client;
 *         done(err, info);
 *       });
 *     });
 *
 * @api public
 */
Authenticator.prototype.transformAuthInfo = function(fn, done) {
    if (typeof fn === 'function') {
        return this._infoTransformers.push(fn);
    }

    // private implementation that traverses the chain of transformers,
    // attempting to transform auth info
    var info = fn;

    var stack = this._infoTransformers;
    (function pass(i, err, tinfo) {
        // transformers use 'pass' as an error to skip processing
        if ('pass' === err) {
            err = undefined;
        }
        // an error or transformed info was obtained, done
        if (err || tinfo) { return done(err, tinfo); }

        var layer = stack[i];
        if (!layer) {
            // if no transformers are registered (or they all pass), the default
            // behavior is to use the un-transformed info as-is
            return done(null, info);
        }

        function transformed(e, t) {
            pass(i + 1, e, t);
        }

        try {
            var arity = layer.length;
            if (arity == 1) {
                // sync
                var t = layer(info);
                transformed(null, t);
            } else {
                layer(info, transformed);
            }
        } catch(e) {
            return done(e);
        }
    })(0);
};


/**
 * Return strategy with given `name`.
 *
 * @param {String} name
 * @return {Strategy}
 * @api private
 */
Authenticator.prototype._strategy = function(name) {
    return this._strategies[name];
};

