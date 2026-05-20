import express from 'express';
import logger from 'morgan';
import swaggerUi from 'swagger-ui-express';
import dotenv from 'dotenv';
import { swaggerSpec } from './swagger';
import indexRouter from './routes/index';

dotenv.config();

const app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use('/', indexRouter);

app.use((req, res) => {
  res.status(404).send('Not Found');
});

export default app;

