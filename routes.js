const express = require('express');
const app = express();
require("./routes/Sockets")
// Defining all the routes
const index = require('./routes/index');
const Api = require('./routes/Api');
const users = require('./routes/users');

// Linking all the routes
app.use('/', Api);
app.use('/index', index);
app.use('/users', users);

module.exports = app;
