const express = require('express');
const router = express.Router();
const riot = require('../lib/riotClient');
const { spectator } = require("../lib/riotClient");




//GET /account/:gameName/:tagLine
router.get('/account/:gameName/:tagLine', (req, res) => {
    try {
        const { gameName, tagLine } = req.params;
        riot.getAccount(gameName, tagLine)
            .then(data => res.json(data))
            .catch(err => {
                const status = err.response?.status || 500;
                res.status(status).json({error: err.message});
            });
    } catch(err) {
        const status = err.response?.status || 500;
        res.status(status).json({error: err.message});
    }
})


//GET /spactator/:puuid
router.get('/spectator/:puuid', async (req, res) => {
    try {
        const { puuid } = req.params;
        const data = await spectator(puuid);
        res.json(data);
    } catch (err) {
        const status = err.response?.status || 500;
        res.status(status).json({error: err.message});
    }
});

module.exports = router;