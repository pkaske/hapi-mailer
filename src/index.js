'use strict';

// Load external modules
const Fs = require('fs');
const Hoek = require('hoek');
const Items = require('items');
const Joi = require('joi');
const Juice = require('juice');
const Nodemailer = require('nodemailer');
const NodemailerPluginInlineBase64 = require('nodemailer-plugin-inline-base64');
const Path = require('path');

// Declare internals
const internals = {
  defaultTransport: null
};

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

internals.createTransport = function(config) {
  const transport = Nodemailer.createTransport(config);

  if (internals.config.inlineImages) {
    transport.use('compile', NodemailerPluginInlineBase64());
  }

  return transport;
};

exports.register = function(server, options, next) {
  Joi.assert(options, internals.schema);
  const config = internals.config = Hoek.applyToDefaultsWithShallow(internals.defaults, options, ['views']);

  internals.defaultTransport = internals.createTransport(config.transport);

  server.dependency('vision', (server, done) => {
    if (Object.keys(config.views.engines).length) {
      server.views(config.views);
    }

    server.expose('send', (data, transport, callback) => {
      if (typeof transport == 'function') {
        callback = transport;
      }

      let mailer = internals.defaultTransport;
      if (typeof transport == 'object') {
        mailer = internals.createTransport(transport);
      }

      Items.parallel(['text', 'html'], (format, cb) => {
        const path = typeof data[format] === 'object' ? data[format].path : '';
        const extension = Path.extname(path).substr(1);

        if (config.views.engines.hasOwnProperty(extension)) {
          server.render(path, data.context, (err, rendered) => {
            if (err) return cb(err);

            if (format === 'html' && config.inlineStyles) {
              data[format] = Juice(rendered); // eslint-disable-line new-cap
            } else {
              data[format] = rendered;
            }

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
        mailer.sendMail(data, callback);
      });
    });

    done();
  });

  next();
};

exports.register.attributes = {
  name: 'hapi-mailer'
};
