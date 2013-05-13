var express = require('express')
, flair = require('./index')
, joi = require('joi')
, flairui = require('flair-ui')
, app = express()
, cheeses = [
  { id: 1, name: 'edam' }
  , { id: 2, name: 'gouda' }
  , { id: 3, name: 'cheddar' }
  , { id: 4, name: 'emmental' }
];

function byId(value) {
  return function(item) {
    return item.id == value;
  };
}

app.get(
  '/cheese',
  flair.describe("cheeseList", "All cheeses", "Returns all the cheeses"),
  function(req, res) {
    res.json(cheeses);
  }
);

app.post(
  '/cheese',
  flair.describe("createCheese", "Create cheese", "Adds a new cheese to the system"),
  function(req, res) {
    var newCheese = req.body;
    cheeses.push(newCheese);
    res.send(201);
  }
);

app.get(
  '/cheese/:id',
  flair.describe("getCheese", "Get cheese", "Returns a single cheese, selected by id"),
  flair.validate({
    id: joi.types.Number().integer().required().notes("path").description("cheese id")
  }),
  function(req, res) {
    var cheese = cheeses.filter(byId(req.param("id")))[0];
    if (cheese) {
      res.json(cheese);
    } else {
      res.send(404);
    }
  }
);

app.put(
  '/cheese/:id',
  flair.describe("updateCheese", "Update cheese", "Update an existing cheese"),
  flair.validate({
    id: joi.types.Number().integer().required().notes("path").description("cheese id")
  }),
  function(req, res) {
    var cheese = cheeses.filter(byId(req.param("id")))[0];
    if (cheese) {
      cheese.name = req.body.name;
      res.json(cheese);
    } else {
      res.send(404);
    }
  }
);
    

app.use(flair.swagger(app, { 
  docPath: '/api-docs', 
  basePath: "http://localhost:3000/", 
  version: '0.1' 
}));
app.use('/docs', flairui('/api-docs'));
app.listen(3000);
