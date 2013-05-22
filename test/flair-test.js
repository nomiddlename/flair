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
              dataType: "int",
              required: true,
              allowMultiple: false
            });
            done(err);
          });
      });

      it('should validate the parameters', function(done) {
        supertest(app)
          .get('/pants/cheese')
          .expect(400, { 
            error: "not valid", 
            details: "http://www.youtube.com/watch?v=WOdjCb4LwQY" 
          }, done);
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

    describe('when an app with multiple operations on a resource is described', function() {
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
      app.put(
        '/pants/:id',
        flair.describe("updatePants", "short pants", "long pants"),
        flair.validate({
          id: joi.types.Number().integer().required().notes("path").description("pant id")
        }),
        function(req, res) {
          res.send('blah too');
        }
      );
      flairedApp = flair.swagger(app);

      it('should group the operations under the resource path', function(done) {
        supertest(flairedApp)
          .get('/api-doc/pants')
          .end(function(err, res) {
            res.body.apis[0].operations.should.have.length(2);
            res.body.apis[0].operations[1].httpMethod.should.equal("PUT");
            res.body.apis[0].operations[1].nickname.should.equal("updatePants");
            done(err);
          });
      });
    });

    describe('when an app with a content type is described', function() {
      var app = express(), flairedApp;

      app.post(
        '/pants',
        flair.describe("newPants", "short pants", "long pants"),
        flair.consumes("application/vnd.custom+json", "application/vnd.custom2+json"),
        flair.produces("application/vnd.custom+json"),
        function(req, res) {
          res.json({id: 1, name: "pants"});
        }
      );
      flairedApp = flair.swagger(app);

      it('should return 400 for an invalid content-type request header', function(done) {
        supertest(app)
          .post('/pants')
          .set('Content-Type', 'application/json')
          .expect(400, done);
      });

      it('should accept valid content-type request headers', function(done) {
        supertest(app)
          .post('/pants')
          .set('Content-Type', 'application/vnd.custom+json')
          .expect(200, function(err, res) {
            if (err) {
              done(err);
            } else {
              supertest(app)
                .post('/pants')
                .set('Content-Type', 'application/vnd.custom2+json')
                .expect(200, done);
            }
          });
      });
      
      it('should set the consumes value of the operation', function(done) {
        supertest(flairedApp)
          .get('/api-doc/pants')
          .expect(200, function(err, res) {
            res.body.apis[0].operations[0].consumes.should.have.length(2);
            res.body.apis[0].operations[0].consumes.should.include('application/vnd.custom+json');
            res.body.apis[0].operations[0].consumes.should.include('application/vnd.custom2+json');
            done(err);
          });
      });

      it('should add the content-type headers to the parameters of the operation', function(done) {
        supertest(flairedApp)
          .get('/api-doc/pants')
          .expect(200, function(err, res) {
            res.body.apis[0].operations[0].parameters.should.includeEql({
              paramType: "header",
              name: "Content-Type",
              description: "The format of the request body",
              dataType: "string",
              required: true,
              allowMultiple: false,
              allowableValues: {
                valueType: "LIST",
                values: [
                  "application/vnd.custom+json", "application/vnd.custom2+json"
                ]
              }
            });
            done(err);
          });
      });

      it('should add a body parameter for each value of consumes', function(done) {
        supertest(flairedApp)
          .get('/api-doc/pants')
          .expect(200, function(err, res) {
            res.body.apis[0].operations[0].parameters.should.includeEql({
              paramType: "body",
              description: "Request body (application/vnd.custom+json)",
              dataType: "string",
              required: false,
              allowMultiple: false
            });
            res.body.apis[0].operations[0].parameters.should.includeEql({
              paramType: "body",
              description: "Request body (application/vnd.custom2+json)",
              dataType: "string",
              required: false,
              allowMultiple: false
            });
            done(err);
          });
      });

      it('should set the produces value of the operation', function(done) {
        supertest(flairedApp)
          .get('/api-doc/pants')
          .expect(200, function(err, res) {
            res.body.apis[0].operations[0].produces.should.have.length(1);
            res.body.apis[0].operations[0].produces[0].should.equal('application/vnd.custom+json');
            done(err);
          });
      });

      it('should add a 400 bad request to the errorResponses', function(done) {
        supertest(flairedApp)
          .get('/api-doc/pants')
          .expect(200, function(err, res) {
            res.body.apis[0].operations[0].errorResponses.should.have.length(1);
            res.body.apis[0].operations[0].errorResponses[0].should.eql({ code: 400, reason: 'Invalid content-type' });
            done(err);
          });
      });
    });

    describe('when an app with a body schema is described', function() {
      var app = express(), flairedApp;

      flair.addContentType(
        "application/vnd.thing+json",
        {
          id: "thing",
          type: "object",
          properties: {
            name: {
              description: "the name of the pant",
              type: "string",
              required: true
            },
            id: {
              description: "the id of the pant",
              type: "integer",
              required: true
            }
          },
          //you need this here, otherwise null and undefined are valid
          required: true
        }
      );
      
      app.use(flair.jsonBodyParser());
      app.post(
        '/pants',
        flair.describe("newPants", "short pants", "long pants"),
        flair.consumes("application/vnd.thing+json"),
        function(req, res) {
          res.json({id: 1, name: "pants"});
        }
      );
      flairedApp = flair.swagger(app);

      it('should complain about invalid bodies', function(done) {
        supertest(app)
          .post('/pants')
          .set('Content-Type', 'application/vnd.thing+json')
          .send(JSON.stringify({ cheese: 3, name: "lumpy" }))
          .expect(400, done);
      });

      it('should accept valid bodies', function(done) {
        supertest(app)
          .post('/pants')
          .set('Content-Type', 'application/vnd.thing+json')
          .send(JSON.stringify({ id: 4, name: "lumpy" }))
          .expect(200, done);
      });

      it('should include the schema in the models section of the api', function(done) {
        supertest(flairedApp)
          .get('/api-doc/pants')
          .expect(200, function(err, res) {
            res.body.models.should.have.property("thing");
            res.body.models.thing.id.should.eql("thing");
            done(err);
          });
      });

      it('should add a body parameter to the parameters for the operation', function(done) {
        supertest(flairedApp)
          .get('/api-doc/pants')
          .expect(200, function(err, res) {
            res.body.apis[0].operations[0].parameters.should.have.length(2);
            res.body.apis[0].operations[0].parameters.should.includeEql({
              paramType: "body",
              description: "Request body (application/vnd.thing+json)",
              dataType: "thing",
              required: true,
              allowMultiple: false
            });
            done(err);
          });
      });
      
      it('should not specify the responseClass in the operation section of the api', function(done) {
        supertest(flairedApp)
          .get('/api-doc/pants')
          .expect(200, function(err, res) {
            res.body.apis[0].operations[0].responseClass.should.be.empty;
            done(err);
          });
      });

      it('should add a 400 bad request to the errorResponses', function(done) {
        supertest(flairedApp)
          .get('/api-doc/pants')
          .expect(200, function(err, res) {
            res.body.apis[0].operations[0].errorResponses.should.have.length(2);
            res.body.apis[0].operations[0].errorResponses.should.includeEql(
              { code: 400, reason: "Invalid content-type" }
            );
            res.body.apis[0].operations[0].errorResponses.should.includeEql(
              { code: 400, reason: "Body does not match schema for application/vnd.thing+json" }
            );
            done(err);
          });
      });
    });

    describe('when an app with an output schema is described', function() {

      var app = express(), flairedApp;

      flair.addContentType(
        "application/vnd.pants+json",
        {
          id: "pants",
          type: "object",
          properties: {
            pants: {
              type: "string"
            }
          }
        }
      );

      app.get(
        '/pants',
        flair.describe("getPants", "short desc", "long desc"),
        flair.produces("application/vnd.pants+json"),
        function(req, res) {
          res.json({ pants: "pants" });
        }
      );
      flairedApp = flair.swagger(app);

      it('should add the schema to the models', function(done) {
        supertest(flairedApp)
          .get('/api-doc/pants')
          .expect(200, function(err, res) {
            res.body.models.should.have.property("pants");
            done(err);
          });
      });

      it('should add a responseClass to the operation', function(done) {
        supertest(flairedApp)
          .get('/api-doc/pants')
          .expect(200, function(err, res) {
            res.body.apis[0].operations[0].responseClass.should.equal("pants");
            done(err);
          });
      });

      it('should add a produces value to the operation', function(done) {
        supertest(flairedApp)
          .get('/api-doc/pants')
          .expect(200, function(err, res) {
            res.body.apis[0].operations[0].produces.should.have.length(1);
            res.body.apis[0].operations[0].produces.should.includeEql("application/vnd.pants+json");
            done(err);
          });
      });

      it('should set the content-type of the response', function(done) {
        supertest(app)
          .get('/pants')
          .expect('Content-Type', 'application/vnd.pants+json')
          .expect(200, done);
      });

    });

    describe('#addContentTypes', function() {

      flair.addContentTypes([
        { type: "application/vnd.made-up-schema+json", schema: { id: "MadeUp", required: true } },
        { type: "application/vnd.blah-blah+json", schema: { id: "Blah", required: true } }
      ]);

      var app = express(), flairedApp;
      app.post(
        '/blah',
        flair.describe("blah", "blah", "blah"),
        flair.consumes("application/vnd.made-up-schema+json"),
        flair.produces("application/vnd.blah-blah+json"),
        function(req, res) {
          res.send("Yay!");
        }
      );
      flairedApp = flair.swagger(app);

      it('should accept an array of objects with type and schema properties', function(done) {
        supertest(flairedApp)
          .get('/api-doc/blah')
          .expect(200, function(err, res) {
            res.body.models.should.have.property("Blah");
            res.body.models.should.have.property("MadeUp");
            done(err);
          });
      });
    });

    describe('#consumes', function() {
      var app = express();
      app.post(
        '/blah',
        flair.consumes("application/vnd.something+json"),
        function(req, res) {
          res.send("Yay! " + req.mime);
        }
      );

      it('should handle request content-types with extra information', function(done) {
        supertest(app)
          .post('/blah')
          .set('Content-Type', 'application/vnd.something+json; charset=utf-8')
          .expect(200, function(err, res) {
            if (err) {
              done(err);
            } else {
              supertest(app)
                .post('/blah')
                .set('Content-Type', 'application/vnd.wrong+json; charset=utf-8')
                .expect(400, done);
            }
          });
      });

      it('should add mime to the request', function(done) {
        supertest(app)
          .post('/blah')
          .set('Content-Type', 'application/vnd.something+json; charset=utf-8')
          .expect(200, function(err, res) {
            res.text.should.include('application/vnd.something+json');
            done(err);
          });
      });
    });
  });
});
