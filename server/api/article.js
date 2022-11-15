const express = require('express');
const { PrismaClient } = require('@prisma/client');
const authByToken = require('../middleware/auth');
const errorResponse = require('../utils/errors');
const validator = require('../middleware/validator');

const router = express.Router();
const prisma = new PrismaClient();

router.get('/', authByToken(false), async (req, res) => {
  const { tag, author, favorited, limit, offset } = req.query;

  console.log({ tag, author, favorited, limit, offset });

  const filters = [];

  if (tag) {
    filters.push({ tags: { some: { name: tag } } });
  }

  if (author) {
    filters.push({ User: { name: author } });
  }

  if (favorited) {
  }

  res.send('WIP');
});

router.get('/feed', authByToken(), async (req, res) => {});

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
