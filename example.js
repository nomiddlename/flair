var express = require('express')
, flair = require('./index')
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

app.get(
  '/cheese/:id',
  flair.describe("getCheese", "Get cheese", "Returns a single cheese, selected by id"),
  flair.validate([
    flair.pathParam("id").info("cheese id").integer()
  ]),
  function(req, res) {
    var cheese = cheeses.filter(byId(req.param("id")))[0];
    if (cheese) {
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
