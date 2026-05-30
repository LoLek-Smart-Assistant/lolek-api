#!/usr/bin/env ts-node
/**
 * scripts/applyItemTagsFromJson.ts
 *
 * Reads a JSON file that maps item names to custom tags and applies them to
 * the `customTags` field on `Item` documents in the database.
 *
 * Accepted input JSON formats:
 *
 * 1) Array of entries:
 * [
 *   { "itemName": "Thornmail", "customTags": ["shield","anti_healing"] },
 *   { "itemName": "Heartsteel", "customTags": ["percent_health_damage"] }
 * ]
 *
 * 2) Object map:
 * {
 *   "Thornmail": ["shield","anti_healing"],
 *   "Heartsteel": ["percent_health_damage"]
 * }
 *
 * Usage:
 *   npx ts-node scripts/applyItemTagsFromJson.ts
 *
 * Notes:
 *  - The script uses your project's `connectDB()` (src/mongoDB/db.ts).
 *  - Matching: first tries case-insensitive exact match on itemName, then
 *    falls back to case-insensitive partial match.
 *  - Existing `customTags` are preserved and merged (duplicates removed).
 */

const PathToItemTags = ".\\src\\item-tags\\item-tags.json";

import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import connectDB from '../mongoDB/db';
import Item from '../models/Items';

type MappingEntry = {
    itemName: string;
    customTags: string[];
};

function normalizeTag(t: string) {
    return t.trim();
}

async function loadMappings(filePath: string): Promise<MappingEntry[]> {
    const raw = fs.readFileSync(filePath, { encoding: 'utf8' });
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
        // Expect array of { itemName, customTags }
        return parsed
            .map((p) => ({
                itemName: String(p.itemName),
                customTags: Array.isArray(p.customTags) ? p.customTags.map(String) : [],
            }))
            .filter((e) => e.itemName && e.customTags.length > 0);
    } else if (parsed && typeof parsed === 'object') {
        // Map form: { "ItemName": ["tag1","tag2"], ... }
        return Object.entries(parsed).map(([itemName, tags]) => ({
            itemName,
            customTags: Array.isArray(tags) ? tags.map(String) : [],
        })).filter((e) => e.itemName && e.customTags.length > 0);
    } else {
        throw new Error('Unsupported JSON format for mappings');
    }
}

async function findItemByName(itemName: string) {
    // Try case-insensitive exact match first
    const exact = await Item.findOne({ itemName: { $regex: `^${escapeRegExp(itemName)}$`, $options: 'i' } });
    if (exact) return exact;

    // Fallback: partial match (contains), case-insensitive
    const partial = await Item.findOne({ itemName: { $regex: escapeRegExp(itemName), $options: 'i' } });
    return partial;
}

function escapeRegExp(s: string) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function main() {
    const filePath = path.join(process.cwd(), PathToItemTags);

    if (!fs.existsSync(filePath)) {
        console.error('Mapping file not found:', filePath);
        process.exit(2);
    }

    let mappings: MappingEntry[] = [];
    try {
        mappings = await loadMappings(filePath);
    } catch (err) {
        console.error('Failed to parse mapping file:', err);
        process.exit(3);
    }

    if (mappings.length === 0) {
        console.log('No valid mappings found in file.');
        process.exit(0);
    }

    console.log(`Loaded ${mappings.length} mappings from ${filePath}`);
    console.log('Connecting to MongoDB...');

    try {
        await connectDB();
    } catch (err) {
        console.error('DB connection failed:', err);
        process.exit(4);
    }

    let applied = 0;
    let notFound = 0;
    let errors = 0;

    for (const entry of mappings) {
        try {
            const tags = entry.customTags.map(normalizeTag).filter(Boolean);
            if (tags.length === 0) {
                console.log(`Skipping ${entry.itemName}: no tags`);
                continue;
            }

            const item = await findItemByName(entry.itemName);
            if (!item) {
                console.warn(`Item not found: ${entry.itemName}`);
                notFound++;
                continue;
            }

            const existing: string[] = Array.isArray(item.customTags)
                ? item.customTags
                : [];

            const merged = Array.from(
                new Set([...existing.map(String), ...tags])
            );

            console.log(`Item: ${item.itemName} (id=${item.itemId || 'n/a'})`);
            console.log('  existing:', existing);
            console.log('  add   :', tags);
            console.log('  merged:', merged);

            item.customTags = merged;
            await item.save();
            applied++;
        } catch (err) {
            console.error(`Failed to apply tags for ${entry.itemName}:`, err);
            errors++;
        }
    }

    try {
        await mongoose.disconnect();
    } catch (_) {}

    console.log('Finished.');
    console.log(`applied=${applied}, notFound=${notFound}, errors=${errors}`);
    process.exit(0);
}

main().catch((err) => {
    console.error('Unexpected error:', err);
    process.exit(99);
});