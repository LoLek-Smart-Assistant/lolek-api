import Champion from '../models/Champion';

export default async function syncChampions(version: string): Promise<void> {
  const url = `https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/champion.json`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch champion data: ${response.status} ${response.statusText}`);
  const champions = await response.json();
  if (!champions.data) throw new Error('Invalid champion JSON: missing data field');

  const existingCount = await Champion.countDocuments({ version });
  if (existingCount > 0) {
    console.log(`Champions for version ${version} already in DB (${existingCount} records). Skipping sync.`);
    return;
  }

  const championData = Object.values(champions.data).map((champ: any) => ({
    version,
    championId: champ.id,
    championName: champ.name,
    tags: champ.tags,
    image: champ.image?.full || null
  }));

  await Champion.insertMany(championData);
  console.log('Champion sync successfully.');
}

