module.exports = function describe(nickname, shortDescription, longDescription) {
  var middleware = function describeMiddleware(req, res, next) { next(); };
  middleware.nickname = nickname;
  middleware.shortDescription = shortDescription;
  middleware.longDescription = longDescription;

  return middleware;
}
