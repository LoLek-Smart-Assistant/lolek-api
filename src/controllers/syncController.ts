import { Request, Response } from 'express';
import { sync } from '../services/syncData';

export async function syncDataHandler(req: Request, res: Response) {
  try {
    const result = await sync();
    res.json({ message: 'Data sync completed successfully.', result });
  } catch (err: any) {
    console.error('syncData error:', err);
    const status = err.response?.status || 500;
    res.status(status).json({ error: err.message, details: err.response?.data || null });
  }
}
