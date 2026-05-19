import express from 'express';
import logger from 'morgan';
import swaggerUi from 'swagger-ui-express';
import swaggerOutput from './swagger-output.json';
import dotenv from 'dotenv';

dotenv.config();

import { swaggerSpec } from './swagger';
import indexRouter from './routes/index';

const app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerOutput));

app.use('/', indexRouter);

app.use((req, res) => {
  res.status(404).send('Not Found');
});

export default app;

