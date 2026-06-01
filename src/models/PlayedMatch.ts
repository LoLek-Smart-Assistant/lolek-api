import mongoose, { Document, Model } from 'mongoose';

export type PlayedMatchSource = 'live' | 'manual';

export type PlayedMatchItem = {
  itemId: string;
  itemName: string;
  image?: string | null;
  customTags?: string[] | null;
  slot?: number;
};

export type PlayedMatchPlayer = {
  summonerName: string;
  riotId?: string | null;
  championName: string;
  championId?: string | number | null;
  role?: string | null;
  teamPosition?: string | null;
  items: PlayedMatchItem[];
  kills?: number | null;
  deaths?: number | null;
  assists?: number | null;
  level?: number | null;
};

export type PlayedMatchTeam = {
  teamId: string;
  name?: string | null;
  won: boolean;
  players: PlayedMatchPlayer[];
};

export interface IPlayedMatch extends Document {
  matchId: string;
  userId: mongoose.Types.ObjectId;
  myTeamId?: string | null;
  didWin?: boolean | null;
  source: PlayedMatchSource;
  gameMode: string;
  queue?: string | null;
  durationSeconds: number;
  startedAt?: Date | null;
  endedAt?: Date | null;
  winnerTeamId: string;
  teams: PlayedMatchTeam[];
  createdAt?: Date;
  updatedAt?: Date;
}

const playedMatchItemSchema = new mongoose.Schema<PlayedMatchItem>(
  {
    itemId: { type: String, required: true },
    itemName: { type: String, required: true },
    image: { type: String, default: null },
    customTags: { type: [String], default: [] },
    slot: { type: Number },
  },
  { _id: false },
);

const playedMatchPlayerSchema = new mongoose.Schema<PlayedMatchPlayer>(
  {
    summonerName: { type: String, required: true },
    riotId: { type: String, default: null },
    championName: { type: String, required: true },
    championId: { type: mongoose.Schema.Types.Mixed, default: null },
    role: { type: String, default: null },
    teamPosition: { type: String, default: null },
    items: { type: [playedMatchItemSchema], default: [] },
    kills: { type: Number, default: null },
    deaths: { type: Number, default: null },
    assists: { type: Number, default: null },
    level: { type: Number, default: null },
  },
  { _id: false },
);

const playedMatchTeamSchema = new mongoose.Schema<PlayedMatchTeam>(
  {
    teamId: { type: String, required: true },
    name: { type: String, default: null },
    won: { type: Boolean, required: true },
    players: { type: [playedMatchPlayerSchema], default: [] },
  },
  { _id: false },
);

const playedMatchSchema = new mongoose.Schema<IPlayedMatch>(
  {
    matchId: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    myTeamId: { type: String, default: null },
    didWin: { type: Boolean, default: null },
    source: { type: String, enum: ['live', 'manual'], required: true },
    gameMode: { type: String, required: true },
    queue: { type: String, default: null },
    durationSeconds: { type: Number, required: true },
    startedAt: { type: Date, default: null },
    endedAt: { type: Date, default: null },
    winnerTeamId: { type: String, required: true },
    teams: { type: [playedMatchTeamSchema], default: [] },
  },
  { timestamps: true },
);

playedMatchSchema.index({ userId: 1, matchId: 1 }, { unique: true });
playedMatchSchema.index({ userId: 1, endedAt: -1 });

const PlayedMatch: Model<IPlayedMatch> = mongoose.model<IPlayedMatch>(
  'PlayedMatch',
  playedMatchSchema,
);

export default PlayedMatch;
