/**
 * @swagger
 * tags:
 *   - name: Authentication
 *     description: User authentication endpoints
 *   - name: User
 *     description: User profile and account management
 *   - name: Summoner
 *     description: League of Legends summoner information
 *   - name: Sync
 *     description: Data synchronization endpoints
 *   - name: Matches
 *     description: Played match persistence and history
 *   - name: Voice
 *     description: Voice transcription and League terminology parsing
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: MongoDB object ID
 *         username:
 *           type: string
 *           description: Unique username
 *         email:
 *           type: string
 *           format: email
 *           description: User email
 *         password:
 *           type: string
 *           description: Hashed password
 *         riotName:
 *           type: string
 *           description: Linked Riot account game name
 *         riotTag:
 *           type: string
 *           description: Linked Riot account tag
 *         puuid:
 *           type: string
 *           description: Riot puuid
 *         platform:
 *           type: string
 *           description: Riot platform (e.g., NA1, EUW1)
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *       required:
 *         - username
 *         - email
 *         - password
 *     Champion:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: MongoDB object ID
 *         version:
 *           type: string
 *           description: Game version
 *         championId:
 *           type: string
 *           description: Champion ID from Riot API
 *         key:
 *           type: string
 *           description: Champion numeric key from Riot API
 *         championName:
 *           type: string
 *           description: Champion name
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *           description: Champion role tags
 *         image:
 *           type: string
 *           nullable: true
 *           description: Champion image URL
 *     Item:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: MongoDB object ID
 *         version:
 *           type: string
 *           description: Game version
 *         itemId:
 *           type: string
 *           description: Item ID from Riot API
 *         itemName:
 *           type: string
 *           description: Item name
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *           description: Item category tags
 *         image:
 *           type: string
 *           nullable: true
 *           description: Item image URL
 *     PlayedMatchItem:
 *       type: object
 *       properties:
 *         itemId:
 *           type: string
 *         itemName:
 *           type: string
 *         image:
 *           type: string
 *           nullable: true
 *         customTags:
 *           type: array
 *           nullable: true
 *           items:
 *             type: string
 *         slot:
 *           type: integer
 *           nullable: true
 *     PlayedMatchPlayer:
 *       type: object
 *       properties:
 *         summonerName:
 *           type: string
 *         riotId:
 *           type: string
 *           nullable: true
 *         championName:
 *           type: string
 *         championId:
 *           oneOf:
 *             - type: string
 *             - type: integer
 *           nullable: true
 *         role:
 *           type: string
 *           nullable: true
 *         teamPosition:
 *           type: string
 *           nullable: true
 *         items:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/PlayedMatchItem'
 *         kills:
 *           type: integer
 *           nullable: true
 *         deaths:
 *           type: integer
 *           nullable: true
 *         assists:
 *           type: integer
 *           nullable: true
 *         level:
 *           type: integer
 *           nullable: true
 *     PlayedMatchTeam:
 *       type: object
 *       properties:
 *         teamId:
 *           type: string
 *         name:
 *           type: string
 *           nullable: true
 *         won:
 *           type: boolean
 *         players:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/PlayedMatchPlayer'
 *     PlayedMatch:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         matchId:
 *           type: string
 *         userId:
 *           type: string
 *         source:
 *           type: string
 *           enum: [live, manual]
 *         gameMode:
 *           type: string
 *         queue:
 *           type: string
 *           nullable: true
 *         durationSeconds:
 *           type: integer
 *         startedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         endedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         winnerTeamId:
 *           type: string
 *         teams:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/PlayedMatchTeam'
 *     PlayedMatchSyncRequest:
 *       type: object
 *       properties:
 *         count:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           description: Number of latest matches to fetch from Riot API (defaults to 20)
 *     PlayedMatchSyncResponse:
 *       type: object
 *       properties:
 *         synced:
 *           type: integer
 *           description: Number of matches inserted or updated in DB
 *         requested:
 *           type: integer
 *           description: Count requested for sync
 *         totalFetchedIds:
 *           type: integer
 *           description: Number of match IDs returned by Riot API
 *         matches:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/PlayedMatch'
 *     PlayedMatchErrorResponse:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 *     SignInRequest:
 *       type: object
 *       properties:
 *         username:
 *           type: string
 *           description: New username
 *         email:
 *           type: string
 *           format: email
 *           description: User email
 *         password:
 *           type: string
 *           description: Password (min 6 characters)
 *       required:
 *         - username
 *         - email
 *         - password
 *     LoginRequest:
 *       type: object
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: User email
 *         password:
 *           type: string
 *           description: User password
 *       required:
 *         - email
 *         - password
 *     LinkRiotRequest:
 *       type: object
 *       properties:
 *         riotName:
 *           type: string
 *           description: Riot account game name
 *         riotTag:
 *           type: string
 *           description: Riot account tag
 *         platform:
 *           type: string
 *           description: Riot platform (e.g., NA1, EUW1)
 *       required:
 *         - riotName
 *         - riotTag
 *         - platform
 *     AuthResponse:
 *       type: object
 *       properties:
 *         user:
 *           $ref: '#/components/schemas/User'
 *     LiveGameTeamMember:
 *       type: object
 *       properties:
 *         summonerName:
 *           type: string
 *           nullable: true
 *         champion:
 *           $ref: '#/components/schemas/Champion'
 *           nullable: true
 *     LiveGameSummaryResponse:
 *       type: object
 *       properties:
 *         myTeam:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/LiveGameTeamMember'
 *         enemyTeam:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/LiveGameTeamMember'
 *         allChamps:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Champion'
 *         gameDuration:
 *           type: integer
 *           nullable: true
 *         startTime:
 *           type: integer
 *           nullable: true
 *     VoiceIntent:
 *       type: string
 *       enum:
 *         - enemy_build_update
 *         - recommendation_request
 *     ParsedVoiceCommand:
 *       type: object
 *       properties:
 *         intent:
 *           $ref: '#/components/schemas/VoiceIntent'
 *         champion:
 *           type: string
 *           nullable: true
 *           description: Champion name if one was detected in the transcript
 *         items:
 *           type: array
 *           nullable: true
 *           description: Parsed item names found in the transcript
 *           items:
 *             type: string
 *       required:
 *         - intent
 *     VoiceTranscribeRequest:
 *       oneOf:
 *         - type: object
 *           properties:
 *             audio:
 *               type: string
 *               format: binary
 *               description: Uploaded audio file (preferred field name)
 *           required:
 *             - audio
 *         - type: object
 *           properties:
 *             file:
 *               type: string
 *               format: binary
 *               description: Alternate uploaded audio file field name
 *           required:
 *             - file
 *         - type: object
 *           properties:
 *             voice:
 *               type: string
 *               format: binary
 *               description: Alternate uploaded audio file field name
 *           required:
 *             - voice
 *         - type: object
 *           properties:
 *             blob:
 *               type: string
 *               format: binary
 *               description: Alternate uploaded audio file field name
 *           required:
 *             - blob
 *       description: Multipart upload containing one audio file. Accepted field names are audio, file, voice, and blob.
 *     VoiceTranscribeResponse:
 *       type: object
 *       properties:
 *         transcript:
 *           type: string
 *           description: Normalized transcript returned by the Whisper pipeline
 *         parsed:
 *           $ref: '#/components/schemas/ParsedVoiceCommand'
 *       required:
 *         - transcript
 *         - parsed
 *     VoiceErrorResponse:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 *           description: Human-readable error message
 *
 * /authentication/sign-in:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Create a new user account
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SignInRequest'
 *     responses:
 *       200:
 *         description: User created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Invalid input
 *
 * /authentication/log-in:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Login with email and password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       401:
 *         description: Invalid credentials
 *
 * /authentication/log-out:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Logout current user
 *     responses:
 *       200:
 *         description: Logout successful
 *
 * /authentication/refresh:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Refresh access token using refresh cookie
 *     responses:
 *       200:
 *         description: Access token refreshed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       401:
 *         description: Invalid or missing refresh token
 *
 * /user/profile:
 *   get:
 *     tags:
 *       - User
 *     summary: Get current user profile
 *     responses:
 *       200:
 *         description: User profile
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 *
 * /user/riot-profile:
 *   get:
 *     tags:
 *       - User
 *     summary: Get Riot profile data for linked account
 *     responses:
 *       200:
 *         description: Riot profile data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         description: No Riot account linked
 *       401:
 *         description: Unauthorized
 *
 * /user/link-riot-profile:
 *   post:
 *     tags:
 *       - User
 *     summary: Link Riot account to user profile
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LinkRiotRequest'
 *     responses:
 *       200:
 *         description: Riot account linked successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Riot account not found
 *
 * /user/remove-riot-profile:
 *   post:
 *     tags:
 *       - User
 *     summary: Remove linked Riot account from user profile
 *     responses:
 *       200:
 *         description: Riot account removed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Riot profile removed.
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 *
 * /user:
 *   delete:
 *     tags:
 *       - User
 *     summary: Delete the current user account
 *     responses:
 *       200:
 *         description: User deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: User deleted.
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 *
 * /riot-account/{gameName}/{tagLine}:
 *   get:
 *     tags:
 *       - Summoner
 *     summary: Get account by game name and tag line
 *     parameters:
 *       - name: gameName
 *         in: path
 *         required: true
 *         description: Summoner game name
 *         schema:
 *           type: string
 *       - name: tagLine
 *         in: path
 *         required: true
 *         description: Summoner tag line
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Account data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *
 * /live-game/{platform}/{puuid}:
 *   get:
 *     tags:
 *       - Summoner
 *     summary: Get live game spectator data
 *     parameters:
 *       - name: platform
 *         in: path
 *         required: true
 *         description: Platform (e.g., NA1, EUW1)
 *         schema:
 *           type: string
 *       - name: puuid
 *         in: path
 *         required: true
 *         description: Player puuid
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Live game data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *
 * /mayhem-suggested-items:
 *   get:
 *     tags:
 *       - Summoner
 *     summary: Get Mayhem suggested items for one or more champions
 *     description: Provide champion names with either champions=Ahri,Jinx or repeated champion query params.
 *     parameters:
 *       - name: champions
 *         in: query
 *         required: false
 *         description: Comma-separated champion names
 *         schema:
 *           type: string
 *           example: Ahri,Jinx
 *       - name: champion
 *         in: query
 *         required: false
 *         description: Repeated champion query parameter
 *         schema:
 *           type: string
 *           example: Ahri
 *     responses:
 *       200:
 *         description: Mayhem suggested items grouped by champion
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 requestedChampions:
 *                   type: array
 *                   items:
 *                     type: string
 *                 foundCount:
 *                   type: integer
 *                 notFoundChampions:
 *                   type: array
 *                   items:
 *                     type: string
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       championName:
 *                         type: string
 *                       championId:
 *                         type: string
 *                       version:
 *                         type: string
 *                       coreItems:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             itemId:
 *                               type: integer
 *                             itemName:
 *                               type: string
 *                               nullable: true
 *                             image:
 *                               type: string
 *                               nullable: true
 *                             customTags:
 *                               type: array
 *                               nullable: true
 *                               items:
 *                                 type: string
 *                       suggestedItems:
 *                         type: object
 *                         properties:
 *                           slot4Items:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 itemId:
 *                                   type: integer
 *                                 itemName:
 *                                   type: string
 *                                   nullable: true
 *                                 image:
 *                                   type: string
 *                                   nullable: true
 *                                 customTags:
 *                                   type: array
 *                                   nullable: true
 *                                   items:
 *                                     type: string
 *                           slot5Items:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 itemId:
 *                                   type: integer
 *                                 itemName:
 *                                   type: string
 *                                   nullable: true
 *                                 image:
 *                                   type: string
 *                                   nullable: true
 *                                 customTags:
 *                                   type: array
 *                                   nullable: true
 *                                   items:
 *                                     type: string
 *                           slot6Items:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 itemId:
 *                                   type: integer
 *                                 itemName:
 *                                   type: string
 *                                   nullable: true
 *                                 image:
 *                                   type: string
 *                                   nullable: true
 *                                 customTags:
 *                                   type: array
 *                                   nullable: true
 *                                   items:
 *                                     type: string
 *                           allItems:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 itemId:
 *                                   type: integer
 *                                 itemName:
 *                                   type: string
 *                                   nullable: true
 *                                 image:
 *                                   type: string
 *                                   nullable: true
 *                                 customTags:
 *                                   type: array
 *                                   nullable: true
 *                                   items:
 *                                     type: string
 *       400:
 *         description: Missing champion query values
 *
 * /played-matches:
 *   get:
 *     tags:
 *       - Matches
 *     summary: List saved played matches from DB for the authenticated user
 *     responses:
 *       200:
 *         description: Played matches returned successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 matches:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/PlayedMatch'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PlayedMatchErrorResponse'
 *       500:
 *         description: Failed to load played matches
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PlayedMatchErrorResponse'
 *   post:
 *     tags:
 *       - Matches
 *     summary: Fetch Riot match history, upsert into DB, and return saved matches for the authenticated user
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PlayedMatchSyncRequest'
 *     responses:
 *       201:
 *         description: Match history synced successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PlayedMatchSyncResponse'
 *       400:
 *         description: Invalid request or Riot profile not linked
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PlayedMatchErrorResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PlayedMatchErrorResponse'
 *
 * /syncData:
 *   post:
 *     tags:
 *       - Sync
 *     summary: Sync champions and items data from Riot API
 *     responses:
 *       200:
 *         description: Sync completed successfully
 *
 * /voice/transcribe:
 *   post:
 *     tags:
 *       - Voice
 *     summary: Transcribe uploaded audio and parse League of Legends terminology
 *     description: Accepts multipart/form-data with one audio file. Supported file fields are audio, file, voice, and blob.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/VoiceTranscribeRequest'
 *     responses:
 *       200:
 *         description: Transcript normalized and parsed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/VoiceTranscribeResponse'
 *             example:
 *               transcript: Sion built Thornmail and Heartsteel
 *               parsed:
 *                 intent: enemy_build_update
 *                 champion: Sion
 *                 items:
 *                   - Thornmail
 *                   - Heartsteel
 *       400:
 *         description: Missing or invalid audio upload
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/VoiceErrorResponse'
 *       503:
 *         description: Whisper service unavailable
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/VoiceErrorResponse'
 *       500:
 *         description: Failed to transcribe or parse audio
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/VoiceErrorResponse'
 */
export {};
