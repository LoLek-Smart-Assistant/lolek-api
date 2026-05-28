import mongoose from 'mongoose';
import Item from '../models/Items';

export let items: string[] = [];

let loadPromise: Promise<string[]> | null = null;

const fallbackItems = [
  'Abyssal Mask',
  "Archangel's Staff",
  "Banshee's Veil",
  "Berserker's Greaves",
  'Black Cleaver',
  'Blade of The Ruined King',
  'Bloodthirster',
  'Bramble Vest',
  'Chempunk Chainsword',
  'Chemtech Putrifier',
  'Cosmic Drive',
  'Cryptbloom',
  'Dead Man\'s Plate',
  "Death's Dance",
  "Doran's Blade",
  "Doran's Ring",
  "Doran's Shield",
  'Edge of Night',
  'Essence Reaver',
  'Experimental Hexplate',
  'Force of Nature',
  'Frozen Heart',
  'Guardian Angel',
  "Guinsoo's Rageblade",
  'Hollow Radiance',
  'Heartsteel',
  'Hexdrinker',
  'Hextech Rocketbelt',
  'Iceborn Gauntlet',
  'Infinity Edge',
  'Jak\'Sho, The Protean',
  "Kaenic Rookern",
  'Kraken Slayer',
  "Lich Bane",
  "Liandry's Torment",
  "Lord Dominik's Regards",
  "Maw of Malmortius",
  "Mercurial Scimitar",
  "Mercury's Treads",
  'Moonstone Renewer',
  'Morellonomicon',
  'Mortal Reminder',
  "Nashor's Tooth",
  'Navori Flickerblade',
  'Phantom Dancer',
  "Rabadon's Deathcap",
  'Randuin\'s Omen',
  'Rapid Firecannon',
  'Ravenous Hydra',
  'Redemption',
  'Rod of Ages',
  'Riftmaker',
  'Runaan\'s Hurricane',
  'Shadowflame',
  "Serylda's Grudge",
  "Serpent's Fang",
  "Shurelya's Battlesong",
  "Spear of Shojin",
  "Spirit Visage",
  "Statikk Shiv",
  "Sterak's Gage",
  'Stormsurge',
  'Sunfire Aegis',
  'The Collector',
  'Thornmail',
  'Titanic Hydra',
  'Trinity Force',
  'Umbral Glaive',
  'Void Staff',
  "Warmog's Armor",
  "Winter's Approach",
  "Youmuu's Ghostblade",
  "Zeke's Convergence",
  "Zhonya's Hourglass",
].map((item) => item.replace(/\\'/g, "'"));

async function loadItemsFromDatabase(): Promise<string[]> {
  if (mongoose.connection.readyState !== 1) {
    return [];
  }

  const docs = await Item.find({}, { itemName: 1, _id: 0 }).lean();
  return docs
    .map((doc) => doc.itemName)
    .filter((name): name is string => Boolean(name?.trim()))
    .map((name) => name.trim());
}

export async function loadItems(): Promise<string[]> {
  if (items.length > 0) {
    return items;
  }

  if (!loadPromise) {
    loadPromise = (async () => {
      try {
        const fromDb = await loadItemsFromDatabase();
        if (fromDb.length > 0) {
          items = Array.from(new Set(fromDb)).sort((a, b) => a.localeCompare(b));
          return items;
        }
      } catch {
        // Fallback to curated names when MongoDB is unavailable.
      }

      items = Array.from(new Set(fallbackItems)).sort((a, b) => a.localeCompare(b));
      return items;
    })();
  }

  return loadPromise;
}

