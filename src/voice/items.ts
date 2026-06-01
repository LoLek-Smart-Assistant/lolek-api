import mongoose from 'mongoose';
import Item from '../models/Items';

export let items: string[] = [];

let loadPromise: Promise<string[]> | null = null;

async function loadItemsFromDatabase(): Promise<string[]> {
  if (mongoose.connection.readyState !== 1) {
    return [];
  }

  const docs = await Item.find({}, { itemName: 1, _id: 0 }).lean();
  return docs
    .map((doc) => doc.itemName)
    .filter((name): name is string => Boolean(name?.trim()))
    .map((name) => name.trim());
}

export async function loadItems(): Promise<string[]> {
  if (items.length > 0) {
    return items;
  }

  if (!loadPromise) {
    loadPromise = (async () => {
      try {
        const fromDb = await loadItemsFromDatabase();
        items = Array.from(new Set(fromDb)).sort((a, b) => a.localeCompare(b));
        return items;
      } catch {
        items = [];
        return items;
      }
    })();
  }

  return loadPromise;
}

