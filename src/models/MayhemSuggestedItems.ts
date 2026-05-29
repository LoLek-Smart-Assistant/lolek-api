import mongoose, { Document, Model } from "mongoose";

export type CoreItem = {
  itemId: number;
  slot: number;
};

export type SuggestedItem = {
  slot4Items: number[];
  slot5Items: number[];
  slot6Items: number[];
  allItems: number[];
};

export interface IMayhemSuggestedItems extends Document {
  version: string;
  championId: string;
  championName: string;
  coreItems: CoreItem[];
  suggestedItems: SuggestedItem;
}

const coreItemSchema = new mongoose.Schema<CoreItem>(
  {
    itemId: { type: Number },
    slot: { type: Number }
  },
  { _id: false }
);

const suggestedItemSchema = new mongoose.Schema<SuggestedItem>(
  {
    slot4Items: { type: [Number] },
    slot5Items: { type: [Number] },
    slot6Items: { type: [Number] },
    allItems: { type: [Number] }
  },
  { _id: false, versionKey: false }
);

const mayhemSuggestedItemsSchema = new mongoose.Schema<IMayhemSuggestedItems>({
  version: { type: String },
  championId: { type: String },
  championName: { type: String },
  coreItems: { type: [coreItemSchema] },
  suggestedItems: { type: suggestedItemSchema }
});

const MayhemSuggestedItems: Model<IMayhemSuggestedItems> = mongoose.model<IMayhemSuggestedItems>(
  "MayhemSuggestedItems",
  mayhemSuggestedItemsSchema
);

export default MayhemSuggestedItems;
