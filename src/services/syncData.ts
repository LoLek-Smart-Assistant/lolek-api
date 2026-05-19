import connectDB from '../mongoDB/db';
import { getLatestVersion } from './gameVersion';
import syncChampions from './syncChampions';
import syncItems from './syncItems';

export async function sync(): Promise<void> {
  await connectDB();
  const version = await getLatestVersion();
  console.log(`Latest version: ${version}`);
  await syncChampions(version);
  await syncItems(version);
}

export default { sync };

