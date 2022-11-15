require('dotenv').config();
const express = require('express');
const server = express();
const api = require('./api');

server.use(express.json());
api(server);

server.listen(3000, () => {
  console.log('Server started...');
});
