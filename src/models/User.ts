import mongoose, { Document, Model, CallbackError } from "mongoose";
import bcrypt from "bcrypt";

export interface IUser extends Document {
  username: string;
  email: string;
  password: string;
  riotName?: string;
  riotTag?: string;
  puuid?: string;
  platform?: string;
  refreshToken?: string;
  createdAt?: Date;
  updatedAt?: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new mongoose.Schema<IUser>(
    {
        username: { type: String, required: true, unique: true },
        email: { type: String, required: true, unique: true },
        password: { type: String, required: true },
        riotName: String,
        riotTag: String,
        puuid: String,
        platform: String,
        refreshToken: String
    },
    { timestamps: true }
);

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
    } catch (err) {
        throw err as CallbackError;
    }
  });

userSchema.methods.comparePassword = async function (candidatePassword: string) {
    return await bcrypt.compare(candidatePassword, this.password);
}

const User: Model<IUser> = mongoose.model<IUser>('User', userSchema);
export default User;