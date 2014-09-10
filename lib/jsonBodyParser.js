"use strict";
//Does the same as express.bodyParser, just for content types other
//than application/json. Will be used for any mime type that is
//"application/<something>+json". Can (and should) be used in addition
//to express.bodyParser
module.exports = function jsonBodyParser() {
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
    req.on('data', function(chunk) {
      buf += chunk;
    });
    req.on('end', function() {
      buf = buf.trim();

      if (0 === buf.length) {
        var error = new Error("Invalid json, empty body");
        error.status = 400;
        return next(error);
      }

      try {
        req.body = JSON.parse(buf);
      } catch (err) {
        err.body = buf;
        err.status = 400;
        return next(err);
      }
      next();
    });
  };
};
