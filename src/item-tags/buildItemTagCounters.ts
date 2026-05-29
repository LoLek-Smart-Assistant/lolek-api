import fs from "fs/promises";
import path from "path";
import mongoose from "mongoose";
import connectDB from "../mongoDB/db";
import Item from "../models/Items";

type TagListOutput = {
  generatedAt: string;
  totalItems: number;
  tags: string[];
};

async function buildTagCounts(): Promise<TagListOutput> {
  await connectDB();

  const items = await Item.find({}, { tags: 1 }).lean();
  const tagSet = new Set<string>();

  for (const item of items) {
    const itemTags = Array.isArray(item.tags) ? item.tags : [];
    for (const tag of itemTags) {
      if (!tag) {
        continue;
      }
      tagSet.add(tag);
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    totalItems: items.length,
    tags: [...tagSet].sort((a, b) => a.localeCompare(b)),
  };
}

async function run(): Promise<void> {
  const output = await buildTagCounts();
  const outPath = path.resolve(__dirname, "itemTags.json");

  await fs.writeFile(outPath, JSON.stringify(output, null, 2), "utf8");
  console.log(`Saved item tags to: ${outPath}`);

  await mongoose.connection.close();
}

run().catch((err) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`Item tag counter build failed: ${message}`);
  process.exit(1);
});
