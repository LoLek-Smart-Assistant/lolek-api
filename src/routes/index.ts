import { Router } from 'express';
import { getAccount, getSpectatorById } from '../controllers/summonerController';
import { syncDataHandler } from '../controllers/syncController';

const router = Router();

// GET /account/:gameName/:tagLine
router.get('/account/:gameName/:tagLine', getAccount);

// GET /spectator/:platform/:encryptedId
router.get('/spectator/:platform/:encryptedId', getSpectatorById);

// POST /syncData
router.post('/syncData', syncDataHandler);

export default router;

