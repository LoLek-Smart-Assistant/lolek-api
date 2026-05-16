require('dotenv').config();
const express = require('express');
const path = require('path');
const logger = require('morgan');

const indexRouter = require('./routes/index');

const app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({extended: false}));

app.use('/', indexRouter);

app.use(function(req, res) {
    res.status(404).send('Not Found');
});

module.exports = app;