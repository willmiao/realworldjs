const { body, validationResult } = require('express-validator');
const errorResponse = require('../utils/errors');

const validation = new Map();

// users api
validation.set('login', [
  body('user.email').exists().isEmail(),
  body('user.password').exists(),
]);

validation.set('register', [
  body('user.email').exists().isEmail(),
  body('user.password').exists(),
  body('user.username').exists(),
]);

function validationHandler(req, res, next) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(422).json(errorResponse(...errors.array()));
  }

  next();
}

validation.forEach((value) => value.push(validationHandler));

function validator(method) {
  return validation.get(method);
}

module.exports = validator;
