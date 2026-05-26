import { promises as fs } from 'fs';
import path from 'path';
import Item from '../models/Items';

export interface DownloadItemImagesResult {
  total: number;
  downloaded: number;
  skipped: number;
  failed: Array<{ itemId: string; image: string | null; reason: string }>;
}

const PUBLIC_DIR = path.join(process.cwd(), 'public');
const ITEM_ASSET_ROUTE = '/assets/items';

function localItemImagePath(version: string, image: string) {
  return path.join(PUBLIC_DIR, 'items', version, image);
}

function localItemImageUrl(version: string, image: string) {
  return `${ITEM_ASSET_ROUTE}/${encodeURIComponent(version)}/${encodeURIComponent(image)}`;
}

function ddragonItemImageUrl(version: string, image: string) {
  return `https://ddragon.leagueoflegends.com/cdn/${encodeURIComponent(version)}/img/item/${encodeURIComponent(image)}`;
}

function imageFileName(image: string) {
  return image.startsWith(ITEM_ASSET_ROUTE)
    ? path.basename(image)
    : image;
}

export default async function downloadItemImages(): Promise<DownloadItemImagesResult> {
  const items = await Item.find().select('version itemId image').lean();
  const result: DownloadItemImagesResult = {
    total: items.length,
    downloaded: 0,
    skipped: 0,
    failed: [],
  };

  for (const item of items) {
    const version = typeof item.version === 'string' ? item.version.trim() : '';
    const storedImage = typeof item.image === 'string' ? item.image.trim() : '';
    const image = imageFileName(storedImage);
    const itemId = typeof item.itemId === 'string' && item.itemId.trim() ? item.itemId.trim() : image;

    if (!version || !image) {
      result.skipped += 1;
      continue;
    }

    const targetPath = localItemImagePath(version, image);
    const targetUrl = localItemImageUrl(version, image);

    try {
      await fs.access(targetPath);
      await Item.updateOne({ _id: item._id }, { $set: { image: targetUrl } });
      result.skipped += 1;
      continue;
    } catch {
      // File does not exist yet.
    }

    try {
      const response = await fetch(ddragonItemImageUrl(version, image));
      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
      }

      const bytes = Buffer.from(await response.arrayBuffer());
      await fs.mkdir(path.dirname(targetPath), { recursive: true });
      await fs.writeFile(targetPath, bytes);
      await Item.updateOne({ _id: item._id }, { $set: { image: targetUrl } });
      result.downloaded += 1;
    } catch (error: any) {
      result.failed.push({
        itemId,
        image,
        reason: error?.message || 'Unknown download error',
      });
    }
  }

  return result;
}
