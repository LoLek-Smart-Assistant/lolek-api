let currentPatch: string | null = null;
let lastPatch = 0;

export async function getLatestVersion(): Promise<string> {
  const now = Date.now();
  if (!currentPatch || now - lastPatch > 24 * 60 * 60 * 1000) {
    const resp = await fetch('https://ddragon.leagueoflegends.com/api/versions.json');
    if (!resp.ok) throw new Error(`Failed to fetch versions: ${resp.status}`);
    const versions: string[] = await resp.json();
    currentPatch = versions[0];
    lastPatch = now;
  }
  return currentPatch as string;
}

export default { getLatestVersion };

