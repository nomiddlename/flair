var express = require('express')
, joi = require('joi')
, jsv = require('JSV').JSV.createEnvironment()
, path = require('path')
, contentTypes = {};

exports.swagger = swagger;
exports.describe = describe;
exports.validate = validate;
exports.consumes = consumes;
exports.produces = produces;
exports.addContentType = addContentType;
exports.clearContentTypes = clearContentTypes;
exports.jsonBodyParser = jsonBodyParser;
exports.joi = joi;

function api(options, routes) {
  var docs = []
  , doc = makeBaseDoc(options)
  , apiPaths = []
  , apis = {}
  , docPath = (options && options.docPath) || '/api-doc';

  routes.forEach(function(route) {
    var base = route.path.split('/')[1]
    , apiPath = path.normalize(path.join(docPath, base));
    if (apiPaths.indexOf(apiPath) < 0) {
      apiPaths.push(apiPath);
      apis[base] = [ route ];
    } else {
      apis[base].push(route);
    }
  });

  doc.apis = apiPaths.map(function(path) { 
    return {
      path: path,
      description: "none"
    };
  });

  docs.push({ path: docPath, doc: doc });
  
  return docs.concat(makeApis(docPath, options, apis)); 
}

function byPath(a, b) {
  return a.path.localeCompare(b.path);
}

function makeApis(docPath, options, apis) {
  var apiList = [];
  Object.keys(apis).forEach(function(resPath) {
    var routes = apis[resPath]
    , doc = makeBaseDoc(options)
    , apiEntry = { path: path.normalize(path.join(docPath, resPath)), doc: doc };

    doc.resourcePath = "/" + resPath.replace(/:(\w+)/g, "{$1}");
    doc.apis = routes.map(routeToApi).sort(byPath).reduce(function(accum, current) {
      var previous = accum[accum.length - 1];
      if (previous && previous.path === current.path) {
        previous.operations = previous.operations.concat(current.operations);        
      } else {
        accum.push(current);
      }
      return accum;
    }, []);
    doc.models = {};
    routes
      .map(models) //convert to array of models
      .reduce(function(a,b) { return a.concat(b); }, []) //flatten
      .forEach(function(model) {
        doc.models[model.id] = model;
      });
    apiList.push(apiEntry);
  });

  return apiList;
}

function routeToApi(route) {
  var api = { 
    path: route.path.replace(/:(\w+)/g, "{$1}"),
    description: shortDescription(route),
    operations: [{
      httpMethod: route.method.toUpperCase(),
      notes: longDescription(route),
      nickname: nickname(route),
      parameters: parameters(route),
      errorResponses: errorResponses(route),
      consumes: consumesArray(route),
      produces: producesArray(route),
      responseClass: responseClass(route)
    }]
  };

  return api;
}

function findDescription(type, route) {
  return find(type, route, "");
}

function findArray(type, route) {
  var result = [];
  route.callbacks.forEach(function(cb) {
    if (cb[type]) {
      result = result.concat(cb[type]);
    }
  });
  return result;
}

function find(type, route, defaultValue) {
  var result = defaultValue;
  route.callbacks.forEach(function(cb) {
    if (cb[type]) {
      result = cb[type];
    }
  });
  return result;
}

function models(route) {
  return findArray("models", route);
}

function responseClass(route) {
  return findDescription("responseClass", route);
}

function nickname(route) {
  return findDescription("nickname", route);
}

function parameters(route) {
  return findArray("params", route);
}

function errorResponses(route) {
  return findArray("errorResponses", route);
}

function shortDescription(route) {
  return findDescription("shortDescription", route);
}

function longDescription(route) {
  return findDescription("longDescription", route);
}

function consumesArray(route) {
  return findArray("consumes", route);
}

function producesArray(route) {
  return findArray("produces", route);
}
  
function makeBaseDoc(options) {
  return {
    apiVersion: ((options && options.version) || "1.0"),
    swaggerVersion: "1.1",
    basePath: ((options && options.basePath) || "/"),
    apis: []
  };
}

function routeWithDescription(route) {
  return route.callbacks.filter(function(cb) { return cb.nickname; }).length > 0;
}

function documentedRoutes(app) {
  var routes = [];
  
  Object.keys(app.routes).forEach(function(method) {
    var interestingRoutes = app.routes[method].filter(routeWithDescription);
    routes = routes.concat(interestingRoutes);
  });

  return routes;
}

function swagger(appToDocument, options) {
  if (!(appToDocument && Object.keys(appToDocument.routes).length)) {
    throw new Error("Either you didn't pass in an express app, or that app had no routes defined");
  }

  var app = express()
  , apiDocs = api(options, documentedRoutes(appToDocument));

  apiDocs.forEach(function(apiDoc) {
    app.get(apiDoc.path, function(req, res) {
      res.json(apiDoc.doc);
    });
  });

  return app;
}

function describe(nickname, shortDescription, longDescription) {
  var middleware = function describeMiddleware(req, res, next) { next(); };
  middleware.nickname = nickname;
  middleware.shortDescription = shortDescription;
  middleware.longDescription = longDescription;

  return middleware;
}

function makeValidator(schema) {
  return function paramValidator(req, res, next) {
    var errors = joi.validate(req.params, schema);
    if (errors) {
      res.send(400, { error: errors.message });
    } else {
      next();
    }
  };
}

function minOrMax(swagger, joiType, index, minOrMax) {
  swagger.allowableValues = swagger.allowableValues || {};
  swagger.allowableValues.valueType = "RANGE";
  swagger.allowableValues[minOrMax] = joiType.__args[index][0];
}

var converters = {
  "float": function(swagger) { swagger.dataType = "double"; },
  "integer": function(swagger) { swagger.dataType = "int"; },
  "date": function(swagger) { swagger.dataType = "Date"; },
  "min": minOrMax,
  "max": minOrMax
};

function convertJoiTypesToSwagger(schema) {
  var params = [];
  Object.keys(schema).forEach(function(param) {
    var joiType = schema[param]
    , swaggerParam = {
      paramType: (typeof joiType.notes == 'string' ? joiType.notes : "query"),
      name: param,
      description: (typeof joiType.description == 'string' ? joiType.description : "")
    };


    if (joiType.type === "String") {
      swaggerParam.dataType = "string";
    }

    if (joiType.type === "Boolean") {
      swaggerParam.dataType = "boolean";
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


function validate(schema) {
  var middleware = makeValidator(schema);
  middleware.params = convertJoiTypesToSwagger(schema);
  middleware.errorResponses = [
    { code: 400, reason: "Invalid parameters specified" }
  ];
  return middleware;
}

function consumes() {
  var types = Array.prototype.slice.call(arguments)
  , middleware = function consumesMiddleware(req, res, next) {

    if (types.indexOf(req.header('content-type')) > -1) {
      if (contentTypes[req.header('content-type')]) {
        if (!req.body) {
          return next(new Error("Missing req.body for " + req.path));
        }
        var report = jsv.validate(
          req.body, 
          contentTypes[req.header('content-type')]
        );
        if (report.errors.length > 0) {
          res.send(400, { 
            error: 'Body does not match schema for ' + req.header('content-type'), 
            errors: report.errors 
          });
          return;
        }
      }
      next();
    } else {
      res.send(400, { error: 'Invalid content-type' });
    }
  };

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

function clearContentTypes() {
  contentTypes = {};
}

//Does the same as express.bodyParser, just for content types other
//than application/json. Will be used for any mime type that is
//"application/<something>+json". Can (and should) be used in addition
//to express.bodyParser
function jsonBodyParser() {
  function hasBody(req) {
    return 'transfer-encoding' in req.headers || 'content-length' in req.headers;
  }

  function mime(req) {
    var str = req.headers['content-type'] || '';
    return str.split(';')[0];
  }

  return function jsonBodyMiddleware(req, res, next) {
    if (req._body) return next();
    req.body = req.body || {};
    
    if (!hasBody(req)) return next();

    // check Content-Type
    if (!/application\/.*\+json/.test(mime(req))) return next();

    // flag as parsed
    req._body = true;

    // parse
    var buf = '';
    req.setEncoding('utf8');
    req.on('data', function(chunk){ buf += chunk });
    req.on('end', function(){
      buf = buf.trim();
      
      if (0 == buf.length) {
        var error = new Error("Invalid json, empty body");
        error.status = 400;
        return next(error);
      }
        
      try {
        req.body = JSON.parse(buf);
      } catch (err){
        err.body = buf;
        err.status = 400;
        return next(err);
      }
      next();
    });
  };
}
