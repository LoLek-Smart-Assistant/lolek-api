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
 *         token:
 *           type: string
 *           description: JWT access token
 *         refreshToken:
 *           type: string
 *           description: JWT refresh token
 *         user:
 *           $ref: '#/components/schemas/User'
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
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 *       401:
 *         description: Unauthorized
 *
 * /user/profile:
 *   get:
 *     tags:
 *       - User
 *     summary: Get current user profile
 *     security:
 *       - bearerAuth: []
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
 *     security:
 *       - bearerAuth: []
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
 *     security:
 *       - bearerAuth: []
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
 * /live-game/{platform}/{encryptedId}:
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
 *       - name: encryptedId
 *         in: path
 *         required: true
 *         description: Encrypted summoner ID
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
 * /syncData:
 *   post:
 *     tags:
 *       - Sync
 *     summary: Sync champions and items data from Riot API
 *     responses:
 *       200:
 *         description: Sync completed successfully
 */
export {};
