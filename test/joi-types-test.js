"use strict";
/* jshint expr:true */
var should = require('should')
  , flair = require('../lib/index')
  , joi = flair.joi
  ;

describe('flair', function() {
  describe('#validate', function() {

    var validate = flair.validate({
      thing: joi.types.String().notes("path").description("it's a thing"),
      whatsit: joi.types.String()
    }).swaggerInfo;

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

    describe('joi integers/longs', function() {
      var intValidator = flair.validate({
        thing: joi.types.Number().integer().min(1).max(10).required(),
        another: joi.types.Number().integer().valid(1, 3, 5, 7)
      }).swaggerInfo;

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
        intValidator.params[0].required.should.equal(true);
        intValidator.params[1].required.should.equal(false);
      });
      it('should pick up allowable values', function() {
        intValidator.params[1].allowableValues.should.eql({
          valueType: "LIST",
          values: [ 7, 5, 3, 1 ]
        });
      });
    });

    describe('joi strings', function() {
      var stringValidator = flair.validate({
        thing: joi.types.String().required(),
        another: joi.types.String().valid("cheese", "biscuits")
      }).swaggerInfo;

      it('should be converted to swagger params', function() {
        stringValidator.params[0].dataType.should.equal("string");
        stringValidator.params[0].paramType.should.equal("query");
        stringValidator.params[0].name.should.equal("thing");
      });
      it('should pick up required and optional', function() {
        stringValidator.params[0].required.should.equal(true);
        stringValidator.params[1].required.should.equal(false);
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
      }).swaggerInfo;

      it('should be converted to swagger params', function() {
        booleanValidator.params[0].dataType.should.equal("boolean");
        booleanValidator.params[0].paramType.should.equal("query");
        booleanValidator.params[0].name.should.equal("thing");
      });
      it('should pick up required and optional', function() {
        booleanValidator.params[0].required.should.equal(false);
        booleanValidator.params[1].required.should.equal(true);
      });
    });

    describe('joi floats/doubles', function() {
      var doubleValidator = flair.validate({
        thing: joi.types.Number().float().required(),
        another: joi.types.Number().float().min(0).max(1),
        onemore: joi.types.Number().float().valid(0.25, 0.5, 0.75)
      }).swaggerInfo;

      it('should be converted to swagger params', function() {
        doubleValidator.params[0].dataType.should.eql("double");
        doubleValidator.params[0].paramType.should.eql("query");
        doubleValidator.params[0].name.should.eql("thing");
      });
      it('should pick up required and optional', function() {
        doubleValidator.params[0].required.should.equal(true);
        doubleValidator.params[1].required.should.equal(false);
        doubleValidator.params[2].required.should.equal(false);
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
      }).swaggerInfo;

      it('should be converted to swagger params', function() {
        dateValidator.params[0].dataType.should.equal("Date");
      });
      it('should pick up required and optional', function() {
        dateValidator.params[0].required.should.equal(false);
        dateValidator.params[1].required.should.equal(true);
      });
    });

    describe('Array', function() {
      var validate = flair.validate({
        list: joi.types.Array(),
        another: joi.types.Array().description("more things").required(),
        onemore: joi.types.Array().includes(joi.types.Number().integer()),
        specificValues: joi.types.Array().includes(
          joi.types.String().valid('cheese', 'biscuits', 'lemons')
        ),
        minMax: joi.types.Array().includes(
          joi.types.Number().integer().min(5).max(20)
        )
      }).swaggerInfo;

      it('should pick up multiple values with sensible defaults', function() {
        validate.params[0].should.eql({
          dataType: "string",
          paramType: "query",
          name: "list",
          description: "",
          required: false,
          allowMultiple: true
        });
      });

      it('should pick up required', function() {
        validate.params[1].required.should.equal(true);
        validate.params[0].required.should.equal(false);
      });

      it('should pick up description', function() {
        validate.params[1].description.should.equal('more things');
      });


      /*
       These two tests are pending, waiting for joi to handle Array
       constraints properly
       */
      it('should pick up the data type'/*, function() {
       validate.params[0].dataType.should.equal('string');
       validate.params[1].dataType.should.equal('string');
       validate.params[2].dataType.should.equal('int');
       validate.params[3].dataType.should.equal('string');
       }*/);

      it('should pick up allowableValues'/*, function() {
       validate.params[3].allowableValues.should.eql({
       valueType: "LIST",
       values: [ 'cheese', 'biscuits', 'lemons' ]
       });
       }*/);
    });

  });
});
