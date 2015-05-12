'use strict';

// Load modules
var Fs = require('fs');
var Hoek = require('hoek');
var Items = require('items');
var Joi = require('joi');
var Juice = require('juice');
var Nodemailer = require('nodemailer');
var NodemailerPluginInlineBase64 = require('nodemailer-plugin-inline-base64');
var Path = require('path');

// Declare internals
var internals = {};


internals.defaults = {
    views: {
        engines: {}
    },
    inlineImages: true,
    inlineStyles: true
};


internals.schema = Joi.object({
    transport: Joi.object(),
    views: Joi.object(),
    inlineImages: Joi.boolean(),
    inlineStyles: Joi.boolean()
});


exports.register = function (server, options, next) {

    Joi.assert(options, internals.schema);
    var config = Hoek.applyToDefaultsWithShallow(internals.defaults, options, ['views']);

    var transport = Nodemailer.createTransport(config.transport);

    if (config.inlineImages) {
        transport.use('compile', NodemailerPluginInlineBase64);
    }

    if (Object.keys(config.views.engines).length) {
        server.views(config.views);
    }

    server.expose('sendMail', function (data, callback) {

        Items.parallel(['text', 'html'], function (format, cb) {

            var path = typeof data[format] === 'object' ? data[format].path : '';
            var extension = Path.extname(path).substr(1);

            if (config.views.engines.hasOwnProperty(extension)) {
                server.render(path, data.context, function (err, rendered) {

                    if (err) {
                        return cb(err);
                    }

                    if (format === 'html' && config.inlineStyles) {
                        rendered = Juice(rendered);
                    }

                    data[format] = rendered;
                    return cb();
                });
            }
            else {
                if (typeof data[format] !== 'object') {
                    return cb();
                }

                Fs.readFile(path, 'utf8', function (err, rendered) {

                    if (err) {
                        return cb(err);
                    }

                    data[format] = rendered;
                    return cb();
                });
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
