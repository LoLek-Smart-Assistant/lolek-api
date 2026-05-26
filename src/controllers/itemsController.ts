import { Request, Response } from 'express';
import Items from '../models/Items';

// GET /items?version=16.10.1
export async function getItems(req: Request, res: Response) {
  try {
    const version = (req.query.version as string) || undefined;

    const query: any = {};
    if (version) query.version = version;

    const items = await Items.find(query).select('-__v').lean();

    res.json({ items });
  } catch (err: any) {
    console.error('getItems error:', err);
    res.status(err?.status || 500).json({ error: err?.message || 'Failed to fetch items' });
  }
}

