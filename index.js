var express = require('express');

exports.swagger = swagger;
exports.describe = describe;

function api(options, routes) {
  var doc = {
    apiVersion: ((options && options.version) || "1.0"),
    swaggerVersion: "1.1",
    basePath: ((options && options.basePath) || "/"),
    apis: []
  },
  apiPaths = [];

  routes.forEach(function(route) {
    var base = route.path.split('/')[0];
    if (apiPaths.indexOf(base) < 0) {
      apiPaths.push(base);
    }
  });
  
  return doc; 
}

function documentedRoutes(app) {
  var routes = [];
  
  Object.keys(app.routes).forEach(function(method) {
    var interestingRoutes = app.routes[method].filter(function(route) {
      return route.callbacks.filter(function(cb) { return cb.shortDescription; });
    });
    routes.push(interestingRoutes);
  });

  return routes;
}

function swagger(appToDocument, options) {
  if (!(appToDocument && appToDocument.routes)) {
    throw new Error("Either you didn't pass in an express app, or that app had no routes defined");
  }

  var app = express()
  , apiDoc = api(options, documentedRoutes(appToDocument));

  console.log(appToDocument.routes);
 
  app.get('/', function(req, res) {
    res.json(apiDoc);
  });
  
  return app;
}

function describe(shortDescription, longDescription) {
  var middleware = function(req, res, next) { next(); };
  middleware.shortDescription = shortDescription;
  middleware.longDescription = longDescription;

  return middleware;
}

