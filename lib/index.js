'use strict';

// Load external modules
var Hoek = require('hoek');
var Items = require('items');
var Joi = require('joi');
var Nodemailer = require('nodemailer');
var Path = require('path');

// Declare internals
var internals = {};


internals.defaults = {
    views: {
        engines: {}
    }
};


internals.schema = Joi.object({
    transport: Joi.object(),
    views: Joi.object()
});


exports.register = function (plugin, options, next) {

    Joi.assert(options, internals.schema);

    var config = Hoek.applyToDefaultsWithShallow(internals.defaults, options, ['views']);
    var transport = Nodemailer.createTransport(config.transport);

    if (options.views) {
        plugin.views(options.views);
    }

    plugin.expose('sendMail', function (data, callback) {

        Items.parallel(['text', 'html'], function (format, cb) {

            var path = typeof data[format] === 'object' ? data[format].path : '';
            var extension = Path.extname(path).substr(1);

            if (config.views.engines.hasOwnProperty(extension)) {
                plugin.render(path, data.context, function (err, rendered) {

                    data[format] = rendered;
                    cb(err);
                });
            }
            else {
                cb();
            }
        }, function (err) {

            if (err) {
                return callback(err);
            }

            delete data.context;
            transport.sendMail(data, callback);
        });
    });

    next();
};


exports.register.attributes = {
    name: 'mailer'
};
