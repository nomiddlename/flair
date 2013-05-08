var should = require('should')
, supertest = require('supertest')
, flair = require('../index');

describe('flair', function() {
  describe('#swagger', function() {
    var app = flair.swagger();

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
        done(err);
      });
    });
  });
});
