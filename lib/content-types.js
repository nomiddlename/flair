"use strict";
var jsv = require('JSV').JSV.createEnvironment()
, contentTypes = {};

exports.consumes = consumes;
exports.produces = produces;
exports.addContentType = addContentType;
exports.addContentTypes = addContentTypes;

function consumes() {
  var types = Array.prototype.slice.call(arguments)
  , middleware = makeConsumeMiddleware(types);

  middleware.consumes = types;
  middleware.params = [{
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
  }];
  middleware.models = [];
  middleware.errorResponses = [
    { code: 400, reason: "Invalid content-type" }
  ];
  types.forEach(function(type) {
    if (contentTypes[type]) {
      middleware.params.push({
        paramType: "body",
        description: "Request body (" + type + ")",
        dataType: contentTypes[type].id,
        required: true,
        allowMultiple: false
      });
      middleware.models.push(contentTypes[type]);
      middleware.errorResponses.push({
        code: 400,
        reason: "Body does not match schema for " + type
      });
    } else {
      middleware.params.push({
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
      return res.send(400, { error: "No request body specified" });
    }
    var report = jsv.validate(
      req.body, 
      contentTypes[mime]
    );
    if (report.errors.length > 0) {
      res.send(400, { 
        error: 'Body does not match schema for ' + mime, 
        errors: report.errors 
      });
      return;
    }
  }
  next();
}

function makeConsumeMiddleware(types) {
  return function consumesMiddleware(req, res, next) {

    if (req.header('content-type')) {

      var mime = req.header('content-type').split(';')[0];

      if (types.indexOf(mime) > -1) {
        req.mime = req.mime || mime;
        validateAgainstSchema(mime, req, res, next);
      } else {
        res.send(400, { error: 'Invalid content-type: ' + mime });
      }
    } else {
      res.send(400, { error: 'No content-type specified' });
    }
  };
}

function produces() {
  var types = Array.prototype.slice.call(arguments)
  , middleware = function producesMiddleware(req, res, next) {
    res.set('content-type', types[0]);
    next();
  };

  middleware.produces = types;
  middleware.models = [];
  types.forEach(function(type) {
    if (contentTypes[type]) {
      middleware.models.push(contentTypes[type]);
      middleware.responseClass = contentTypes[type].id;
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
