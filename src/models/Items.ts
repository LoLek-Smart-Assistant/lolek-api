import mongoose, { Document, Model } from 'mongoose';

export interface IItem extends Document {
  version: string;
  itemId: string;
  itemName: string;
  tags: string[];
  customTags?: string[] | null;
  image?: string | null;
}

const itemSchema = new mongoose.Schema<IItem>({
  version: { type: String },
  itemId: { type: String },
  itemName: { type: String },
  tags: { type: [String] },
  customTags: { type: [String] },
  image: { type: String }
});

const Item: Model<IItem> = mongoose.model<IItem>('Item', itemSchema);
export default Item;
