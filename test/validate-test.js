"use strict";
var should = require('should')
, supertest = require('supertest')
, express = require('express')
, flair = require('../lib/index')
, joi = flair.joi;

describe("flair", function() {
  describe("#validate", function() {
    var app = express();

    app.get(
      '/thing/:id',
      flair.validate({
        id: joi.types.Number().integer().notes("path").required(),
        size: joi.types.String().valid("small", "medium", "large"),
        "X-Men-Are-Awesome": joi.types.String().notes("header").valid("yes")
      }),
      function (req, res) {
        res.send("Yippee-skippy!");
      }
    );

    it('should reject invalid query parameters', function(done) {
      supertest(app)
        .get('/thing/123?size=not+important')
        .expect(400, done);
    });

    it('should accept valid query parameters', function(done) {
      supertest(app)
        .get('/thing/123?size=small')
        .expect(200, done);
    });

    it('should accept valid path parameters', function(done) {
      supertest(app)
        .get('/thing/123')
        .expect(200, done);
    });

    it('should reject invalid path parameters', function(done) {
      supertest(app)
        .get('/thing/lkdfj')
        .expect(400, done);
    });

    it('should reject invalid headers', function(done) {
      supertest(app)
        .get('/thing/123')
        .set('X-Men-Are-Awesome', 'No')
        .expect(400, done);
    });

    it('should accept valid headers', function(done) {
      supertest(app)
        .get('/thing/123')
        .set('X-Men-Are-Awesome', 'yes')
        .expect(200, done);
    });
  });
});
