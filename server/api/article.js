const express = require('express');
const { PrismaClient } = require('@prisma/client');
const authByToken = require('../middleware/auth');
const errorResponse = require('../utils/errors');
const validator = require('../middleware/validator');
const slugify = require('slugify');

const router = express.Router();
const prisma = new PrismaClient();

/**
 * list articles
 */
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

/**
 * get feed
 */
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
      slug: article.slug,
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

/**
 * get article by slug
 */
router.get('/:slug', async (req, res) => {
  const slug = req.params.slug;

  const article = await prisma.article.findUnique({
    where: {
      slug: slug,
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
  });

  if (!article) {
    return res.status(404).json(errorResponse('article not found'));
  }

  res.json({ article: articleOutput([article])[0] });
});

/**
 * create article
 */
router.post(
  '/',
  validator('createArticle'),
  authByToken(),
  async (req, res) => {
    const { title, description, body, tagList } = req.body.article;
    const slug = await uniqueSlug(title);

    const newArticle = await prisma.article.create({
      data: {
        slug: slug,
        title: title,
        description: description,
        content: body,
        author: {
          connect: { email: req.credential },
        },
        tags: {
          connectOrCreate: tagList.map((tag) => ({
            where: { name: tag },
            create: { name: tag },
          })),
        },
      },
      include: {
        author: true,
      },
    });

    res.json({
      article: {
        slug: newArticle.slug,
        title: newArticle.title,
        description: newArticle.description,
        body: newArticle.content,
        tagList: tagList,
        createdAt: newArticle.createdAt,
        updatedAt: newArticle.updatedAt,
        favorited: false,
        favoritesCount: 0,
        author: {
          username: newArticle.author.name,
          bio: newArticle.author.bio,
          image: newArticle.author.image,
          following: false,
        },
      },
    });
  }
);

async function uniqueSlug(title) {
  let slug = slugify(title);

  const count = await prisma.article.count({
    where: {
      slug: {
        startsWith: slug,
      },
    },
  });

  return (slug = count == 0 ? slug : `${slug}-${count}`);
}

/**
 * update article
 */
router.put('/:slug', authByToken(), async (req, res) => {
  const { title, description, body } = req.body.article;
  const slug = req.params.slug;

  // authorization
  // check if current user is the author of the article
  const authorEmail = await prisma.article.findUnique({
    where: {
      slug: slug,
    },
    select: {
      author: {
        select: {
          email: true,
        },
      },
    },
  });

  if (authorEmail !== req.credential) {
    return res
      .status(403)
      .json(errorResponse('you are not allowed to perform the action'));
  }

  const data = {};

  if (title) {
    data.title = title;
    data.slug = await uniqueSlug(title);
  }

  if (description) {
    data.description = description;
  }

  if (body) {
    data.body = body;
  }

  const updated = await prisma.article.update({
    where: {
      slug: slug,
    },
    data: data,
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
  });

  res.json({
    article: {
      slug: updated.slug,
      title: updated.title,
      description: updated.description,
      body: updated.content,
      tagList: updated.tags.map((tag) => tag['name']),
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
      favorited: false, // TODO
      favoritesCount: updated.favoritedBy.length,
      author: {
        username: updated.author.name,
        bio: updated.author.bio,
        image: updated.author.image,
        following: false,
      },
    },
  });
});

/**
 * delete article
 */
router.delete('/:slug', authByToken(), async (req, res) => {
  const slug = req.params.slug;

  // authorization
  // check if current user is the author of the article
  const {
    author: { email: authorEmail },
  } = await prisma.article.findUnique({
    where: {
      slug: slug,
    },
    select: {
      author: {
        select: {
          email: true,
        },
      },
    },
  });

  if (authorEmail !== req.credential) {
    return res
      .status(403)
      .json(errorResponse('you are not allowed to perform the action'));
  }

  const deleted = await prisma.article.delete({
    where: {
      slug: slug,
    },
  });

  // TODO:
  res.send('success');
});

/**
 * add comment
 */
router.post(
  '/:slug/comments',
  validator('addComment'),
  authByToken(),
  async (req, res) => {
    const slug = req.params.slug;
    const { body } = req.body.comment;

    const newComment = await prisma.comment.create({
      data: {
        content: body,
        Article: {
          connect: {
            slug: slug,
          },
        },
        author: {
          connect: {
            email: req.credential,
          },
        },
      },
      include: {
        author: true,
      },
    });

    res.json({
      comment: {
        id: newComment.id,
        createdAt: newComment.createdAt,
        updatedAt: newComment.updatedAt,
        body: newComment.connect,
        author: {
          username: newComment.author.name,
          bio: newComment.author.bio,
          image: newComment.author.image,
          following: false,
        },
      },
    });
  }
);

/**
 * get comments from an article
 */
router.get('/:slug/comments', authByToken(false), async (req, res) => {
  const slug = req.params.slug;

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

  const comments = await prisma.comment.findMany({
    where: {
      Article: {
        slug: slug,
      },
    },
    include: {
      author: true,
    },
  });

  const output = [];
  for (const comment of comments) {
    output.push({
      id: comment.id,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      body: comment.content,
      author: {
        username: comment.author.name,
        bio: comment.author.bio,
        image: comment.author.image,
        following: followingIds
          ? followingIds.indexOf(comment.author.id) >= 0
          : false,
      },
    });
  }

  res.json({
    comments: output,
  });
});

/**
 * delete comment
 */
router.delete('/:slug/comments/:id', authByToken(), async (req, res) => {
  const { slug, id } = req.params;

  // authorization
  // check if current user is the author of the comment
  const {
    author: { email: authorEmail },
  } = await prisma.comment.findUnique({
    where: {
      id: Number(id),
    },
    select: {
      author: {
        select: {
          email: true,
        },
      },
    },
  });

  if (authorEmail !== req.credential) {
    return res
      .status(403)
      .json(errorResponse('you are not allowed to perform the action'));
  }

  const deleted = await prisma.comment.delete({
    where: {
      id: Number(id),
    },
  });

  // TODO:
  res.send('success');
});

/**
 * favorite article
 */
router.post('/:slug/favorite', authByToken(), async (req, res) => {
  const slug = req.params.slug;

  const result = await prisma.user.findUnique({
    where: {
      email: req.credential,
    },
    select: {
      following: {
        select: {
          id: true,
        },
      },
    },
  });

  const followingIds = result.following.map((o) => o['id']);

  const article = await prisma.article.update({
    where: {
      slug: slug,
    },
    data: {
      favoritedBy: {
        connect: {
          email: req.credential,
        },
      },
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
  });

  res.json({
    article: {
      slug: article.slug,
      title: article.title,
      description: article.description,
      body: article.content,
      tagList: article.tags.map((tag) => tag['name']),
      createdAt: article.createdAt,
      updatedAt: article.updatedAt,
      favorited: true,
      favoritesCount: article.favoritedBy.length,
      author: {
        username: article.author.name,
        bio: article.author.bio,
        image: article.author.image,
        following: followingIds.indexOf(article.author.id) >= 0,
      },
    },
  });
});

/**
 * unfavorite article
 */
router.delete('/:slug/favorite', authByToken(), async (req, res) => {
  const slug = req.params.slug;

  const result = await prisma.user.findUnique({
    where: {
      email: req.credential,
    },
    select: {
      following: {
        select: {
          id: true,
        },
      },
    },
  });

  const followingIds = result.following.map((o) => o['id']);

  const article = await prisma.article.update({
    where: {
      slug: slug,
    },
    data: {
      favoritedBy: {
        disconnect: {
          email: req.credential,
        },
      },
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
  });

  res.json({
    article: {
      slug: article.slug,
      title: article.title,
      description: article.description,
      body: article.content,
      tagList: article.tags.map((tag) => tag['name']),
      createdAt: article.createdAt,
      updatedAt: article.updatedAt,
      favorited: false,
      favoritesCount: article.favoritedBy.length,
      author: {
        username: article.author.name,
        bio: article.author.bio,
        image: article.author.image,
        following: followingIds.indexOf(article.author.id) >= 0,
      },
    },
  });
});

module.exports = router;
