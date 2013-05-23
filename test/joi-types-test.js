var should = require('should')
, flair = require('../lib/index')
, joi = flair.joi
;

describe('flair', function() {
  describe('#validate', function() {

    var validate = flair.validate({
      thing: joi.types.String().notes("path").description("it's a thing"),
      whatsit: joi.types.String()
    });

    it('should pick up the name from object property', function() {
      validate.params[0].name.should.equal('thing');
      validate.params[1].name.should.equal('whatsit');
    });

    it('should pick up the param type from the notes field', function() {
      validate.params[0].paramType.should.equal("path");
    });

    it('should default to a query param type if not specified', function() {
      validate.params[1].paramType.should.equal("query");
    });

    it('should use the description', function() {
      validate.params[0].description.should.equal("it's a thing");
    });

    it('should not populate description if not supplied', function() {
      validate.params[1].description.should.be.empty;
    });

    //not entirely sure what to do here.
    //but I agree, in principle.
    //array-valued items maybe?
    it('should pick up multiple values');

    describe('joi integers/longs', function() {
      var intValidator = flair.validate({
        thing: joi.types.Number().integer().min(1).max(10).required(),
        another: joi.types.Number().integer().valid(1,3,5,7)
      });

      it('should be converted to swagger params', function() {
        intValidator.params[0].dataType.should.equal("int");
        intValidator.params[0].paramType.should.equal("query");
        intValidator.params[0].name.should.equal("thing");
      });
      it('should pick up min and max', function() {
        intValidator.params[0].allowableValues.should.eql({
          valueType: "RANGE",
          min: 1,
          max: 10
        });
      });
      it('should pick up required and optional', function() {
        intValidator.params[0].required.should.be.true;
        intValidator.params[1].required.should.be.false;
      });
      it('should pick up allowable values', function() {
        intValidator.params[1].allowableValues.should.eql({
          valueType: "LIST",
          values: [ 7,5,3,1 ]
        });
      });
    });

    describe('joi strings', function() {
      var stringValidator = flair.validate({
        thing: joi.types.String().required(),
        another: joi.types.String().valid("cheese", "biscuits")
      });
      it('should be converted to swagger params', function() {
        stringValidator.params[0].dataType.should.equal("string");
        stringValidator.params[0].paramType.should.equal("query");
        stringValidator.params[0].name.should.equal("thing");
      });
      it('should pick up required and optional', function() {
        stringValidator.params[0].required.should.be.true;
        stringValidator.params[1].required.should.be.false;
      });
      it('should pick up allowed values', function() {
        stringValidator.params[1].allowableValues.should.eql({
          valueType: "LIST",
          values: [ "biscuits", "cheese" ]
        });
      });
    });

    describe('joi booleans', function() {
      var booleanValidator = flair.validate({
        thing: joi.types.Boolean(),
        another: joi.types.Boolean().required()
      });

      it('should be converted to swagger params', function() {
        booleanValidator.params[0].dataType.should.equal("boolean");
        booleanValidator.params[0].paramType.should.equal("query");
        booleanValidator.params[0].name.should.equal("thing");
      });
      it('should pick up required and optional', function() {
        booleanValidator.params[0].required.should.be.false;
        booleanValidator.params[1].required.should.be.true;
      });
    });

    describe('joi floats/doubles', function() {
      var doubleValidator = flair.validate({
        thing: joi.types.Number().float().required(),
        another: joi.types.Number().float().min(0).max(1),
        onemore: joi.types.Number().float().valid(0.25, 0.5, 0.75)
      });
      it('should be converted to swagger params', function() {
        doubleValidator.params[0].dataType.should.eql("double");
        doubleValidator.params[0].paramType.should.eql("query");
        doubleValidator.params[0].name.should.eql("thing");
      });
      it('should pick up required and optional', function() {
        doubleValidator.params[0].required.should.be.true;
        doubleValidator.params[1].required.should.be.false;
        doubleValidator.params[2].required.should.be.false;
      });
      it('should pick up min and max', function() {
        doubleValidator.params[1].allowableValues.should.eql({
          valueType: "RANGE",
          min: 0,
          max: 1
        });
      });
      it('should pick up ranges', function() {
        doubleValidator.params[2].allowableValues.should.eql({
          valueType: "LIST",
          values: [ 0.75, 0.5, 0.25 ]
        });
      });
    });

    describe('joi date', function() {
      var dateValidator = flair.validate({
        thing: joi.types.String().date(),
        another: joi.types.String().date().required()
      });

      it('should be converted to swagger params', function() {
        dateValidator.params[0].dataType.should.equal("Date");
      });
      it('should pick up required and optional', function() {
        dateValidator.params[0].required.should.be.false;
        dateValidator.params[1].required.should.be.true;
      });
    });

  });
});
