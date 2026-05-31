import Item from '../models/Items';

export default async function syncItems(version: string): Promise<void> {
  const url = `https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/item.json`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch item data: ${response.status} ${response.statusText}`);
  const items = await response.json();
  if (!items.data) throw new Error('Invalid item JSON: missing data field');

  const itemData = Object.entries(items.data)
    .map(([itemId, item]: [string, any]) => {
      const tags = Array.isArray(item.tags) ? item.tags : [];
      const isBoots = tags.includes('Boots');
      const goldTotal = Number(item.gold?.total ?? 0);
      const isPurchasable = Boolean(item.gold?.purchasable);
      const isActiveItem = item.inStore !== false && item.hideFromAll !== true && !item.requiredChampion;
      const isCompletedItem =
        isPurchasable &&
        goldTotal >= 1000 &&
        !tags.includes('Lane') &&
        !tags.includes('Trinket') &&
        !tags.includes('Consumable');

      return isActiveItem && (isBoots || isCompletedItem)
        ? {
            version,
            itemId,
            itemName: item.name,
            tags: item.tags,
            image: `/assets/items/${version}/${itemId}.png`
          }
        : null;
    })
    .filter((item): item is { version: string; itemId: string; itemName: string; tags: string[]; image: string } => item !== null);

  const seenItemNames = new Set<string>();
  const dedupedItemData = itemData.filter((doc) => {
    const normalizedName = doc.itemName.trim().toLowerCase();
    if (seenItemNames.has(normalizedName)) return false;
    seenItemNames.add(normalizedName);
    return true;
  });

  const keptItemIds = new Set(dedupedItemData.map((doc) => doc.itemId));

  await Item.deleteMany({ version, itemId: { $nin: [...keptItemIds] } });

  const ops: any[] = dedupedItemData.map((doc) => ({
    replaceOne: {
      filter: { version: doc.version, itemId: doc.itemId },
      replacement: doc,
      upsert: true
    }
  }));

  const result = await Item.bulkWrite(ops, { ordered: false });
  console.log(
    `Item sync complete. Matched: ${result.matchedCount ?? 0}, ` +
      `Upserted: ${result.upsertedCount ?? 0}, Modified: ${result.modifiedCount ?? 0}.`
  );
}
