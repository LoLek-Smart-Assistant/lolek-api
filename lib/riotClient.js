const axios = require('axios');
require('dotenv').config();

const API_KEY = process.env.RIOT_API_KEY;
if (!API_KEY) {
    console.warn("No API key found for RIOT_API_KEY");
}

const riot = axios.create({
    baseURL: 'https://europe.api.riotgames.com',
    headers: {
        'X-Riot-Token': API_KEY,
    },
    timeout: 10000
});

// Debug: show if header is present for each request (remove in production)
riot.interceptors.request.use(cfg => {
    // don't print actual key - just presence
    console.log('Riot request:', cfg.method?.toUpperCase(), cfg.url, 'X-Riot-Token present=', !!(cfg.headers && (cfg.headers['X-Riot-Token'] || cfg.headers['x-riot-token'])));
    return cfg;
});

async function getAccount(gameName, tagLine) {
    const res = await riot.get(`/riot/account/v1/accounts/by-riot-id/${gameName}/${tagLine}`);
    return res.data;
}

async function spectator(encryptedPUUID) {
    const res = await riot.get(`/lol/spectator/v5/active-games/by-summoner/${encodeURIComponent(encryptedPUUID)}`);
    return res.data;
}

module.exports = {
    spectator,
    getAccount
}