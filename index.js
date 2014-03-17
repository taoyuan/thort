"use strict";

/**
 * Module dependencies.
 */
var Thort = require('./lib/authenticator');


/**
 * Export default singleton.
 *
 * @api public
 */
exports = module.exports = new Thort();

/**
 * Expose constructors.
 */
exports.Thort = exports.Authenticator = Thort;

exports.frameworks = {};
exports.frameworks.mosca = require('./lib/frameworks/mosca');

exports.utils = require('./lib/utils');