import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import Champion from '../models/Champion';

export let champions: string[] = [];

let loadPromise: Promise<string[]> | null = null;

const championNameOverrides: Record<string, string> = {
  Chogath: "Cho'Gath",
  Kaisa: "Kai'Sa",
  Khazix: "Kha'Zix",
  KogMaw: "Kog'Maw",
  KSante: "K'Sante",
  Leblanc: 'LeBlanc',
  LeeSin: 'Lee Sin',
  DrMundo: 'Dr. Mundo',
  MasterYi: 'Master Yi',
  MissFortune: 'Miss Fortune',
  MonkeyKing: 'Wukong',
  RekSai: "Rek'Sai",
  TahmKench: 'Tahm Kench',
  TwistedFate: 'Twisted Fate',
  Velkoz: "Vel'Koz",
  XinZhao: 'Xin Zhao',
  AurelionSol: 'Aurelion Sol',
  JarvanIV: 'Jarvan IV',
  Nunu: 'Nunu & Willump',
  Renata: 'Renata Glasc',
};

function formatChampionStem(stem: string): string {
  if (championNameOverrides[stem]) {
    return championNameOverrides[stem];
  }

  return stem
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]{2,})([A-Z][a-z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();
}

async function loadChampionsFromDatabase(): Promise<string[]> {
  if (mongoose.connection.readyState !== 1) {
    return [];
  }

  const docs = await Champion.find({}, { championName: 1, _id: 0 }).lean();
  return docs
    .map((doc) => doc.championName)
    .filter((name): name is string => Boolean(name?.trim()))
    .map((name) => name.trim());
}

function loadChampionsFromAssets(): string[] {
  const championsDir = path.join(process.cwd(), 'public', 'champions', '16.10.1');

  if (!fs.existsSync(championsDir)) {
    return [];
  }

  return fs
    .readdirSync(championsDir)
    .filter((file) => file.toLowerCase().endsWith('.png'))
    .map((file) => path.parse(file).name)
    .map((stem) => formatChampionStem(stem));
}

export async function loadChampions(): Promise<string[]> {
  if (champions.length > 0) {
    return champions;
  }

  if (!loadPromise) {
    loadPromise = (async () => {
      try {
        const fromDb = await loadChampionsFromDatabase();
        if (fromDb.length > 0) {
          champions = Array.from(new Set(fromDb)).sort((a, b) => a.localeCompare(b));
          return champions;
        }
      } catch {
        // Fallback to local assets when MongoDB is unavailable.
      }

      champions = Array.from(new Set(loadChampionsFromAssets())).sort((a, b) => a.localeCompare(b));
      return champions;
    })();
  }

  return loadPromise;
}

