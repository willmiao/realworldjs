const userApi = require('./user');
const selfApi = require('./self');
const profileApi = require('./profile');

function api(server) {
  server.use('/api/users', userApi);
  server.use('/api/user', selfApi);
  server.use('/api/profiles', profileApi);
}

module.exports = api;
