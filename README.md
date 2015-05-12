# Hapi mailer plugin [![Build Status](https://travis-ci.org/gergoerdosi/hapi-mailer.svg)](https://travis-ci.org/gergoerdosi/hapi-mailer)

A wrapper around Nodemailer used for sending email. It can be used with or without a template engine.

## Installation

```
npm install hapi-mailer
```

## Usage

### Server configuration:

The plugin accepts the following configuration options:

* `transport`: A Nodemailer transport mechanism. If it is not set `nodemailer-direct-transport` transport is used. If it is a regular object `nodemailer-smtp-transport` is used and the value is passed as SMTP configuration.
* `views`: The views configuration as described in the server's [`views`](https://github.com/hapijs/hapi/blob/master/docs/Reference.md#server.config.views) option. Note that due to the way node `require()` operates, plugins must require rendering engines directly and pass the engine using the `engines.module` option. Note that relative paths are relative to the plugin root, not the working directory or the application registering the plugin.
* `inlineImages`: A boolean value to convert Base64 images to attachments. Defaults to `true`.
* `inlineStyles`: A boolean value to inline CSS in `<style>` tags. Defaults to `true`.

**Example:**

```
var Handlebars = require('handlebars');

var options = {
    transport: {
        service: 'Gmail',
        auth: {
            user: 'example@gmail.com',
            pass: 'password'
        }
    },
    views: {
        engines: {
            html: {
                module: Handlebars.create(),
                path: Path.join(__dirname, 'lib/views/emails')
            }
        }
    }
};

var plugin = {
    register: require('hapi-mailer'),
    options: options
};

server.register(plugin, function (err) {
    ...
});

```

### Handler:

In handlers, the `Mailer` object can be accessed as `request.server.plugins.mailer`. It has a `sendMail` function which can be used to send an email. It accepts the following configuration options:

* `data`: Defines the mail content the same way as Nodemailer. There is only one additional property `context`, which is an optional object used by the template to render context-specific result.
* `callback`: It is a callback function to run once the message is delivered or it failed.

**Example:**

```
var handler = function (request, reply) {

    var data = {
        from: 'example@gmail.com',
        to: 'to@example.com',
        subject: 'Example Subject',
        html: {
            path: 'handlebars.html'
        },
        context: {
            name: 'Example User'
        }
    };

    var Mailer = request.server.plugins.mailer;
    Mailer.sendMail(data, function (err, info) {

        reply();
    });
};

server.route({ method: 'POST', path: '/', handler: handler });
```
