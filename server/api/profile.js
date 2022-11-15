const express = require('express');
const { PrismaClient } = require('@prisma/client');
const authByToken = require('../middleware/auth');
const errorResponse = require('../utils/errors');

const router = express.Router();
const prisma = new PrismaClient();

router.get('/:username', authByToken(false), async (req, res) => {
  try {
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
  } catch (err) {
    res.status(400).json(errorResponse(err.message));
  }
});

router.post('/:username/follow', authByToken(), async (req, res) => {
  try {
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

    const me = await prisma.user.findUnique({
      where: {
        email: req.credential,
      },
      select: {
        id: true,
      },
    });

    await prisma.user.update({
      where: {
        id: me.id,
      },
      data: {
        following: {
          connect: {
            id: user.id,
          },
        },
      },
    });

    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        followedBy: {
          connect: {
            id: me.id,
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
  } catch (err) {
    res.status(400).json(errorResponse(err.message));
  }
});

router.delete('/:username/follow', authByToken(), async (req, res) => {
  try {
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

    const me = await prisma.user.findUnique({
      where: {
        email: req.credential,
      },
      select: {
        id: true,
      },
    });

    await prisma.user.update({
      where: {
        id: me.id,
      },
      data: {
        following: {
          disconnect: {
            id: user.id,
          },
        },
      },
    });

    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        followedBy: {
          disconnect: {
            id: me.id,
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
  } catch (err) {
    res.status(400).json(errorResponse(err.message));
  }
});

module.exports = router;
