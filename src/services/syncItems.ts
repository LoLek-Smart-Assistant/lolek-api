import Item from '../models/Items';

export default async function syncItems(version: string): Promise<void> {
  const url = `https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/item.json`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch item data: ${response.status} ${response.statusText}`);
  const items = await response.json();
  if (!items.data) throw new Error('Invalid item JSON: missing data field');

  const itemData = Object.entries(items.data).map(([itemId, item]: [string, any]) => ({
    version,
    itemId,
    itemName: item.name,
    tags: item.tags,
    image: `/assets/items/${version}/${itemId}.png`
  }));

  const ops = itemData.map((doc) => ({
    updateOne: {
      filter: { itemId: doc.itemId },
      update: { $set: doc },
      upsert: true
    }
  }));

  const result = await Item.bulkWrite(ops, { ordered: false });
  console.log(
    `Item sync complete. Matched: ${result.matchedCount ?? 0}, ` +
      `Upserted: ${result.upsertedCount ?? 0}, Modified: ${result.modifiedCount ?? 0}.`
  );
}
