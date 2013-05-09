var express = require('express')
, flair = require('./index')
, flairui = require('flair-ui')
, app = express();

app.get(
  '/cheese',
  flair.describe("cheeseList", "All cheeses", "Returns all the cheeses"),
  function(req, res) {
    res.json([ 'edam', 'gouda', 'cheddar', 'emmental' ]);
  }
);

app.use(flair.swagger(app, { 
  docPath: '/api-docs', 
  basePath: "http://localhost:3000/", 
  version: '0.1' 
}));
app.use('/docs', flairui('/api-docs'));
app.listen(3000);
