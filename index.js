var express = require('express')
, path = require('path');

exports.swagger = swagger;
exports.describe = describe;

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

function makeApis(docPath, options, apis) {
  var apiList = [];
  Object.keys(apis).forEach(function(resPath) {
    var routes = apis[resPath]
    , doc = makeBaseDoc(options)
    , apiEntry = { path: path.normalize(path.join(docPath, resPath)), doc: doc };

    doc.resourcePath = "/" + resPath.replace(/:(\w+)/g, "{$1}");
    doc.apis = routes.map(routeToApi);
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
      nickname: nickname(route)
    }]
  };

  return api;
}

function findDescription(type, route) {
 var desc = "";
  route.callbacks.forEach(function(cb) {
    if (cb[type]) {
      desc = cb[type];
    }
  });
  return desc;
}

function nickname(route) {
  return findDescription("nickname", route);
}

function shortDescription(route) {
  return findDescription("shortDescription", route);
}

function longDescription(route) {
  return findDescription("longDescription", route);
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
  var middleware = function(req, res, next) { next(); };
  middleware.nickname = nickname;
  middleware.shortDescription = shortDescription;
  middleware.longDescription = longDescription;

  return middleware;
}

