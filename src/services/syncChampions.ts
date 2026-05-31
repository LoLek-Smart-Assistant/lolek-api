import Champion from '../models/Champion';

export default async function syncChampions(version: string): Promise<void> {
  const url = `https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/champion.json`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch champion data: ${response.status} ${response.statusText}`);
  const champions = await response.json();
  if (!champions.data) throw new Error('Invalid champion JSON: missing data field');

  const championData = Object.values(champions.data).map((champ: any) => ({
    version,
    championId: champ.id,
    key: champ.key,
    championName: champ.name,
    tags: champ.tags,
    image: `/assets/champions/${version}/${champ.id}.png`
  }));

  const ops = championData.map((doc) => ({
    updateOne: {
      filter: { championId: doc.championId },
      update: { $set: doc },
      upsert: true
    }
  }));

  const result = await Champion.bulkWrite(ops, { ordered: false });
  console.log(
    `Champion sync complete. Matched: ${result.matchedCount ?? 0}, ` +
      `Upserted: ${result.upsertedCount ?? 0}, Modified: ${result.modifiedCount ?? 0}.`
  );
}
