var should = require('should')
, supertest = require('supertest')
, express = require('express')
, flair = require('../index');

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
});
