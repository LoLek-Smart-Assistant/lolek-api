let curentPatch = null;
let lastPatch = 0;


async function getLatestVersion () {
    const now = Date.now();

    if(!curentPatch || now - lastPatch > 24 * 60 * 60 * 1000) {
        const response = await fetch('https://ddragon.leagueoflegends.com/api/versions.json');
        if (!response.ok) {
            throw new Error(`Failed to fetch versions: ${response.status} ${response.statusText}`);
        }

        const versions = await response.json();
        curentPatch = versions[0];
        lastPatch = now;
    }
    return curentPatch;
}

module.exports = {
    getLatestVersion
}