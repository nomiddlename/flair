flair
=====

Express module for generating swagger-format API docs

Swagger-compliant Rest API documentation generator.

NOTE: this code does not exist yet, just trying to work out the api initially :)


Example
-------

        var express = require('express');
        var flair = require('flair');
        var flairui = require('flair-ui');
        var app = express();

        app.get(
          '/fops',
          //flair.describe is the trigger for docs, no describe = no doc
          flair.describe("getFops", "Returns a list of fops"),
          //flair.validate - optional validation and description of params
          // - params that don't validate cause a 400 bad request
          flair.validateQuery([
            flair
              .param("count")
              .info("Number of results to return")
              .integer()
              .min(0).max(10)
              .optional(5),
            flair
              .param("skip")
              .info("Number of results to skip")
              .integer()
              .min(0)
              .optional(0),
            flair
              .param("sort")
              .info("Sort order")
              .values(["asc", "desc"])
              .optional("asc")
          ]),
          //produces takes a json-schema and content-type
          //sets the appropriate response header
          flair.produces(require('./schemas/list-of-fops')),
          //any other middleware could be slotted in at any point
          //...
          //finally the handler
          function(req, res, next) {
            res.send(fops.getList(req.param("count"), req.param("skip"), req.param("sort")));
          }
        );

        //makes the swagger json available on /api-doc
        app.get("/api-doc", flair.swagger(app, { version: "1.0" })); 

        //mounts the html docs and api explorer on /docs
        //(needs to know the location of swagger json - could be passed absolute url, file)
        app.get("/docs", flairui("/api-doc"));
        
        app.listen(8000);


Why not swagger-node-express, swagger-jack, etc?
------------------------------------------------
I didn't like them. Not expressy enough.

Licence
-------
BSD. 