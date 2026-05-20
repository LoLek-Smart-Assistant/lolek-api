import mongoose, { Document, Model } from 'mongoose';

export interface IChampion extends Document {
  version: string;
  championId: string;
  key: string;
  championName: string;
  tags: string[];
  image?: string | null;
}

const championSchema = new mongoose.Schema<IChampion>({
  version: { type: String },
  championId: { type: String },
  key: { type: String },
  championName: { type: String },
  tags: { type: [String] },
  image: { type: String }
});

const Champion: Model<IChampion> = mongoose.model<IChampion>('Champion', championSchema);
export default Champion;

