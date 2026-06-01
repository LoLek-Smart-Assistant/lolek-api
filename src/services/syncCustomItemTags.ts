import fs from 'fs';
import path from 'path';
import Item from '../models/Items';

const TAG_FILE_PATH = path.resolve(process.cwd(), 'src', 'item-tags', 'item-tags.json');

type MappingEntry = {
  itemName: string;
  customTags: string[];
};

export type SyncCustomItemTagsResult = {
  totalMappings: number;
  applied: number;
  notFound: number;
};

function normalizeTag(tag: string) {
  return tag.trim();
}

function normalizeName(name: string) {
  return name.trim().toLowerCase();
}

function loadMappings(filePath: string): MappingEntry[] {
  const raw = fs.readFileSync(filePath, { encoding: 'utf8' });
  const parsed = JSON.parse(raw);

  if (Array.isArray(parsed)) {
    return parsed
      .map((entry) => ({
        itemName: String(entry.itemName || ''),
        customTags: Array.isArray(entry.customTags) ? entry.customTags.map(String) : [],
      }))
      .filter((entry) => entry.itemName && entry.customTags.length > 0);
  }

  if (parsed && typeof parsed === 'object') {
    return Object.entries(parsed)
      .map(([itemName, tags]) => ({
        itemName: String(itemName || ''),
        customTags: Array.isArray(tags) ? tags.map(String) : [],
      }))
      .filter((entry) => entry.itemName && entry.customTags.length > 0);
  }

  throw new Error('Unsupported custom tag JSON format');
}

export default async function syncCustomItemTags(): Promise<SyncCustomItemTagsResult> {
  if (!fs.existsSync(TAG_FILE_PATH)) {
    throw new Error(`Custom tag mapping file not found: ${TAG_FILE_PATH}`);
  }

  const mappings = loadMappings(TAG_FILE_PATH);
  if (mappings.length === 0) {
    return { totalMappings: 0, applied: 0, notFound: 0 };
  }

  const allItems = await Item.find({}, { itemName: 1 }).lean();
  const exactMap = new Map<string, { itemName: string }>();
  for (const item of allItems) {
    if (!item.itemName) continue;
    exactMap.set(normalizeName(item.itemName), {
      itemName: item.itemName,
    });
  }

  const updates: Array<{ itemName: string; customTags: string[] }> = [];
  let notFound = 0;

  for (const mapping of mappings) {
    const tags = mapping.customTags.map(normalizeTag).filter(Boolean);
    if (!tags.length) continue;

    const exact = exactMap.get(normalizeName(mapping.itemName));
    if (exact) {
      updates.push({
        itemName: exact.itemName,
        customTags: Array.from(new Set(tags)),
      });
      continue;
    }

    notFound += 1;
  }

  if (updates.length > 0) {
    for (const update of updates) {
      await Item.updateMany(
        { itemName: { $regex: `^${escapeRegExp(update.itemName)}$`, $options: 'i' } },
        { $set: { customTags: update.customTags } },
      );
    }
  }

  return {
    totalMappings: mappings.length,
    applied: updates.length,
    notFound,
  };
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
