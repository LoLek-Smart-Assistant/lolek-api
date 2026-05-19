import express from 'express';
import logger from 'morgan';
import dotenv from 'dotenv';

dotenv.config();

import indexRouter from './routes/index';

const app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use('/', indexRouter);

app.use((req, res) => {
  res.status(404).send('Not Found');
});

export default app;

