"use strict";
var joi = require('joi');

function makeValidator(originalSchema) {
  var schema = convertHeadersToLowerCase(originalSchema);

  return function swaggerValidation(req, res, next) {
    var errors = joi.validate(
      onlySchemaFields(merge(req.params, req.query, req.headers), schema),
      schema
    );
    if (errors) {
      res.status(400).send({
        error: errors.message,
        details: "http://www.youtube.com/watch?v=WOdjCb4LwQY"
      });
    } else {
      next();
    }
  };
}

function convertHeadersToLowerCase(schema) {
  var converted = copyProperties({}, schema);
  Object.keys(converted).forEach(function(key) {
    var joiType = schema[key];
    if (joiType.notes === 'header') {
      if (key !== key.toLowerCase()) {
        converted[key.toLowerCase()] = joiType;
        delete converted[key];
      }
    }
  });
  return converted;
}

function onlySchemaFields(obj, schema) {
  Object.keys(obj).forEach(function(key) {
    if (!schema.hasOwnProperty(key)) {
      delete obj[key];
    }
  });
  return obj;
}

function copyProperties(dest, source) {
  Object.keys(source).forEach(function(property) {
    dest[property] = source[property];
  });
  return dest;
}

function merge() {
  var toMerge = Array.prototype.slice.call(arguments);
  return toMerge.reduce(copyProperties, {});
}

function minOrMax(swagger, joiType, index, minOrMaxLabel) {
  swagger.allowableValues = swagger.allowableValues || {};
  swagger.allowableValues.valueType = "RANGE";
  swagger.allowableValues[minOrMaxLabel] = joiType.__args[index][0];
}

var converters = {
  "float": function(swagger) { swagger.dataType = "double"; },
  "integer": function(swagger) { swagger.dataType = "int"; },
  "date": function(swagger) { swagger.dataType = "Date"; },
  "min": minOrMax,
  "max": minOrMax
};

function mapToSwaggerType(joiType) {
  var map = {
    'String': 'string',
    'Boolean': 'boolean',
    'Array': 'string'
  };
  return map[joiType] || joiType;
}

function convertJoiTypesToSwagger(schema) {
  var params = [];
  Object.keys(schema).forEach(function(param) {
    var joiType = schema[param]
    , swaggerParam = {
      dataType: mapToSwaggerType(joiType.type),
      paramType: (typeof joiType.notes == 'string' ? joiType.notes : "query"),
      name: param,
      description: (typeof joiType.description == 'string' ? joiType.description : "")
    };

    if (joiType.type === "Array") {
      swaggerParam.allowMultiple = true;
    }

    joiType.__checks.forEach(function(check, index) {
      if (converters[check]) {
        converters[check](swaggerParam, joiType, index, check);
      }
    });

    if (joiType.__valids._values.indexOf(undefined) > -1) {
      swaggerParam.required = false;
    }

    joiType.__valids._values.forEach(function(validValue) {
      if (validValue !== undefined) {
        swaggerParam.allowableValues = swaggerParam.allowableValues || {};
        swaggerParam.allowableValues.valueType = "LIST";
        swaggerParam.allowableValues.values = swaggerParam.allowableValues.values || [];
        swaggerParam.allowableValues.values.push(validValue);
      }
    });

    swaggerParam.required = (joiType.__modifiers._values.indexOf("required") > -1);

    if (swaggerParam.paramType !== "query") {
      swaggerParam.required = true;
      swaggerParam.allowMultiple = false;
    }

    params.push(swaggerParam);
  });

  return params;
}

module.exports = function validate(schema) {
  var middleware = makeValidator(convertHeadersToLowerCase(schema));

  middleware.swaggerInfo = {
      params: convertJoiTypesToSwagger(schema),
        errorResponses: [
            { code: 400, reason: "Invalid parameters specified" }
        ]
      };
  return middleware;
};

module.exports.joi = joi;
