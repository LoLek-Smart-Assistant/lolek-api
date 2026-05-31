import { Router } from 'express';
import { getAccount, getSpectatorByPuuid } from '../controllers/summonerController';
import { getItems, getMayhemSuggestedItems } from '../controllers/itemsController';
import {
	createCustomPlayedMatch,
	getPlayedMatches,
	savePlayedMatch,
} from '../controllers/playedMatchController';
import { syncDataHandler } from '../controllers/syncController';
import {logIn, logOut, refresh, signIn} from "../controllers/authController";
import {authMiddleware} from "../middleware/authMiddleware";
import {getProfile, getRiotProfile, linkRiotProfile, removeRiotProfile, deleteUser} from "../controllers/userController";
import { transcribeVoice, voiceUploadMiddleware } from '../controllers/voiceController';

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
router.post('/user/remove-riot-profile', authMiddleware, removeRiotProfile);
router.delete('/user', authMiddleware, deleteUser);

// Summoner routes (public)
router.get('/riot-account/:gameName/:tagLine', getAccount);
router.get('/live-game/:platform/:puuid', getSpectatorByPuuid);
// Items
router.get('/items', getItems);
router.get('/mayhem-suggested-items', getMayhemSuggestedItems);

// Played matches (protected)
router.get('/played-matches', authMiddleware, getPlayedMatches);
router.post('/played-matches', authMiddleware, savePlayedMatch);
router.post('/played-matches/custom', authMiddleware, createCustomPlayedMatch);


// Voice transcription
router.post('/voice/transcribe', voiceUploadMiddleware, transcribeVoice);

// live-game-summary is now a WebSocket endpoint at /live-game-summary

// Sync route (public)
router.post('/syncData', syncDataHandler);

export default router;
