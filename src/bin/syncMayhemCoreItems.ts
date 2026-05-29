import mongoose from "mongoose";
import connectDB from "../mongoDB/db";
import { getLatestVersion } from "../services/gameVersion";
import syncMayhemCoreItems from "../services/syncMayhemCoreItems";

async function run(): Promise<void> {
  await connectDB();

  const patch = await getLatestVersion();
  const versionTag = `mayhem.${patch}`;

  await syncMayhemCoreItems(versionTag);

  await mongoose.connection.close();
}

run().catch((err) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`Mayhem core items sync failed: ${message}`);
  process.exit(1);
});
