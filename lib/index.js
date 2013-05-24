"use strict";
var express = require('express')
, path = require('path')
, contentTypes = require('./content-types')
;

exports.describe = require('./describe');
exports.validate = require('./validate');
exports.joi = exports.validate.joi;
exports.addContentType = contentTypes.addContentType;
exports.addContentTypes = contentTypes.addContentTypes;
exports.clearContentTypes = contentTypes.clearContentTypes;
exports.consumes = contentTypes.consumes;
exports.produces = contentTypes.produces;
exports.jsonBodyParser = require('./jsonBodyParser');
exports.swagger = swagger;

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
