import User, { IUser } from '../models/User';
import { generateAccessToken, generateRefreshToken, TokenPayload } from '../lib/jwtHelper';

export async function signup(username: string, email: string, password: string) {
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) throw new Error('Email or username already exists');

    const user = new User({ username, email, password });
    await user.save();

    const payload: TokenPayload = { userId: user._id.toString(), username: user.username };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    user.refreshToken = refreshToken;
    await user.save();

    return { accessToken, refreshToken, user: { id: user._id, username: user.username, email: user.email } };
}

export async function login(email: string, password: string) {
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) throw new Error('Invalid email or password');

    const payload: TokenPayload = { userId: user._id.toString(), username: user.username };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    user.refreshToken = refreshToken;
    await user.save();

    return { accessToken, refreshToken, user: { id: user._id, username: user.username, email: user.email } };
}

export async function logout(userId: string) {
    await User.updateOne({ _id: userId }, { refreshToken: null });
}

export async function getUserById(userId: string) {
    return User.findById(userId);
}

export async function getUserProfile(userId: string) {
    return User.findById(userId).select('-password -refreshToken');
}

export async function updateUserRiotProfile(userId: string, riotName: string, riotTag: string, puuid: string, platform: string) {
    return User.findByIdAndUpdate(
        userId,
        { riotName, riotTag, puuid, platform },
        { returnDocument: 'after' }
    ).select('-password -refreshToken');
}

export async function removeUserRiotProfile(userId: string) {
    return User.findByIdAndUpdate(
        userId,
        { $unset: { riotName: 1, riotTag: 1, puuid: 1, platform: 1 } },
        { returnDocument: 'after' }
    ).select('-password -refreshToken');
}

export async function deleteUser(userId: string) {
    const res = await User.findByIdAndDelete(userId);
    return res;
}