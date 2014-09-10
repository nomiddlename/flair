"use strict";
var should = require('should')
  , supertest = require('supertest')
  , express = require('express')
  , flair = require('../lib/index');

describe('flair', function() {
  describe('#consumes', function() {
    var app = express();

    app.post(
      '/consumes-test',
      flair.consumes('application/json'),
      function(req, res) {
        res.send("Yay!");
      }
    );

    it('should return 400 when a request without a content-type is made', function(done) {
      supertest(app)
        .post("/consumes-test")
        .expect(400, { error: 'No content-type specified' }, done);
    });
  });

  describe('#consumes with a defined schema', function() {
    var app = express();

    flair.addContentType(
      'application/consume-thing+json',
      { id: "thingy", type: "object" }
    );

    app.post(
      '/consumes-test',
      flair.consumes('application/consume-thing+json'),
      function(req, res) {
        res.send("Whatever");
      }
    );

    it('should return a 400 if no body is provided', function(done) {
      supertest(app)
        .post('/consumes-test')
        .set('Content-Type', 'application/consume-thing+json')
        .expect(400, { error: "No request body specified" }, done);
    });
  });


});
