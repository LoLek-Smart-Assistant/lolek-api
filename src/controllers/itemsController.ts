import { Request, Response } from 'express';
import Items from '../models/Items';
import MayhemSuggestedItems from '../models/MayhemSuggestedItems';

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

// GET /mayhem-suggested-items?champions=Ahri,Jinx
// GET /mayhem-suggested-items?champion=Ahri&champion=Jinx
export async function getMayhemSuggestedItems(req: Request, res: Response) {
  try {
    const championQuery = req.query.champion;
    const championsQuery = req.query.champions;

    const values: string[] = [];

    const pushValue = (value: unknown) => {
      if (typeof value !== 'string') return;
      for (const segment of value.split(',')) {
        const trimmed = segment.trim();
        if (trimmed) values.push(trimmed);
      }
    };

    if (Array.isArray(championQuery)) {
      for (const value of championQuery) pushValue(value);
    } else {
      pushValue(championQuery);
    }

    if (Array.isArray(championsQuery)) {
      for (const value of championsQuery) pushValue(value);
    } else {
      pushValue(championsQuery);
    }

    const requestedChampions = Array.from(new Set(values));

    if (requestedChampions.length === 0) {
      return res.status(400).json({
        error:
          'Provide at least one champion name using ?champions=Ahri,Jinx or repeated ?champion=Ahri&champion=Jinx.',
      });
    }

    const escaped = requestedChampions.map((name) =>
      name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
    );

    const docs = await MayhemSuggestedItems.find({
      championName: { $in: escaped.map((name) => new RegExp(`^${name}$`, 'i')) },
    })
      .select('-__v')
      .lean();

    const allItemIds = new Set<string>();
    for (const doc of docs) {
      for (const item of doc.coreItems ?? []) {
        if (item?.itemId != null) allItemIds.add(String(item.itemId));
      }
      for (const itemId of doc.suggestedItems?.allItems ?? []) {
        if (itemId != null) allItemIds.add(String(itemId));
      }
    }

    const itemIdStrings = [...allItemIds];

    const itemDocs =
      allItemIds.size > 0
        ? await Items.aggregate<{ itemId: string | number; itemName?: string; image?: string | null; version?: string; customTags?: string[] | null }>([
            {
              $match: {
                $expr: {
                  $in: [{ $toString: '$itemId' }, itemIdStrings],
                },
              },
            },
            {
              $project: {
                _id: 0,
                itemId: 1,
                itemName: 1,
                image: 1,
                version: 1,
                customTags: 1,
              },
            },
          ])
        : [];

    const scoreMeta = (meta: { itemName?: string | null; image?: string | null }) => {
      let score = 0;
      if (meta.itemName && meta.itemName.trim()) score += 2;
      if (meta.image && String(meta.image).trim()) score += 1;
      return score;
    };

    const itemById = new Map<
      string,
      { itemName: string | null; image: string | null; version: string | null; customTags: string[] | null }
    >();

    for (const item of itemDocs) {
      const id = String(item.itemId);
      const candidate = {
        itemName: item.itemName?.trim() || null,
        image: item.image?.trim() || null,
        version: item.version?.trim() || null,
        customTags: Array.isArray(item.customTags) ? item.customTags.map(String) : null,
      };
      const existing = itemById.get(id);
      if (!existing || scoreMeta(candidate) > scoreMeta(existing)) {
        itemById.set(id, candidate);
      }
    }

    const resolveItemMeta = (itemId: string | number, defaultVersion?: string) => {
      const key = String(itemId);
      const meta = itemById.get(key);
      const itemName = meta?.itemName ?? null;
      const customTags = meta?.customTags ?? null;

      let image = meta?.image ?? null;
      if (!image) {
        const version = meta?.version || defaultVersion || null;
        if (version) {
          image = `/assets/items/${encodeURIComponent(version)}/${encodeURIComponent(key)}.png`;
        }
      }

      return { itemName, image, customTags };
    };

    const results = docs.map((doc) => ({
      championName: doc.championName,
      championId: doc.championId,
      version: doc.version,
      coreItems: (doc.coreItems ?? []).map((core) => {
        const meta = resolveItemMeta(core.itemId, doc.version);
        return {
          itemId: core.itemId,
          slot: core.slot,
          itemName: meta.itemName,
          image: meta.image,
          customTags: meta.customTags,
        };
      }),
      suggestedItems: {
        slot4Items: (doc.suggestedItems?.slot4Items ?? []).map((itemId) => {
          const meta = resolveItemMeta(itemId, doc.version);
          return { itemId, itemName: meta.itemName, image: meta.image, customTags: meta.customTags };
        }),
        slot5Items: (doc.suggestedItems?.slot5Items ?? []).map((itemId) => {
          const meta = resolveItemMeta(itemId, doc.version);
          return { itemId, itemName: meta.itemName, image: meta.image, customTags: meta.customTags };
        }),
        slot6Items: (doc.suggestedItems?.slot6Items ?? []).map((itemId) => {
          const meta = resolveItemMeta(itemId, doc.version);
          return { itemId, itemName: meta.itemName, image: meta.image, customTags: meta.customTags };
        }),
        allItems: (doc.suggestedItems?.allItems ?? []).map((itemId) => {
          const meta = resolveItemMeta(itemId, doc.version);
          return { itemId, itemName: meta.itemName, image: meta.image, customTags: meta.customTags };
        }),
      },
    }));

    const foundChampionNames = new Set(
      docs.map((doc) => String(doc.championName || '').toLowerCase()),
    );
    const notFoundChampions = requestedChampions.filter(
      (name) => !foundChampionNames.has(name.toLowerCase()),
    );

    return res.json({
      requestedChampions,
      foundCount: results.length,
      notFoundChampions,
      results,
    });
  } catch (err: any) {
    console.error('getMayhemSuggestedItems error:', err);
    return res
      .status(err?.status || 500)
      .json({ error: err?.message || 'Failed to fetch Mayhem suggested items' });
  }
}
