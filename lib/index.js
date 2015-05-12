'use strict';

// Load modules
var Hoek = require('hoek');
var Items = require('items');
var Joi = require('joi');
var Juice = require('juice');
var Nodemailer = require('nodemailer');
var Path = require('path');

// Declare internals
var internals = {};


internals.defaults = {
    views: {
        engines: {}
    },
    inline: true
};


internals.schema = Joi.object({
    transport: Joi.object(),
    views: Joi.object(),
    inline: Joi.boolean()
});


exports.register = function (server, options, next) {

    Joi.assert(options, internals.schema);

    var config = Hoek.applyToDefaultsWithShallow(internals.defaults, options, ['views']);
    var transport = Nodemailer.createTransport(config.transport);

    if (Object.keys(config.views.engines).length) {
        server.views(config.views);
    }

    server.expose('sendMail', function (data, callback) {

        Items.parallel(['text', 'html'], function (format, cb) {

            var path = typeof data[format] === 'object' ? data[format].path : '';
            var extension = Path.extname(path).substr(1);

            if (!config.views.engines.hasOwnProperty(extension)) {
                return cb();
            }

            server.render(path, data.context, function (err, rendered) {

                if (err) {
                    return cb(err);
                }

                if (format === 'html' && config.inline) {
                    rendered = Juice(rendered);
                }

                data[format] = rendered;
                cb();
            });
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
