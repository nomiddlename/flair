var should = require('should')
, supertest = require('supertest')
, express = require('express')
, joi = require('joi')
, flair = require('../index')
;

describe('flair', function() {
  describe('#swagger', function() {
    var appToDescribe = express()
    , app;

    //must have at least one route defined
    appToDescribe.get('/something', function() {});
    app = flair.swagger(appToDescribe);

    it('should expect an express app to document', function() {
      (function() { flair.swagger(); }).should.throw();
    });

    it('should expect an express app with routes', function() {
      (function() { flair.swagger(express()); }).should.throw();
    });

    it('should not return anything if there are no described routes', function() {
      supertest(app)
        .get('/api-doc')
        .expect(404);
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
        .get('/api-doc')
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
      var app = flair.swagger(appToDescribe, { version: "0.5" });
      
      it('should respond with that version', function(done) {
        supertest(app)
          .get('/api-doc')
          .set('Content-Type', 'application/json')
          .expect(200)
          .end(function(err, res) {
            res.body.apiVersion.should.equal('0.5');
            done(err);
          });
      });
    });

    describe('when provided with a docPath', function() {
      var app = flair.swagger(appToDescribe, { docPath: '/something' });

      it('should not respond on the default path', function(done) {
        supertest(app)
          .get('/api-doc')
          .expect(404, done);
      });
      
      it('should respond on the docPath', function(done) {
        supertest(app)
          .get('/something')
          .expect(200, done);
      });
    });

    describe('when provided with a base path', function() {
      var app = flair.swagger(appToDescribe, { basePath: "/pants" });
      
      it('should respond with that version and basePath', function(done) {
        supertest(app)
          .get('/api-doc')
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
          .get('/api-doc')
          .set('Content-Type', 'application/json')
          .expect(200)
          .end(function(err, res) {
            res.body.apis.should.have.length(1);
            res.body.apis[0].path.should.equal('/api-doc/pants');
            res.body.apis[0].description.should.equal('none');
            done(err);
          });
      });

      it('should still call the handler', function(done) {
        supertest(app)
          .get('/pants')
          .expect(200, "I'm still here.", done);
      });

      it('should expose the resource docs on api.path', function(done) {
        supertest(flairedApp)
          .get('/api-doc/pants')
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
          .get('/api-doc')
          .end(function(err, res) {
            res.body.apis.filter(function(api) {
              return api.path === '/api-doc/notdescribed';
            }).should.be.empty;
            done();
          });
      });

      it('should only include the base path once', function(done) {
        supertest(flairedApp)
          .get('/api-doc')
          .end(function(err, res) {
            res.body.apis.should.have.length(1);
            res.body.apis[0].path.should.equal('/api-doc/pants');
            done();
          });
      });
    });

    describe('when a route with path params is described', function() {
      var app = express(), flairedApp;

      app.get(
        '/pants/:id',
        flair.describe("getPants", "short pants", "long pants"),
        flair.validate({
          id: joi.types.Number().integer().required().notes("path").description("pant id")
        }),
        function(req, res) {
          res.send('blah');
        }
      );
      flairedApp = flair.swagger(app);

      it('should describe the route path correctly', function(done) {
        supertest(flairedApp)
          .get('/api-doc/pants')
          .end(function(err, res) {
            res.body.apis[0].path.should.equal('/pants/{id}');
            res.body.apis[0].operations[0].parameters.should.have.length(1);
            res.body.apis[0].operations[0].parameters[0].should.eql({
              paramType: "path",
              name: "id",
              description: "pant id",
              dataType: "integer",
              required: true,
              allowMultiple: false
            });
            done(err);
          });
      });

      it('should validate the parameters', function(done) {
        supertest(app)
          .get('/pants/cheese')
          .expect(400, { error: "not valid" }, done);
      });

      it('should allow valid parameters', function(done) {
        supertest(app)
          .get('/pants/1')
          .expect(200, 'blah', done);
      });
      
      it('should add a 400 bad request to the error responses', function(done) {
        supertest(flairedApp)
          .get('/api-doc/pants')
          .end(function(err, res) {
            res.body.apis[0].operations[0].errorResponses.should.have.length(1);
            res.body.apis[0].operations[0].errorResponses[0].code.should.equal(400);
            res.body.apis[0].operations[0].errorResponses[0].reason.should.equal('Invalid parameters specified');
            done(err);
          });
      });
      
      
    });

  });
});
