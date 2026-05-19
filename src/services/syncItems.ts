import Item from '../models/Items';

export default async function syncItems(version: string): Promise<void> {
  const url = `https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/item.json`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch item data: ${response.status} ${response.statusText}`);
  const items = await response.json();
  if (!items.data) throw new Error('Invalid item JSON: missing data field');

  const existingCount = await Item.countDocuments({ version });
  if (existingCount > 0) {
    console.log(`Items for version ${version} already in DB (${existingCount} records). Skipping sync.`);
    return;
  }

  const itemData = Object.values(items.data).map((item: any) => ({
    version,
    itemId: item.id,
    itemName: item.name,
    tags: item.tags,
    image: item.image?.full || null
  }));

  await Item.insertMany(itemData);
  console.log('Item sync successfully.');
}

