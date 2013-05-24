"use strict";
var should = require('should')
, supertest = require('supertest')
, express = require('express')
, jsonBodyParser = require('../lib').jsonBodyParser
;

describe('flair', function() {
  describe('#jsonBodyParser', function() {
    var app = express();
    app.use(jsonBodyParser());
    app.post(
      '/thing',
      function(req, res) {
        if (req.body.message) {
          res.send("Message was: " + req.body.message);
        } else {
          res.send("Nothing to see here");
        }
      }
    );

    it('should parse the body of a correct request', function(done) {
      supertest(app)
        .post('/thing')
        .set('Content-Type', 'application/thing+json')
        .send(JSON.stringify({ message: "hello" }))
        .expect(200, "Message was: hello", done);
    });

    it('should return 400 if there is no body', function(done) {
      supertest(app)
        .post('/thing')
        .set('Content-Type', 'application/thing+json')
        .expect(400, done);
    });

    it('should return 400 if the json is invalid', function(done) {
      supertest(app)
        .post('/thing')
        .set('Content-Type', 'application/thing+json')
        .send("{ aalskdasda }")
        .expect(400, done);
    });

    it('should not try to parse things with the wrong content-type', function(done) {
      supertest(app)
        .post('/thing')
        .set('Content-Type', 'text/plain')
        .send("cheese")
        .expect(200, "Nothing to see here", done);
    });

    it('should not break if content-type is not specified', function(done) {
      supertest(app)
        .post('/thing')
        .expect(200, "Nothing to see here", done);
    });
  });

  describe('#jsonBodyParser with another bodyparser', function() {
    var app = express();
    app.use(function(req, res, next) { 
      req.body = "Im crimed it all."; 
      req._body = true; 
      next();
    });
    app.use(jsonBodyParser());
    app.post(
      '/thing',
      function(req, res) {
        res.send(req.body);
      }
    );

    it('should not mess with previous parsing', function(done) {
      supertest(app)
        .post('/thing')
        .set('Content-Type', 'application/thing+json')
        .send(JSON.stringify({ message: "This should not get parsed" }))
        .expect(200, "Im crimed it all.", done);
    });
  });

  describe('#jsonBodyParser with a get request', function() {
    var app = express();
    app.use(jsonBodyParser());
    app.get(
      '/thing',
      function(req, res) {
        res.send("req.body is unimportant");
      }
    );

    it('should not break things', function(done) {
      supertest(app)
        .get('/thing')
        .expect(200, "req.body is unimportant", done);
    });
  });
});
