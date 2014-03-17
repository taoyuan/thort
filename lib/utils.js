"use strict";

exports.merge = merge;
function merge() {
    var items = Array.prototype.slice.call(arguments),
        result = items.shift(),
        size = items.length,
        item, index, key;

    for (index = 0; index < size; ++index) {
        if (typeOf(item = items[index]) === 'object') {
            for (key in item) {
                result[key] = item[key];
            }
        }
    }

    return result;
}

exports.merged = merged;
function merged() {
    var items = Array.prototype.slice.call(arguments),
        result = items.shift(),
        size = items.length,
        item, index, key;


    for (index = 0; index < size; ++index) {
        if (typeOf(item = items[index]) === 'object') {
            for (key in item) {
                result[key] = clone(item[key]);
            }
        }
    }

    return result;
}

function clone(input) {
    var output = input,
        type = typeOf(input),
        index, size;

    if (type === 'array') {
        output = [];
        size = input.length;

        for (index=0;index<size;++index) {
            output[index] = clone(input[index]);
        }

    } else if (type === 'object') {
        output = {};
        for (index in input) {
            output[index] = clone(input[index]);
        }
    }

    return output;
}

function typeOf(input) {
    return ({}).toString.call(input).match(/\s([\w]+)/)[1].toLowerCase();
}