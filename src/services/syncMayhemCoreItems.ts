import fs from "fs/promises";
import path from "path";
import MayhemSuggestedItems from "../models/MayhemSuggestedItems";

type CoreItem = {
  itemId: number;
  slot: number;
};

type ChampionCoreItemEntry = {
  name: string;
  id: string;
  coreItems: CoreItem[];
  slot4Items?: number[];
  slot5Items?: number[];
  slot6Items?: number[];
};

type MayhemCoreItemsFile = {
  champions?: ChampionCoreItemEntry[];
};

function getCoreItemsPath(): string {
  return path.resolve(__dirname, "..", "scraper", "mayhem-core-items.json");
}

export default async function syncMayhemCoreItems(versionTag: string): Promise<void> {
  const raw = await fs.readFile(getCoreItemsPath(), "utf8");
  const data = JSON.parse(raw) as MayhemCoreItemsFile;
  const champions = data.champions ?? [];

  if (!champions.length) {
    console.log("No mayhem core items found. Skipping sync.");
    return;
  }

  const ops = champions.map((entry) => {
    const slot4Items = entry.slot4Items ?? [];
    const slot5Items = entry.slot5Items ?? [];
    const slot6Items = entry.slot6Items ?? [];
    const allItems = [...new Set([...slot4Items, ...slot5Items, ...slot6Items])];

    return {
    updateOne: {
      filter: { version: versionTag, championId: entry.id },
      update: {
        $set: {
          version: versionTag,
          championId: entry.id,
          championName: entry.name,
          coreItems: entry.coreItems,
          suggestedItems: {
            slot4Items,
            slot5Items,
            slot6Items,
            allItems
          }
        }
      },
      upsert: true
    }
    };
  });

  const result = await MayhemSuggestedItems.bulkWrite(ops, { ordered: false });
  console.log(
    `Mayhem core items sync complete. Matched: ${result.matchedCount ?? 0}, ` +
      `Upserted: ${result.upsertedCount ?? 0}, Modified: ${result.modifiedCount ?? 0}.`
  );
}
