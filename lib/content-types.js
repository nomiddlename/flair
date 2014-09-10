"use strict";
var jsonschema = require('jsonschema')
  , contentTypes = {};

exports.consumes = consumes;
exports.produces = produces;
exports.addContentType = addContentType;
exports.addContentTypes = addContentTypes;

function consumes() {
  var types = Array.prototype.slice.call(arguments)
    , middleware = makeConsumeMiddleware(types);

  middleware.swaggerInfo = {
    consumes: types,
    params: [
      {
        paramType: "header",
        name: "Content-Type",
        description: "The format of the request body",
        dataType: "string",
        required: true,
        allowMultiple: false,
        allowableValues: {
          valueType: "LIST",
          values: types
        }
      }
    ],
    models: [],
    errorResponses: [
      { code: 400, reason: "Invalid content-type" }
    ]
  };
  types.forEach(function(type) {
    if (contentTypes[type]) {
      middleware.swaggerInfo.params.push({
        paramType: "body",
        description: "Request body (" + type + ")",
        dataType: contentTypes[type].id,
        required: true,
        allowMultiple: false
      });
      middleware.swaggerInfo.models.push(contentTypes[type]);
      middleware.swaggerInfo.errorResponses.push({
        code: 400,
        reason: "Body does not match schema for " + type
      });
    } else {
      middleware.swaggerInfo.params.push({
        paramType: "body",
        description: "Request body (" + type + ")",
        dataType: "string",
        required: false,
        allowMultiple: false
      });
    }
  });
  return middleware;
}

function validateAgainstSchema(mime, req, res, next) {
  if (contentTypes[mime]) {
    if (!req.body) {
      return res.status(400).send({ error: "No request body specified" });
    }
    var errors = jsonschema.validate(
      req.body,
      contentTypes[mime]
    );
    if (errors.length > 0) {
      res.status(400).send({
        error: 'Body does not match schema for ' + mime,
        errors: errors
      });
      return;
    }
  }
  next();
}

function makeConsumeMiddleware(types) {
  return function swaggerConsumes(req, res, next) {

    if (req.header('content-type')) {

      var mime = req.header('content-type').split(';')[0];

      if (types.indexOf(mime) > -1) {
        req.mime = req.mime || mime;
        validateAgainstSchema(mime, req, res, next);
      } else {
        res.status(400).send({ error: 'Invalid content-type: ' + mime });
      }
    } else {
      res.status(400).send({ error: 'No content-type specified' });
    }
  };
}

function produces() {
  var types = Array.prototype.slice.call(arguments)
    , middleware = function swaggerProduces(req, res, next) {
      res.set('content-type', types[0]);
      next();
    };

  middleware.swaggerInfo = {
    produces: types,
    models: []
  };
  types.forEach(function(type) {
    if (contentTypes[type]) {
      middleware.swaggerInfo.models.push(contentTypes[type]);
      middleware.swaggerInfo.responseClass = contentTypes[type].id;
    }
  });
  return middleware;
}

function addContentType(type, schema) {
  contentTypes[type] = schema;
}

function addContentTypes(list) {
  list.forEach(function(thing) {
    addContentType(thing.type, thing.schema);
  });
}
