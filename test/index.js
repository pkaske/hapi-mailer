'use strict';

// Load external modules
const Code = require('code');
const Fs = require('fs');
const Handlebars = require('handlebars');
const Hapi = require('hapi');
const Lab = require('lab');
const Nodemailer = require('nodemailer');
const Path = require('path');
const Sinon = require('sinon');
const Vision = require('vision');

// Load internal modules
const HapiMailer = require('..');

// Test shortcuts
const lab = exports.lab = Lab.script();
const describe = lab.describe;
const it = lab.it;
const expect = Code.expect;


describe('Mailer', function () {

    it('sends the email when a view is used', function (done) {

        var server = new Hapi.Server();
        server.connection();

        server.route({
            method: 'POST',
            path: '/',
            handler: function (request, reply) {

                var Mailer = request.server.plugins.mailer;

                var data = {
                    from: 'from@example.com',
                    to: 'to@example.com',
                    subject: 'test',
                    html: {
                        path: 'handlebars.html'
                    },
                    context: {
                        content: 'HANDLEBARS'
                    }
                };

                Mailer.sendMail(data, function (err, info) {

                    reply(info);
                });
            }
        });

        const plugins = [
          {
            register: HapiMailer,
            options: {
              transport: require('nodemailer-stub-transport')(),
              views: {
                  engines: {
                      html: {
                          module: Handlebars.create(),
                          path: Path.join(__dirname, 'templates')
                      }
                  }
              }
            }
          },
          {
            register: Vision
          }
        ];

        server.register(plugins, (err) => {
          server.initialize((err) => {
            expect(err).to.not.exist();

            server.inject({ method: 'POST', url: '/' }, function (res) {

                expect(res.result).to.be.an.object();
                expect(res.result.response.toString()).to.contain('<p>HANDLEBARS</p>');

                done();
            });
          });
        });
    });

    it('sends the email when content is loaded from file', function (done) {

        var server = new Hapi.Server();
        server.connection();

        server.route({
            method: 'POST',
            path: '/',
            handler: function (request, reply) {

                var data = {
                    from: 'from@example.com',
                    to: 'to@example.com',
                    subject: 'test',
                    html: {
                        path: Path.join(__dirname, 'templates/nodemailer.html')
                    }
                };

                var Mailer = request.server.plugins.mailer;
                Mailer.sendMail(data, function (err, info) {

                    reply(info);
                });
            }
        });

        var plugins = [
          {
            register: Vision
          },
          {
              register: HapiMailer,
              options: {
                  transport: require('nodemailer-stub-transport')()
              }
          }
        ];

        server.register(plugins, function (err) {

          server.initialize((err) => {
            server.inject({ method: 'POST', url: '/' }, function (res) {

                expect(res.result).to.be.an.object();
                expect(res.result.response.toString()).to.contain('<p>NODEMAILER</p>');

                done();
            });
          });


        });
    });

    it('sends the email when content is a string', function (done) {

        var server = new Hapi.Server();
        server.connection();

        server.route({
            method: 'POST',
            path: '/',
            handler: function (request, reply) {

                var data = {
                    from: 'from@example.com',
                    to: 'to@example.com',
                    subject: 'test',
                    html: '<p>NODEMAILER</p>'
                };

                var Mailer = request.server.plugins.mailer;
                Mailer.sendMail(data, function (err, info) {

                    reply(info);
                });
            }
        });

        var plugin = {
            register: require('..'),
            options: {
                transport: require('nodemailer-stub-transport')()
            }
        };

        server.register([Vision, plugin], function (err) {

          server.initialize((err) => {
            server.inject({ method: 'POST', url: '/' }, function (res) {

                expect(res.result).to.be.an.object();
                expect(res.result.response.toString()).to.contain('<p>NODEMAILER</p>');

                done();
            });
          });


        });
    });

    it('throws an error when rendering fails', function (done) {

        var server = new Hapi.Server({ debug: false });
        server.connection();

        server.route({
            method: 'POST',
            path: '/',
            handler: function (request, reply) {

                var Mailer = request.server.plugins.mailer;

                var data = {
                    from: 'from@example.com',
                    to: 'to@example.com',
                    subject: 'test',
                    html: {
                        path: 'invalid.html'
                    },
                    context: {
                        content: 'HANDLEBARS'
                    }
                };

                Mailer.sendMail(data, function (err, info) {

                    reply(err);
                });
            }
        });

        var options = {
            transport: require('nodemailer-stub-transport')(),
            views: {
                engines: {
                    html: {
                        module: Handlebars.create(),
                        path: Path.join(__dirname, 'templates')
                    }
                }
            }
        };

        var plugin = {
            register: require('..'),
            options: options
        };

        server.register([Vision, plugin], function (err) {
          server.initialize((err) => {
            server.inject({ method: 'POST', url: '/' }, function (res) {

                expect(res.statusCode).to.equal(500);
                done();
            });
          });
        });
    });

    it('inlines images when inline option is true', function (done) {

        var server = new Hapi.Server();
        server.connection();

        server.route({
            method: 'POST',
            path: '/',
            handler: function (request, reply) {

                var Mailer = request.server.plugins.mailer;

                var data = {
                    from: 'from@example.com',
                    to: 'to@example.com',
                    subject: 'test',
                    html: {
                        path: 'inline_images.html'
                    }
                };

                Mailer.sendMail(data, function (err, info) {

                    reply(info);
                });
            }
        });

        var options = {
            transport: require('nodemailer-stub-transport')(),
            views: {
                engines: {
                    html: {
                        module: Handlebars.create(),
                        path: Path.join(__dirname, 'templates')
                    }
                }
            }
        };

        var plugin = {
            register: require('..'),
            options: options
        };

        server.register([Vision, plugin], function (err) {
          server.initialize((err) => {
            server.inject({ method: 'POST', url: '/' }, function (res) {

                expect(res.result).to.be.an.object();

                var response = res.result.response.toString();
                expect(response).to.match(/<img style="test" src="cid:\w+" width="100%">/);
                expect(response).to.match(/Content-Id: <\w+>/);

                done();
            });
          });
        });
    });

    it('does not inline images when inline option is false', function (done) {

        var server = new Hapi.Server();
        server.connection();

        server.route({
            method: 'POST',
            path: '/',
            handler: function (request, reply) {

                var Mailer = request.server.plugins.mailer;

                var data = {
                    from: 'from@example.com',
                    to: 'to@example.com',
                    subject: 'test',
                    html: {
                        path: Path.join(__dirname, 'templates/inline_images.html')
                    }
                };

                Mailer.sendMail(data, function (err, info) {

                    reply(info);
                });
            }
        });

        var options = {
            transport: require('nodemailer-stub-transport')(),
            inlineImages: false
        };

        var plugin = {
            register: require('..'),
            options: options
        };

        server.register([Vision, plugin], function (err) {
          server.initialize((err) => {
            server.inject({ method: 'POST', url: '/' }, function (res) {

                expect(res.result).to.be.an.object();

                var response = res.result.response.toString();
                expect(response).to.match(/<img style=3D"test" src=3D"data:image\/png;base64,[^"]+" width=3D"100%">/);

                done();
            });
          });
        });
    });

    it('returns an error when reading of the file fails', function (done) {

        Sinon.stub(Fs, 'readFile', function (path, options, callback) {

            callback(new Error('Failed to read view file: /test'));
        });

        var server = new Hapi.Server();
        server.connection();

        server.route({
            method: 'POST',
            path: '/',
            handler: function (request, reply) {

                var Mailer = request.server.plugins.mailer;

                var data = {
                    from: 'from@example.com',
                    to: 'to@example.com',
                    subject: 'test',
                    html: {
                        path: 'inline_images.html'
                    },
                    context: {
                        content: 'HANDLEBARS'
                    }
                };

                Mailer.sendMail(data, function (err, info) {

                    reply(err);
                });
            }
        });

        var options = {
            transport: require('nodemailer-stub-transport')()
        };

        var plugin = {
            register: require('..'),
            options: options
        };

        server.register([Vision, plugin], function (err) {
          server.initialize((err) => {
            server.inject({ method: 'POST', url: '/' }, function (res) {

                Fs.readFile.restore();

                expect(res.statusCode).to.equal(500);
                done();
            });
          });

        });
    });

    it('inlines styles when inline option is true', function (done) {

        var server = new Hapi.Server();
        server.connection();

        server.route({
            method: 'POST',
            path: '/',
            handler: function (request, reply) {

                var Mailer = request.server.plugins.mailer;

                var data = {
                    from: 'from@example.com',
                    to: 'to@example.com',
                    subject: 'test',
                    html: {
                        path: 'inline_styles.html'
                    },
                    context: {
                        content: 'HANDLEBARS'
                    }
                };

                Mailer.sendMail(data, function (err, info) {

                    reply(info);
                });
            }
        });

        var options = {
            transport: require('nodemailer-stub-transport')(),
            views: {
                engines: {
                    html: {
                        module: Handlebars.create(),
                        path: Path.join(__dirname, 'templates')
                    }
                }
            }
        };

        var plugin = {
            register: require('..'),
            options: options
        };

        server.register([Vision, plugin], function (err) {
          server.initialize((err) => {
            server.inject({ method: 'POST', url: '/' }, function (res) {

                expect(res.result).to.be.an.object();

                var response = res.result.response.toString();
                expect(response).to.contain('<p style=3D"color: red; =\r\ntext-decoration: underline;">');
                expect(response).to.contain('<strong style=3D"font-weight: =\r\nbold;">');
                expect(response).to.not.contain('<style>');

                done();
            });
          });
        });
    });

    it('does not inline styles when inline option is false', function (done) {

        var server = new Hapi.Server();
        server.connection();

        server.route({
            method: 'POST',
            path: '/',
            handler: function (request, reply) {

                var Mailer = request.server.plugins.mailer;

                var data = {
                    from: 'from@example.com',
                    to: 'to@example.com',
                    subject: 'test',
                    html: {
                        path: 'inline_styles.html'
                    },
                    context: {
                        content: 'HANDLEBARS'
                    }
                };

                Mailer.sendMail(data, function (err, info) {

                    reply(info);
                });
            }
        });

        var options = {
            transport: require('nodemailer-stub-transport')(),
            views: {
                engines: {
                    html: {
                        module: Handlebars.create(),
                        path: Path.join(__dirname, 'templates')
                    }
                }
            },
            inlineStyles: false
        };

        var plugin = {
            register: require('..'),
            options: options
        };

        server.register([Vision, plugin], function (err) {
          server.initialize((err) => {
            server.inject({ method: 'POST', url: '/' }, function (res) {

                expect(res.result).to.be.an.object();

                var response = res.result.response.toString();
                expect(response).to.contain('<p>test <strong>test</strong> test</p>');
                expect(response).to.contain('<style>');

                done();
            });
          });

        });
    });

    it('does not inline styles when rendering text format', function (done) {

        var server = new Hapi.Server();
        server.connection();

        server.route({
            method: 'POST',
            path: '/',
            handler: function (request, reply) {

                var Mailer = request.server.plugins.mailer;

                var data = {
                    from: 'from@example.com',
                    to: 'to@example.com',
                    subject: 'test',
                    text: {
                        path: 'inline_styles.text'
                    },
                    context: {
                        content: 'HANDLEBARS'
                    }
                };

                Mailer.sendMail(data, function (err, info) {

                    reply(info);
                });
            }
        });

        var options = {
            transport: require('nodemailer-stub-transport')(),
            views: {
                engines: {
                    text: {
                        module: Handlebars.create(),
                        path: Path.join(__dirname, 'templates')
                    }
                }
            },
            inlineStyles: false
        };

        var plugin = {
            register: require('..'),
            options: options
        };

        server.register([Vision, plugin], function (err) {
          server.initialize((err) => {
            server.inject({ method: 'POST', url: '/' }, function (res) {

                expect(res.result).to.be.an.object();

                var response = res.result.response.toString();
                expect(response).to.contain('test test test');

                done();
            });
          });
        });
    });
});
