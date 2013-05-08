var express = require('express');

exports.swagger = swagger;

function api() {
  return {
    apiVersion: "1.0",
    swaggerVersion: "1.1",
    basePath: "/",
    apis: []
  };
}

function swagger() {
  var app = express();
  app.get('/', function(req, res) {
    res.json(api());
  });
  
  return app;
}

