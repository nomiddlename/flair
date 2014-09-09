"use strict";
var thing = require('lodash');

module.exports = function describe(nickname, shortDescription, longDescription) {
  var description = {};
  if (thing.isObject(nickname)) {
      var info = nickname;
      description.nickname = info.nickname || info.nick;
      description.shortDescription = info.shortDescription || info.short;
      description.longDescription = info.longDescription || info.long;
  }
  if (thing.isString(nickname)) {
      description.nickname = nickname
      description.shortDescription = shortDescription;
      description.longDescription = longDescription;
  }
  var middleware = function swaggerInfo(req, res, next) { next(); };
  middleware.swaggerInfo = description;
  return middleware;
};
