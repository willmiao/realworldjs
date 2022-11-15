const express = require('express');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const errorResponse = require('../utils/errors');
const validator = require('../middleware/validator');

const router = express.Router();
const prisma = new PrismaClient();

router.post('/login', validator('login'), async (req, res) => {
  try {
    const { email, password } = req.body.user;

    const user = await prisma.user.findUnique({
      where: {
        email: email,
      },
    });

    if (!user) {
      res.status(401).json(errorResponse(`user ${email} not exists`));
      return;
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      res.status(401).json(errorResponse('wrong email or password'));
      return;
    }

    const token = signJwt(email);

    res.json({
      user: {
        email: email,
        token: token,
        username: user.name,
        bio: user.bio,
        image: user.image,
      },
    });
  } catch (err) {
    // TODO
    console.error(err);
    res.status(422).json(errorResponse(err.message));
  }
});

router.post('/', validator('register'), async (req, res) => {
  try {
    const { username, email, password } = req.body.user;

    const result = await prisma.user.findUnique({
      where: {
        email: email,
      },
    });

    if (result) {
      // TODO: throw an error: user exists
      throw new Error(`Email ${email} has already been registerred.`);
    }

    const hash = await bcrypt.hash(
      password,
      Number(process.env.BCRYPT_SALTROUNDS)
    );

    const user = await prisma.user.create({
      data: {
        email: email,
        name: username,
        password: hash,
      },
    });

    const token = signJwt(email);

    res.json({
      user: {
        email: email,
        token: token,
        username: username,
      },
    });
  } catch (err) {
    // TODO
    console.error(err);
    res.status(422).send('ERROR, WIP');
  }
  // check if email exists
  // if not, hash the password and store the new user
  // sign a jwt and return a User response
});

function signJwt(email) {
  return jwt.sign({ email: email }, process.env.JWT_PRIVATE_KEY, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
}

module.exports = router;
