import { promises as fs } from 'fs';
import path from 'path';
import Champion from '../models/Champion';

export interface DownloadChampionImagesResult {
  total: number;
  downloaded: number;
  skipped: number;
  failed: Array<{ championId: string; image: string | null; reason: string }>;
}

const PUBLIC_DIR = path.join(process.cwd(), 'public');
const CHAMPION_ASSET_ROUTE = '/assets/champions';

function localChampionImagePath(version: string, image: string) {
  return path.join(PUBLIC_DIR, 'champions', version, image);
}

function localChampionImageUrl(version: string, image: string) {
  return `${CHAMPION_ASSET_ROUTE}/${encodeURIComponent(version)}/${encodeURIComponent(image)}`;
}

function ddragonChampionImageUrl(version: string, image: string) {
  return `https://ddragon.leagueoflegends.com/cdn/${encodeURIComponent(version)}/img/champion/${encodeURIComponent(image)}`;
}

export default async function downloadChampionImages(): Promise<DownloadChampionImagesResult> {
  const champions = await Champion.find().select('version championId image').lean();
  const result: DownloadChampionImagesResult = {
    total: champions.length,
    downloaded: 0,
    skipped: 0,
    failed: [],
  };

  for (const champion of champions) {
    const version = typeof champion.version === 'string' ? champion.version.trim() : '';
    const championId = typeof champion.championId === 'string' ? champion.championId.trim() : '';
    const image = typeof champion.image === 'string' ? champion.image.trim() : '';

    if (!version || !championId || !image || image.startsWith(CHAMPION_ASSET_ROUTE)) {
      result.skipped += 1;
      continue;
    }

    const targetPath = localChampionImagePath(version, image);
    const targetUrl = localChampionImageUrl(version, image);

    try {
      await fs.access(targetPath);
      await Champion.updateOne({ _id: champion._id }, { $set: { image: targetUrl } });
      result.skipped += 1;
      continue;
    } catch {
      // File does not exist yet.
    }

    try {
      const response = await fetch(ddragonChampionImageUrl(version, image));
      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
      }

      const bytes = Buffer.from(await response.arrayBuffer());
      await fs.mkdir(path.dirname(targetPath), { recursive: true });
      await fs.writeFile(targetPath, bytes);
      await Champion.updateOne({ _id: champion._id }, { $set: { image: targetUrl } });
      result.downloaded += 1;
    } catch (error: any) {
      result.failed.push({
        championId,
        image,
        reason: error?.message || 'Unknown download error',
      });
    }
  }

  return result;
}
