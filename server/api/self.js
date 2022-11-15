const express = require('express');
const { PrismaClient } = require('@prisma/client');
const authByToken = require('../middleware/auth');
const errorResponse = require('../utils/errors');
const jwt = require('jsonwebtoken');

const router = express.Router();
const prisma = new PrismaClient();

router.get('/', authByToken(), async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: {
        email: req.credential,
      },
    });

    if (!user) {
      throw new Error('user not found');
    }

    res.json({
      user: {
        email: user.email,
        token: req.get('Authorization'),
        username: user.name,
        bio: user.bio,
        image: user.image,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(400).json(errorResponse(err.message));
  }
});

router.put('/', authByToken(), async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: {
        email: req.credential,
      },
    });

    if (!user) {
      throw new Error('user not found');
    }

    const { email, username, password, image, bio } = req.body.user;

    // sign a new jwt if email changed
    const token = email
      ? jwt.sign({ email: email }, process.env.JWT_PRIVATE_KEY, {
          expiresIn: process.env.JWT_EXPIRES_IN,
        })
      : req.get('Authorization');

    const data = {};

    if (email) {
      data.email = email;
    }

    if (username) {
      data.name = username;
    }

    if (bio) {
      data.bio = bio;
    }

    if (image) {
      data.image = image;
    }

    // generate a new hash if passowrd changed
    if (password) {
      data.password = await bcrypt.hash(
        password,
        Number(process.env.BCRYPT_SALTROUNDS)
      );
    }

    const newUser = await prisma.user.update({
      where: {
        id: user.id,
      },
      data: data,
    });

    res.json({
      user: {
        email: newUser.email,
        token: token,
        username: newUser.name,
        bio: newUser.bio,
        image: newUser.image,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(400).json(errorResponse(err.message));
  }
});

module.exports = router;
