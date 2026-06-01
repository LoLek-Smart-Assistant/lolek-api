import fs from "fs/promises";
import path from "path";
import { chromium } from "playwright";

type SlottedItem = {
  itemId: number;
  slot: number | number[];
};

type ChampionListEntry = {
  name: string;
  href: string;
};

type ChampionCoreResult = {
  name: string;
  id: string;
  coreItems: SlottedItem[];
  slot4Items: number[];
  slot5Items: number[];
  slot6Items: number[];
};

type ScrapeResult = {
  version: string | null;
  champion: string;
  sourceUrl: string;
  scrapedAt: string;
  coreItems: SlottedItem[];
  slot4Items: number[];
  slot5Items: number[];
  slot6Items: number[];
};

type BatchScrapeResult = {
  version: string | null;
  sourceUrl: string;
  scrapedAt: string;
  champions: ChampionCoreResult[];
};

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36";

function uniqSorted(nums: number[]): number[] {
  return [...new Set(nums)].sort((a, b) => a - b);
}

function extractItemIds(html: string): number[] {
  const ids = new Set<number>();

  const patterns = [
    /[\/_-]item[\/_-](\d{3,6})/gi,
    /items?[\/_-](\d{3,6})/gi,
    /data-item-id=["']?(\d{3,6})["']?/gi,
    /\/lol\/item\/(\d{3,6})\b/gi,
  ];

  for (const pattern of patterns) {
    for (const match of html.matchAll(pattern)) {
      const id = Number(match[1]);
      if (Number.isInteger(id)) {
        ids.add(id);
      }
    }
  }

  return uniqSorted([...ids]);
}

async function scrapeSectionsWithSelectors(url: string): Promise<{
  versionText: string | null;
  corePrimaryItemIds: number[];
  slot4ItemIds: number[];
  slot5ItemIds: number[];
  slot6ItemIds: number[];
}> {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: USER_AGENT,
    locale: "en-US",
    extraHTTPHeaders: {
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
      DNT: "1",
      "Upgrade-Insecure-Requests": "1",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "same-origin",
      "Sec-Fetch-User": "?1",
      "sec-ch-ua": "\"Chromium\";v=136, \"Not:A-Brand\";v=24, \"Google Chrome\";v=136",
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": "\"Windows\"",
      Referer: "https://www.metasrc.com/",
    },
  });
  const page = await context.newPage();

  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForSelector("#build-section-content", { timeout: 30_000 });

    const versionText = await page.evaluate(() => {
      const el = document.querySelector(
        "#dropdown-2bec5e461d9f563ade4c62b8b84ad60b > div.link.cursor-pointer.gap-3.ltr\\:after\\:ml-auto.rtl\\:after\\:mr-auto.after\\:content-caret.after\\:flex.after\\:justify-center.after\\:items-center.after\\:transition-transform.after\\:transform.flex.group.items-center.p-2.bg-metasrc-300.border.border-black.w-full.hover\\:text-META_COLOR.after\\:rotate-caret-down.rounded-md > div"
      );
      return el?.textContent?.trim() ?? null;
    });

    const getSectionHtml = async (selector: string): Promise<string> => {
      const handle = page.locator(selector).first();
      if ((await handle.count()) === 0) {
        return "";
      }
      return handle.evaluate((el) => (el as HTMLElement).outerHTML ?? "");
    };

    const getCombinedSectionHtml = async (selectors: string[]): Promise<string> => {
      const chunks: string[] = [];
      for (const selector of selectors) {
        const html = await getSectionHtml(selector);
        if (html) {
          chunks.push(html);
        }
      }
      return chunks.join("\n");
    };

    const getItemIdsFromSelector = async (selector: string): Promise<number[]> =>
      page.evaluate((sel) => {
        const container = document.querySelector(sel);
        if (!container) {
          return [];
        }

          const nodes = container.querySelectorAll("a[href*='/lol/item/']");
          const dataNodes = container.querySelectorAll("[data-item-id]");
          const imgNodes = container.querySelectorAll("img[src*='/item/']");

          const orderedNodes = nodes.length
            ? nodes
            : dataNodes.length
              ? dataNodes
              : imgNodes;
        const ids: number[] = [];
        const seen = new Set<number>();

        for (const node of orderedNodes) {
          let id: number | null = null;
          const dataId = (node as HTMLElement).getAttribute("data-item-id");
          if (dataId) {
            const parsed = Number(dataId);
            if (Number.isInteger(parsed)) {
              id = parsed;
            }
          }

          if (id == null) {
            const href = (node as HTMLElement).getAttribute("href");
            if (href) {
              const match = href.match(/\/lol\/item\/(\d{3,6})\b/i);
              if (match) {
                id = Number(match[1]);
              }
            }
          }

          if (id == null) {
            const src = (node as HTMLElement).getAttribute("src");
            if (src) {
              const match = src.match(/\/item\/(\d{3,6})\b/i);
              if (match) {
                id = Number(match[1]);
              }
            }
          }

          if (id != null && !seen.has(id)) {
            seen.add(id);
            ids.push(id);
          }
        }

        return ids;
      }, selector);

    const getItemIdsByChild = async (selector: string): Promise<number[]> =>
      page.evaluate((sel) => {
        const container = document.querySelector(sel);
        if (!container) {
          return [];
        }

        const children = Array.from(container.querySelectorAll(":scope > *"));
        const ids: number[] = [];
        const seen = new Set<number>();

        const pickId = (root: Element): number | null => {
          const dataNode = root.querySelector("[data-item-id]");
          const dataId = dataNode?.getAttribute("data-item-id");
          if (dataId) {
            const parsed = Number(dataId);
            if (Number.isInteger(parsed)) {
              return parsed;
            }
          }

          const hrefNode = root.querySelector("a[href*='/lol/item/']");
          const href = hrefNode?.getAttribute("href");
          if (href) {
            const match = href.match(/\/lol\/item\/(\d{3,6})\b/i);
            if (match) {
              return Number(match[1]);
            }
          }

          const imgNode = root.querySelector("img[src*='/item/']");
          const src = imgNode?.getAttribute("src");
          if (src) {
            const match =
              src.match(/\/item\/(\d{3,6})\b/i) ??
              src.match(/-(\d{3,6})\.png\b/i);
            if (match) {
              return Number(match[1]);
            }
          }

          return null;
        };

        if (children.length) {
          for (const child of children) {
            const id = pickId(child);
            if (id != null && !seen.has(id)) {
              seen.add(id);
              ids.push(id);
            }
          }
          return ids;
        }

        const fallbackNodes = container.querySelectorAll(
          "a[href*='/lol/item/'], [data-item-id], img[src*='/item/']"
        );
        for (const node of fallbackNodes) {
          const id = pickId(node);
          if (id != null && !seen.has(id)) {
            seen.add(id);
            ids.push(id);
          }
        }

        return ids;
      }, selector);

    const getItemIdsByNthChild = async (selector: string, maxChildren: number): Promise<number[]> =>
      page.evaluate(
        ({ sel, max }) => {
          const container = document.querySelector(sel);
          if (!container) {
            return [];
          }

          const ids: number[] = [];
          const seen = new Set<number>();

          const pickId = (root: Element): number | null => {
            const dataNode = root.querySelector("[data-item-id]");
            const dataId = dataNode?.getAttribute("data-item-id");
            if (dataId) {
              const parsed = Number(dataId);
              if (Number.isInteger(parsed)) {
                return parsed;
              }
            }

            const hrefNode = root.querySelector("a[href*='/lol/item/']");
            const href = hrefNode?.getAttribute("href");
            if (href) {
              const match = href.match(/\/lol\/item\/(\d{3,6})\b/i);
              if (match) {
                return Number(match[1]);
              }
            }

            const imgNode = root.querySelector("img[src*='/item/']");
            const src = imgNode?.getAttribute("src");
            if (src) {
              const match = src.match(/\/item\/(\d{3,6})\b/i);
              if (match) {
                return Number(match[1]);
              }
            }

            return null;
          };

          for (let i = 1; i <= max; i += 1) {
            const child = container.querySelector(`:scope > div:nth-child(${i})`);
            if (!child) {
              continue;
            }
            const id = pickId(child);
            if (id != null && !seen.has(id)) {
              seen.add(id);
              ids.push(id);
            }
          }

          return ids;
        },
        { sel: selector, max: maxChildren }
      );

    const getItemIdsByImageSelector = async (
      baseSelector: string,
      maxChildren: number
    ): Promise<number[]> =>
      page.evaluate(
        ({ sel, max }) => {
          const ids: number[] = [];
          const seen = new Set<number>();

          for (let i = 1; i <= max; i += 1) {
            const img = document.querySelector(
              `${sel} > div:nth-child(${i}) > div > img[src*='/item/']`
            ) as HTMLImageElement | null;
            const src = img?.getAttribute("src");
            if (!src) {
              continue;
            }

            const match = src.match(/\/item\/(\d{3,6})\b/i);
            if (!match) {
              continue;
            }

            const id = Number(match[1]);
            if (Number.isInteger(id) && !seen.has(id)) {
              seen.add(id);
              ids.push(id);
            }
          }

          return ids;
        },
        { sel: baseSelector, max: maxChildren }
      );

    const getItemIdsByImageSelectorTemplate = async (
      template: string,
      maxChildren: number
    ): Promise<number[]> =>
      page.evaluate(
        ({ tpl, max }) => {
          const ids: number[] = [];
          const seen = new Set<number>();

          for (let i = 1; i <= max; i += 1) {
            const selector = tpl.replace("{i}", String(i));
            let img = document.querySelector(selector) as HTMLImageElement | null;
            if (!img) {
              const baseSelector = selector.replace(/\s*>\s*img[^>]*$/i, "");
              if (baseSelector !== selector) {
                img = document.querySelector(
                  `${baseSelector} img[src*='/item/']`
                ) as HTMLImageElement | null;
              }
            }
            const src = img?.getAttribute("src");
            if (!src) {
              continue;
            }

            const match =
              src.match(/\/item\/(\d{3,6})\b/i) ??
              src.match(/-(\d{3,6})\.png\b/i);
            if (!match) {
              continue;
            }

            const id = Number(match[1]);
            if (Number.isInteger(id) && !seen.has(id)) {
              seen.add(id);
              ids.push(id);
            }
          }

          return ids;
        },
        { tpl: template, max: maxChildren }
      );

    const getItemIdsByNthChildXPath = async (xpath: string, maxChildren: number): Promise<number[]> =>
      page.evaluate(
        ({ xp, max }) => {
          const result = document.evaluate(
            xp,
            document,
            null,
            XPathResult.FIRST_ORDERED_NODE_TYPE,
            null
          );
          const container = result.singleNodeValue as Element | null;
          if (!container) {
            return [];
          }

          const ids: number[] = [];
          const seen = new Set<number>();

          const pickId = (root: Element): number | null => {
            const dataNode = root.querySelector("[data-item-id]");
            const dataId = dataNode?.getAttribute("data-item-id");
            if (dataId) {
              const parsed = Number(dataId);
              if (Number.isInteger(parsed)) {
                return parsed;
              }
            }

            const hrefNode = root.querySelector("a[href*='/lol/item/']");
            const href = hrefNode?.getAttribute("href");
            if (href) {
              const match = href.match(/\/lol\/item\/(\d{3,6})\b/i);
              if (match) {
                return Number(match[1]);
              }
            }

            const imgNode = root.querySelector("img[src*='/item/']");
            const src = imgNode?.getAttribute("src");
            if (src) {
              const match = src.match(/\/item\/(\d{3,6})\b/i);
              if (match) {
                return Number(match[1]);
              }
            }

            return null;
          };

          for (let i = 1; i <= max; i += 1) {
            const child = container.querySelector(`:scope > div:nth-child(${i})`);
            if (!child) {
              continue;
            }
            const id = pickId(child);
            if (id != null && !seen.has(id)) {
              seen.add(id);
              ids.push(id);
            }
          }

          return ids;
        },
        { xp: xpath, max: maxChildren }
      );

    const corePrimaryHtml = await getSectionHtml(
      "#build-section-content > div.hyper-loader-content.w-full > div > div > div.grid.grid-cols-1.gap-2.w-full.\\@desktop\\:grid-cols-2 > div.flex.min-w-0.\\@desktop\\:col-start-2.\\@desktop\\:row-start-3 > section > section > div > div > div.flex.shrink-0.gap-2.items-start.justify-center.\\@full\\:justify-start > div.group.flex.flex-col.items-center > div.flex.items-center.justify-center > div > div > div"
    );
    const slot4Html = await getSectionHtml(
      "#build-section-content > div.hyper-loader-content.w-full > div > div > div.flex.w-full.flex-row.flex-wrap.gap-2.\\@full\\:grid.\\@full\\:grid-cols-6 > div:nth-child(1) > section > section"
    );
    const slot5Html = await getSectionHtml(
      "#build-section-content > div.hyper-loader-content.w-full > div > div > div.flex.w-full.flex-row.flex-wrap.gap-2.\\@full\\:grid.\\@full\\:grid-cols-6 > div:nth-child(2) > section > section"
    );
    const slot6Html = await getSectionHtml(
      "#build-section-content > div.hyper-loader-content.w-full > div > div > div.flex.w-full.flex-row.flex-wrap.gap-2.\\@full\\:grid.\\@full\\:grid-cols-6 > div:nth-child(3) > section > section"
    );

    const slot4ItemIds = extractItemIds(slot4Html);
    const slot5ItemIds = extractItemIds(slot5Html);
    const slot6ItemIds = extractItemIds(slot6Html);

    const coreSlotItemIds = await getItemIdsByImageSelectorTemplate(
      "#build-section-content > div.hyper-loader-content.w-full > div > div > div.grid.grid-cols-1.gap-2.w-full.\\@desktop\\:grid-cols-2 > div.flex.min-w-0.\\@desktop\\:col-start-2.\\@desktop\\:row-start-3 > section > section > div > div > div.flex.shrink-0.gap-2.items-start.justify-center.\\@full\\:justify-start > div.group.flex.flex-col.items-center > div.flex.items-center.justify-center > div > div > div > div:nth-child({i}) > div > img",
      3
    );
    const corePrimaryItemIds = coreSlotItemIds.length
      ? coreSlotItemIds.slice(0, 3)
      : extractItemIds(corePrimaryHtml);

    const slot4SelectorBase =
      "#build-section-content > div.hyper-loader-content.w-full > div > div > div.flex.w-full.flex-row.flex-wrap.gap-2.\\@full\\:grid.\\@full\\:grid-cols-6 > div:nth-child(1) > section > section > div > div.flex.flex-row.gap-2.justify-center";
    const slot4SlotItemIds = await getItemIdsByImageSelectorTemplate(
      `${slot4SelectorBase} > div:nth-child({i}) > div.relative.flex.items-center.justify-center > div > img`,
      12
    );
    const slot5SelectorBase =
      "#build-section-content > div.hyper-loader-content.w-full > div > div > div.flex.w-full.flex-row.flex-wrap.gap-2.\\@full\\:grid.\\@full\\:grid-cols-6 > div:nth-child(2) > section > section > div > div.flex.flex-row.gap-2.justify-center";
    const slot5SlotItemIds = await getItemIdsByImageSelectorTemplate(
      `${slot5SelectorBase} > div:nth-child({i}) > div.relative.flex.items-center.justify-center > div > img`,
      12
    );
    const slot6SelectorBase =
      "#build-section-content > div.hyper-loader-content.w-full > div > div > div.flex.w-full.flex-row.flex-wrap.gap-2.\\@full\\:grid.\\@full\\:grid-cols-6 > div:nth-child(3) > section > section > div > div.flex.flex-row.gap-2.justify-center";
    const slot6SlotItemIds = await getItemIdsByImageSelectorTemplate(
      `${slot6SelectorBase} > div:nth-child({i}) > div.relative.flex.items-center.justify-center > div > img`,
      12
    );

    return {
      versionText,
      corePrimaryItemIds,
      slot4ItemIds: slot4SlotItemIds.length ? slot4SlotItemIds : slot4ItemIds,
      slot5ItemIds: slot5SlotItemIds.length ? slot5SlotItemIds : slot5ItemIds,
      slot6ItemIds: slot6SlotItemIds.length ? slot6SlotItemIds : slot6ItemIds,
    };
  } finally {
    await page.close();
    await context.close();
    await browser.close();
  }
}

async function run(): Promise<void> {
  const target = (process.argv[2] ?? "all").toLowerCase();
  const outDir = path.resolve(__dirname);

  if (target === "all") {
    const listPath = path.join(outDir, "mayhem-champions.json");
    const listRaw = await fs.readFile(listPath, "utf8");
    const listJson = JSON.parse(listRaw) as { champions?: ChampionListEntry[] };
    const champions = listJson.champions ?? [];

    const results: ChampionCoreResult[] = [];
    let versionText: string | null = null;

    for (const entry of champions) {
      const href = entry.href ?? "";
      const id = href.split("/").filter(Boolean).slice(-1)[0] ?? "";
      if (!href || !id) {
        continue;
      }

      const selectorData = await scrapeSectionsWithSelectors(href);
      if (!versionText && selectorData.versionText) {
        versionText = selectorData.versionText;
      }
      const slot4 = selectorData.slot4ItemIds;
      const slot5 = selectorData.slot5ItemIds;
      const slot6 = selectorData.slot6ItemIds;
      const coreItems: SlottedItem[] = selectorData.corePrimaryItemIds.map((itemId, index) => ({
        itemId,
        slot: index + 1,
      }));
      results.push({
        name: entry.name,
        id,
        coreItems,
        slot4Items: slot4,
        slot5Items: slot5,
        slot6Items: slot6,
      });

      console.log(`Scrape complete: ${entry.name} (${id})`);
    }

    const result: BatchScrapeResult = {
      version: versionText,
      sourceUrl: "https://www.metasrc.com/lol/mayhem",
      scrapedAt: new Date().toISOString(),
      champions: results,
    };

    const outPath = path.join(outDir, "mayhem-core-items.json");
    await fs.writeFile(outPath, JSON.stringify(result, null, 2), "utf8");

    console.log(`Saved mayhem core items to: ${outPath}`);
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  const champion = target;
  const buildUrl = `https://www.metasrc.com/lol/mayhem/build/${champion}`;
  const selectorData = await scrapeSectionsWithSelectors(buildUrl);

  const slot4 = selectorData.slot4ItemIds;
  const slot5 = selectorData.slot5ItemIds;
  const slot6 = selectorData.slot6ItemIds;
  const coreItems: SlottedItem[] = selectorData.corePrimaryItemIds.map((itemId, index) => ({
    itemId,
    slot: index + 1,
  }));
  const result: ScrapeResult = {
    version: selectorData.versionText,
    champion,
    sourceUrl: buildUrl,
    scrapedAt: new Date().toISOString(),
    coreItems,
    slot4Items: slot4,
    slot5Items: slot5,
    slot6Items: slot6,
  };

  const outPath = path.join(outDir, `mayhem-${champion}-items.json`);

  await fs.writeFile(outPath, JSON.stringify(result, null, 2), "utf8");

  console.log(`Saved ${champion} mayhem build data to: ${outPath}`);
  console.log(JSON.stringify(result, null, 2));
}

run().catch((err) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`Scrape failed: ${message}`);
  process.exit(1);
});
