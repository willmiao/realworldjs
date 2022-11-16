const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

router.get('/', async (req, res) => {
  const tags = await prisma.tag.findMany();

  res.json({
    tags: tags.map((tag) => tag.name),
  });
});

module.exports = router;
