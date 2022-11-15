const express = require('express');
const { PrismaClient } = require('@prisma/client');
const authByToken = require('../middleware/auth');
const errorResponse = require('../utils/errors');

const router = express.Router();
const prisma = new PrismaClient();

router.get('/:username', authByToken(false), async (req, res) => {
  const user = await prisma.user.findFirst({
    where: {
      name: req.params.username,
    },
  });

  if (!user) {
    return res
      .status(404)
      .json(errorResponse(`${req.params.username} not found`));
  }

  let following = false;

  // for authenticated user
  if (req.credential) {
    const result = await prisma.user.findFirst({
      where: {
        email: req.credential,
      },
      select: {
        following: {
          where: {
            id: user.id,
          },
          select: {
            id: true,
          },
        },
      },
    });

    if (result.following.length > 0) {
      following = true;
    }
  }

  res.json({
    profile: {
      username: user.name,
      bio: user.bio,
      image: user.image,
      following: following,
    },
  });
});

router.post('/:username/follow', authByToken(), async (req, res) => {
  const username = req.params.username;
  const user = await prisma.user.findFirst({
    where: {
      name: username,
    },
  });

  if (!user) {
    return res
      .status(404)
      .json(errorResponse(`${req.params.username} not found`));
  }

  await prisma.user.update({
    where: {
      email: req.credential,
    },
    data: {
      following: {
        connect: {
          id: user.id,
        },
      },
    },
  });

  res.json({
    profile: {
      username: user.name,
      bio: user.bio,
      image: user.image,
      following: true,
    },
  });
});

router.delete('/:username/follow', authByToken(), async (req, res) => {
  const username = req.params.username;
  const user = await prisma.user.findFirst({
    where: {
      name: username,
    },
  });

  if (!user) {
    return res
      .status(404)
      .json(errorResponse(`${req.params.username} not found`));
  }

  await prisma.user.update({
    where: {
      email: req.credential,
    },
    data: {
      following: {
        disconnect: {
          id: user.id,
        },
      },
    },
  });

  res.json({
    profile: {
      username: user.name,
      bio: user.bio,
      image: user.image,
      following: false,
    },
  });
});

module.exports = router;
