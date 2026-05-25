import { Router } from 'express';
import { getAccount, getSpectatorByPuuid } from '../controllers/summonerController';
import { syncDataHandler } from '../controllers/syncController';
import {logIn, logOut, refresh, signIn} from "../controllers/authController";
import {authMiddleware} from "../middleware/authMiddleware";
import {getProfile, getRiotProfile, linkRiotProfile} from "../controllers/userController";

const router = Router();

// Auth routes (public)
router.post('/authentication/sign-in', signIn);
router.post('/authentication/log-in', logIn);
router.post('/authentication/refresh', refresh);
router.post('/authentication/log-out', logOut);

// User routes (protected)
router.get('/user/profile', authMiddleware, getProfile);
router.get('/user/riot-profile', authMiddleware, getRiotProfile);
router.post('/user/link-riot-profile', authMiddleware, linkRiotProfile);

// Summoner routes (public)
router.get('/riot-account/:gameName/:tagLine', getAccount);
router.get('/live-game/:platform/:puuid', getSpectatorByPuuid);

// live-game-summary is now a WebSocket endpoint at /live-game-summary

// Sync route (public)
router.post('/syncData', syncDataHandler);

export default router;

