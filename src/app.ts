import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import logger from 'morgan';
import swaggerUi from 'swagger-ui-express';
import dotenv from 'dotenv';
import path from 'path';
import { swaggerSpec } from './swagger';
import indexRouter from './routes/index';

dotenv.config();

const app = express();

const configuredFrontendOrigins = process.env.FRONTEND_URLS || process.env.FRONTEND_URL;
const allowedOrigins = (configuredFrontendOrigins || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5173'))
  .split(',')
  .map((origin) => {
    const trimmedOrigin = origin.trim();
    if (!trimmedOrigin) return '';
    try {
      return new URL(trimmedOrigin).origin;
    } catch {
      return trimmedOrigin.replace(/\/$/, '');
    }
  })
  .filter(Boolean);

const corsOptions = {
  origin: (origin: string | undefined, callback: (error: Error | null, allowed?: boolean) => void) => {
    if (!origin) return callback(null, true);
    let requestOrigin = origin;
    try {
      requestOrigin = new URL(origin).origin;
    } catch {
      // Keep the provided origin for the allowlist comparison.
    }
    callback(null, allowedOrigins.includes(requestOrigin));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use('/assets', express.static(path.join(process.cwd(), 'public')));

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use('/', indexRouter);

app.use((req, res) => {
  res.status(404).send('Not Found');
});

export default app;

