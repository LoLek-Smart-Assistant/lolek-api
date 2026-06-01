import fs from "fs/promises";
import path from "path";
import { chromium } from "playwright";

type ChampionLink = {
  name: string;
  href: string;
};

type ScrapeResult = {
  sourceUrl: string;
  scrapedAt: string;
  champions: ChampionLink[];
};

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36";

async function scrapeChampionLinks(url: string): Promise<ChampionLink[]> {
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
    await page.waitForSelector(
      "#shell-body > div.hyper-loader-content > div > section > section:nth-child(4) > section > div",
      { timeout: 30_000 }
    );

    const links = await page.evaluate(() => {
      const container = document.querySelector(
        "#shell-body > div.hyper-loader-content > div > section > section:nth-child(4) > section > div"
      );
      if (!container) {
        return [] as { name: string; href: string }[];
      }

      const anchors = Array.from(container.querySelectorAll("a[href]"));
      const seen = new Set<string>();
      const results: { name: string; href: string }[] = [];

      for (const anchor of anchors) {
        const href = anchor.getAttribute("href")?.trim();
        if (!href) {
          continue;
        }

        if (seen.has(href)) {
          continue;
        }

        const name = anchor.getAttribute("aria-label")?.trim()
          ?? anchor.textContent?.trim()
          ?? "";

        seen.add(href);
        results.push({ name, href });
      }

      return results;
    });

    return links.map((entry) => ({
      name: entry.name || entry.href.split("/").filter(Boolean).slice(-1)[0] || entry.href,
      href: entry.href,
    }));
  } finally {
    await page.close();
    await context.close();
    await browser.close();
  }
}

async function run(): Promise<void> {
  const url = "https://www.metasrc.com/lol/mayhem";
  const champions = await scrapeChampionLinks(url);

  const result: ScrapeResult = {
    sourceUrl: url,
    scrapedAt: new Date().toISOString(),
    champions,
  };

  const outDir = path.resolve(__dirname);
  const outPath = path.join(outDir, "mayhem-champions.json");

  await fs.writeFile(outPath, JSON.stringify(result, null, 2), "utf8");

  console.log(`Saved mayhem champions to: ${outPath}`);
  console.log(JSON.stringify(result, null, 2));
}

run().catch((err) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`Scrape failed: ${message}`);
  process.exit(1);
});
