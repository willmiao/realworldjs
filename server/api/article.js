const express = require('express');
const { PrismaClient } = require('@prisma/client');
const authByToken = require('../middleware/auth');
const errorResponse = require('../utils/errors');
const validator = require('../middleware/validator');

const router = express.Router();
const prisma = new PrismaClient();

router.get('/', authByToken(false), async (req, res) => {
  const { tag, author, favorited, limit, offset } = req.query;

  const filters = [];

  if (tag) {
    filters.push({ tags: { some: { name: tag } } });
  }

  if (author) {
    filters.push({ author: { name: author } });
  }

  if (favorited) {
    filters.push({ favoritedBy: { some: { name: favorited } } });
  }

  const take = limit ? Number(limit) : 20;
  const skip = offset ? Number(offset) : 0;

  const articles = await prisma.article.findMany({
    where: {
      AND: filters,
    },
    include: {
      tags: {
        select: {
          name: true,
        },
      },
      favoritedBy: {
        select: {
          id: true,
        },
      },
      author: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
    skip: skip,
    take: take,
  });

  let id;
  let followingIds;

  if (req.credential) {
    const result = await prisma.user.findUnique({
      where: {
        email: req.credential,
      },
      select: {
        id: true,
        following: {
          select: {
            id: true,
          },
        },
      },
    });

    id = result.id;
    followingIds = result.following.map((o) => o['id']);
  }

  res.json({ articles: articleOutput(articles, id, followingIds) });
});

router.get('/feed', authByToken(), async (req, res) => {
  const { limit, offset } = req.query;

  const take = limit ? Number(limit) : 20;
  const skip = offset ? Number(offset) : 0;

  let id;
  let followingIds;

  if (req.credential) {
    const result = await prisma.user.findUnique({
      where: {
        email: req.credential,
      },
      select: {
        id: true,
        following: {
          select: {
            id: true,
          },
        },
      },
    });

    id = result.id;
    followingIds = result.following.map((o) => o['id']);
  }

  const articles = await prisma.article.findMany({
    where: {
      authorId: { in: followingIds },
    },
    include: {
      tags: {
        select: {
          name: true,
        },
      },
      favoritedBy: {
        select: {
          id: true,
        },
      },
      author: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
    skip: skip,
    take: take,
  });

  res.json({ articles: articleOutput(articles, id, followingIds, true) });
});

function articleOutput(articles, myId, myFollowingIds, following = false) {
  const output = [];
  for (const article of articles) {
    output.push({
      slug: 'to be implemented',
      title: article.title,
      description: article.description,
      body: article.body,
      tagList: article.tags.map((tag) => tag['name']),
      createdAt: article.createdAt,
      updatedAt: article.updatedAt,
      favorited: myId
        ? article.favoritedBy.map((o) => o['id']).indexOf(myId) >= 0
        : false,
      favoritesCount: article.favoritedBy.length,
      author: {
        username: article.author.name,
        bio: article.author.bio,
        image: article.author.image,
        following: myFollowingIds
          ? myFollowingIds.indexOf(article.authorId) >= 0
          : following,
      },
    });
  }

  return output;
}

router.get('/:slug', async (req, res) => {});

router.post(
  '/',
  validator('createArticle'),
  authByToken(),
  async (req, res) => {}
);

router.put('/:slug', authByToken(), async (req, res) => {});

router.delete('/:slug', authByToken(), async (req, res) => {});

router.post(
  '/:slug/comments',
  validator('addComment'),
  authByToken(),
  async (req, res) => {}
);

router.get('/:slug/comments', authByToken(false), async (req, res) => {});

router.delete('/:slug/comments/:id', authByToken(), async (req, res) => {});

router.post('/:slug/favorite', authByToken(), async (req, res) => {});

router.delete('/:slug/favorite', authByToken(), async (req, res) => {});

module.exports = router;
