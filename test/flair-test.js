var should = require('should')
, supertest = require('supertest')
, express = require('express')
, flair = require('../index')
;

describe('flair', function() {
  describe('#swagger', function() {
    var app = flair.swagger(express());

    it('should expect an express app to document', function() {
      (function() { flair.swagger() }).should.throw();
    });

    it('should return an express app', function() {
      app.should.be.a('function');
      app.use.should.be.a('function');
      app.get.should.be.a('function');
      app.post.should.be.a('function');
      app.put.should.be.a('function');
    });

    it('should respond with a swagger-compliant json doc', function(done) {
      supertest(app)
        .get('/')
        .set('Content-Type', 'application/json')
        .expect('Content-Type', 'application/json; charset=utf-8')
        .expect(200)
        .end(function(err, res) {
          if (err) {
            done(err);
          }
          res.body.should.have.property('apiVersion').equal('1.0');
          res.body.should.have.property('swaggerVersion').equal('1.1');
          res.body.should.have.property('basePath').equal('/');
          res.body.should.have.property('apis');
          done();
        });
    });

    describe('when provided with an api version', function() {
      var app = flair.swagger(express(), { version: "0.5" });
      
      it('should respond with that version', function(done) {
        supertest(app)
          .get('/')
          .set('Content-Type', 'application/json')
          .expect(200)
          .end(function(err, res) {
            res.body.apiVersion.should.equal('0.5');
            done(err);
          });
      });
    });

    describe('when provided with a base path', function() {
      var app = flair.swagger(express(), { basePath: "/pants" });
      
      it('should respond with that version and basePath', function(done) {
        supertest(app)
          .get('/')
          .set('Content-Type', 'application/json')
          .expect(200)
          .end(function(err, res) {
            res.body.basePath.should.equal("/pants");
            done(err);
          });
      });
    });

    describe('when a route has been described', function() {
      var app = express(), flairedApp;
      app.get(
        '/pants', 
        flair.describe("short pants", "longer pants"),
        function (req, res) {
          res.send("I'm still here.");
        }
      );
      
      flairedApp = flair.swagger(app);

      it('should include the top-level resource path in the apis array', function(done) {
        supertest(flairedApp)
          .get('/')
          .set('Content-Type', 'application/json')
          .expect(200)
          .end(function(err, res) {
            res.body.apis.should.have.length(1);
            res.body.apis[0].path.should.equal('pants');
            res.body.apis[0].description.should.equal('none');
            done(err);
          });
      });

    });

  });
});
