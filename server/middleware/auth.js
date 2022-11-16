const jwt = require('jsonwebtoken');
const errorResponse = require('../utils/errors');

function authByToken(required = true) {
  return (req, res, next) => {
    const token = req.get('Authorization')
      ? req.get('Authorization').replace(/^Token /, '')
      : '';

    jwt.verify(token, process.env.JWT_PRIVATE_KEY, (err, decoded) => {
      if (err) {
        if (required) {
          return res.status(401).json(errorResponse('unauthorized request'));
        }
      } else {
        req.credential = decoded.email;
      }

      next();
    });
  };
}

module.exports = authByToken;
