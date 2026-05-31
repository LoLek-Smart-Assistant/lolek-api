import connectDB from '../mongoDB/db';
import { getLatestVersion } from './gameVersion';
import syncChampions from './syncChampions';
import syncItems from './syncItems';
import downloadChampionImages from './downloadChampionImages';
import downloadItemImages from './downloadItemImages';
import syncCustomItemTags, { type SyncCustomItemTagsResult } from './syncCustomItemTags';

export type SyncFlowResult = {
  version: string;
  championImages: Awaited<ReturnType<typeof downloadChampionImages>>;
  itemImages: Awaited<ReturnType<typeof downloadItemImages>>;
  customTags: SyncCustomItemTagsResult;
};

export async function sync(): Promise<SyncFlowResult> {
  await connectDB();
  const version = await getLatestVersion();
  console.log(`Latest version: ${version}`);
  console.log('Sync step 1/5: champions');
  await syncChampions(version);
  console.log('Sync step 2/5: items');
  await syncItems(version);
  console.log('Sync step 3/5: champion images');
  const championImages = await downloadChampionImages();
  console.log('Sync step 4/5: item images');
  const itemImages = await downloadItemImages();
  console.log('Sync step 5/5: custom item tags');
  const customTags = await syncCustomItemTags();

  return {
    version,
    championImages,
    itemImages,
    customTags,
  };
}

export default { sync };
