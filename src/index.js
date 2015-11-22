'use strict';

// Load modules
const Fs = require('fs');
const Hoek = require('hoek');
const Items = require('items');
const Joi = require('joi');
const Juice = require('juice');
const Nodemailer = require('nodemailer');
const NodemailerPluginInlineBase64 = require('nodemailer-plugin-inline-base64');
const Path = require('path');

// Declare internals
const internals = {};

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

exports.register = function(server, options, next) {
  Joi.assert(options, internals.schema);
  const config = Hoek.applyToDefaultsWithShallow(internals.defaults, options, ['views']);

  const transport = Nodemailer.createTransport(config.transport);

  if (config.inlineImages) {
    transport.use('compile', NodemailerPluginInlineBase64);
  }

  server.dependency('vision', (server, done) => {
    if (Object.keys(config.views.engines).length) {
      server.views(config.views);
    }

    server.expose('send', (data, callback) => {
      Items.parallel(['text', 'html'], (format, cb) => {
        const path = typeof data[format] === 'object' ? data[format].path : '';
        const extension = Path.extname(path).substr(1);

        if (config.views.engines.hasOwnProperty(extension)) {
          server.render(path, data.context, (err, rendered) => {
            if (err) return cb(err);

            if (format === 'html' && config.inlineStyles) {
              rendered = Juice(rendered);
            }

            data[format] = rendered;
            return cb();
          });
        } else {
          if (typeof data[format] !== 'object') {
            return cb();
          }

          Fs.readFile(path, 'utf8', (err, rendered) => {
            if (err) return cb(err);

            data[format] = rendered;
            return cb();
          });
        }

      }, (err) => {
        if (err) return callback(err);

        delete data.context;
        transport.sendMail(data, callback);
      });
    });

    done();

  });

  next();
};


exports.register.attributes = {
  name: 'hapi-mailer'
};
