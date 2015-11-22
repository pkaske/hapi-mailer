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
const expect = Code.expect;

lab.describe('Mailer', () => {
  lab.it('sends the email when a view is used', (done) => {
    const server = new Hapi.Server();
    server.connection();

    server.route({
      method: 'POST',
      path: '/',
      handler: function(request, reply) {
        const data = {
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

        const Mailer = request.server.plugins.mailer;
        Mailer.send(data, (err, info) => reply(info));
      }
    });

    const HapiMailer = {
      register: require('..'),
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
    };

    server.register([HapiMailer, Vision], (err) => {
      expect(err).to.not.exist();

      server.initialize((err) => {
        expect(err).to.not.exist();

        server.inject({ method: 'POST', url: '/' }, (res) => {
          expect(res.result).to.be.an.object();
          expect(res.result.response.toString()).to.contain('<p>HANDLEBARS</p>');

          done();
        });
      });
    });
  });

  lab.it('sends the email when content is loaded from file', (done) => {
    const server = new Hapi.Server();
    server.connection();

    server.route({
      method: 'POST',
      path: '/',
      handler: function(request, reply) {
        const data = {
          from: 'from@example.com',
          to: 'to@example.com',
          subject: 'test',
          html: {
            path: Path.join(__dirname, 'templates/nodemailer.html')
          }
        };

        const Mailer = request.server.plugins.mailer;
        Mailer.send(data, (err, info) => reply(info));
      }
    });

    const HapiMailer = {
      register: require('..'),
      options: {
        transport: require('nodemailer-stub-transport')()
      }
    };

    server.register([HapiMailer, Vision], (err) => {
      expect(err).to.not.exist();

      server.initialize((err) => {
        expect(err).to.not.exist();

        server.inject({ method: 'POST', url: '/' }, (res) => {
          expect(res.result).to.be.an.object();
          expect(res.result.response.toString()).to.contain('<p>NODEMAILER</p>');

          done();
        });
      });
    });
  });

  lab.it('sends the email when content is a string', (done) => {
    const server = new Hapi.Server();
    server.connection();

    server.route({
      method: 'POST',
      path: '/',
      handler: function(request, reply) {
        const data = {
          from: 'from@example.com',
          to: 'to@example.com',
          subject: 'test',
          html: '<p>NODEMAILER</p>'
        };

        const Mailer = request.server.plugins.mailer;
        Mailer.send(data, (err, info) => reply(info));
      }
    });

    const HapiMailer = {
      register: require('..'),
      options: {
        transport: require('nodemailer-stub-transport')()
      }
    };

    server.register([HapiMailer, Vision], (err) => {
      expect(err).to.not.exist();

      server.initialize((err) => {
        expect(err).to.not.exist();

        server.inject({ method: 'POST', url: '/' }, (res) => {
          expect(res.result).to.be.an.object();
          expect(res.result.response.toString()).to.contain('<p>NODEMAILER</p>');

          done();
        });
      });
    });
  });

  lab.it('throws an error when rendering fails', (done) => {
    const server = new Hapi.Server({ debug: false });
    server.connection();

    server.route({
      method: 'POST',
      path: '/',
      handler: function(request, reply) {
        const data = {
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

        const Mailer = request.server.plugins.mailer;
        Mailer.send(data, (err, info) => reply(err));
      }
    });

    const HapiMailer = {
      register: require('..'),
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
    };

    server.register([HapiMailer, Vision], (err) => {
      expect(err).to.not.exist();

      server.initialize((err) => {
        expect(err).to.not.exist();

        server.inject({ method: 'POST', url: '/' }, (res) => {
          expect(res.statusCode).to.equal(500);
          done();
        });
      });
    });
  });

  lab.it('inlines images when inline option is true', (done) => {
    const server = new Hapi.Server();
    server.connection();

    server.route({
      method: 'POST',
      path: '/',
      handler: function(request, reply) {
        const data = {
          from: 'from@example.com',
          to: 'to@example.com',
          subject: 'test',
          html: {
            path: 'inline_images.html'
          }
        };

        const Mailer = request.server.plugins.mailer;
        Mailer.send(data, (err, info) => reply(info));
      }
    });

    const HapiMailer = {
      register: require('..'),
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
    };

    server.register([HapiMailer, Vision], (err) => {
      expect(err).to.not.exist();

      server.initialize((err) => {
        expect(err).to.not.exist();

        server.inject({ method: 'POST', url: '/' }, (res) => {
          expect(res.result).to.be.an.object();

          const response = res.result.response.toString();
          expect(response).to.match(/<img style="test" src="cid:\w+" width="100%">/);
          expect(response).to.match(/Content-Id: <\w+>/);

          done();
        });
      });
    });
  });

  lab.it('does not inline images when inline option is false', (done) => {
    const server = new Hapi.Server();
    server.connection();

    server.route({
      method: 'POST',
      path: '/',
      handler: function(request, reply) {
        const data = {
          from: 'from@example.com',
          to: 'to@example.com',
          subject: 'test',
          html: {
            path: Path.join(__dirname, 'templates/inline_images.html')
          }
        };

        const Mailer = request.server.plugins.mailer;
        Mailer.send(data, (err, info) => reply(info));
      }
    });

    const HapiMailer = {
      register: require('..'),
      options: {
        transport: require('nodemailer-stub-transport')(),
        inlineImages: false
      }
    };

    server.register([HapiMailer, Vision], (err) => {
      expect(err).to.not.exist();

      server.initialize((err) => {
        expect(err).to.not.exist();

        server.inject({ method: 'POST', url: '/' }, (res) => {
          expect(res.result).to.be.an.object();

          const response = res.result.response.toString();
          expect(response).to.match(/<img style=3D"test" src=3D"data:image\/png;base64,[^"]+" width=3D"100%">/);

          done();
        });
      });
    });
  });

  lab.it('returns an error when reading of the file fails', (done) => {
    Sinon.stub(Fs, 'readFile', (path, options, callback) => {
      callback(new Error('Failed to read view file: /test'));
    });

    const server = new Hapi.Server();
    server.connection();

    server.route({
      method: 'POST',
      path: '/',
      handler: function(request, reply) {
        const data = {
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

        const Mailer = request.server.plugins.mailer;
        Mailer.send(data, (err, info) => reply(err));
      }
    });

    const HapiMailer = {
      register: require('..'),
      options: {
        transport: require('nodemailer-stub-transport')()
      }
    };

    server.register([HapiMailer, Vision], (err) => {
      expect(err).to.not.exist();

      server.initialize((err) => {
        expect(err).to.not.exist();

        server.inject({ method: 'POST', url: '/' }, (res) => {
          Fs.readFile.restore();

          expect(res.statusCode).to.equal(500);
          done();
        });
      });
    });
  });

  lab.it('inlines styles when inline option is true', (done) => {
    const server = new Hapi.Server();
    server.connection();

    server.route({
      method: 'POST',
      path: '/',
      handler: function(request, reply) {
        const data = {
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

        const Mailer = request.server.plugins.mailer;
        Mailer.send(data, (err, info) => reply(info));
      }
    });

    const HapiMailer = {
      register: require('..'),
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
    };

    server.register([HapiMailer, Vision], (err) => {
      expect(err).to.not.exist();

      server.initialize((err) => {
        expect(err).to.not.exist();

        server.inject({ method: 'POST', url: '/' }, (res) => {
          expect(res.result).to.be.an.object();

          const response = res.result.response.toString();
          expect(response).to.contain('<p style=3D"color: red; =\r\ntext-decoration: underline;">');
          expect(response).to.contain('<strong style=3D"font-weight: =\r\nbold;">');
          expect(response).to.not.contain('<style>');

          done();
        });
      });
    });
  });

  lab.it('does not inline styles when inline option is false', (done) => {
    const server = new Hapi.Server();
    server.connection();

    server.route({
      method: 'POST',
      path: '/',
      handler: function(request, reply) {
        const data = {
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

        const Mailer = request.server.plugins.mailer;
        Mailer.send(data, (err, info) => reply(info));
      }
    });

    const HapiMailer = {
      register: require('..'),
      options: {
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
      }
    };

    server.register([HapiMailer, Vision], (err) => {
      expect(err).to.not.exist();

      server.initialize((err) => {
        expect(err).to.not.exist();

        server.inject({ method: 'POST', url: '/' }, (res) => {
          expect(res.result).to.be.an.object();

          const response = res.result.response.toString();
          expect(response).to.contain('<p>test <strong>test</strong> test</p>');
          expect(response).to.contain('<style>');

          done();
        });
      });
    });
  });

  lab.it('does not inline styles when rendering text format', (done) => {
    const server = new Hapi.Server();
    server.connection();

    server.route({
      method: 'POST',
      path: '/',
      handler: function(request, reply) {
        const data = {
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

        const Mailer = request.server.plugins.mailer;
        Mailer.send(data, (err, info) => reply(info));
      }
    });

    const HapiMailer = {
      register: require('..'),
      options: {
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
      }
    };

    server.register([HapiMailer, Vision], (err) => {
      expect(err).to.not.exist();

      server.initialize((err) => {
        expect(err).to.not.exist();

        server.inject({ method: 'POST', url: '/' }, (res) => {
          expect(res.result).to.be.an.object();

          const response = res.result.response.toString();
          expect(response).to.contain('test test test');

          done();
        });
      });
    });
  });
});
