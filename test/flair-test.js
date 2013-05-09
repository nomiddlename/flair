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

    describe('when provided with a docPath', function() {
      var app = flair.swagger(express(), { docPath: '/something' });

      it('should not respond on the default path', function(done) {
        supertest(app)
          .get('/')
          .expect(404, done);
      });
      
      it('should respond on the docPath', function(done) {
        supertest(app)
          .get('/something')
          .expect(200, done);
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
        flair.describe("getPants", "short pants", "longer pants"),
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
            res.body.apis[0].path.should.equal('/pants');
            res.body.apis[0].description.should.equal('none');
            done(err);
          });
      });

      it('should not still call the handler', function(done) {
        supertest(app)
          .get('/pants')
          .expect(200, "I'm still here.", done);
      });

      it('should expose the resource docs on api.path', function(done) {
        supertest(flairedApp)
          .get('/pants')
          .expect('Content-Type', 'application/json; charset=utf-8')
          .expect(200)
          .end(function(err, res) {
            if (err) done(err);
            res.body.apiVersion.should.equal("1.0");
            res.body.swaggerVersion.should.equal("1.1");
            res.body.basePath.should.equal('/');
            res.body.resourcePath.should.equal('/pants');
            res.body.apis.should.have.length(1);
            res.body.apis[0].path.should.equal('/pants');
            res.body.apis[0].description.should.equal('short pants');
            res.body.apis[0].operations.should.have.length(1);
            res.body.apis[0].operations[0].httpMethod.should.equal('GET');
            res.body.apis[0].operations[0].notes.should.equal('longer pants');
            res.body.apis[0].operations[0].nickname.should.equal("getPants");

            done(err);
          });
      });
    });

    describe('when multiple routes have been described', function() {
      var app = express(), flairedApp;
      app.get(
        '/pants',
        flair.describe("short", "long"),
        function(req, res) {
          res.send("In pants");
        }
      );
      app.post(
        '/pants/thing',
        flair.describe("short", "long"),
        function(req, res) {
          res.send("In pants/thing");
        }
      );
      app.get(
        '/notdescribed',
        function(req, res) { res.send("not described"); }
      );
      flairedApp = flair.swagger(app);

      it('should not include the routes that are not described', function(done) {
        supertest(flairedApp)
          .get('/')
          .end(function(err, res) {
            res.body.apis.filter(function(api) {
              return api.path === '/notdescribed';
            }).should.be.empty;
            done();
          });
      });

      it('should only include the base path once', function(done) {
        supertest(flairedApp)
          .get('/')
          .end(function(err, res) {
            res.body.apis.should.have.length(1);
            res.body.apis[0].path.should.equal('/pants');
            done();
          });
      });
    });

  });
});
