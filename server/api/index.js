const userApi = require('./user');
const selfApi = require('./self');
const profileApi = require('./profile');
const articleApi = require('./article');
const tagApi = require('./tag');

function api(server) {
  server.use('/api/users', userApi);
  server.use('/api/user', selfApi);
  server.use('/api/profiles', profileApi);
  server.use('/api/articles', articleApi);
  server.use('/api/tags', tagApi);
}

module.exports = api;
