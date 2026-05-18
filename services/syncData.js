require("dotenv").config();

const connectDB = require("../mongoDB/db");

const latestVersion = require("./gameVersion");
const syncData = require("./syncData");
const syncChampions = require("./syncChampions");
const syncItems = require("./syncItems");
const {getLatestVersion} = require("./gameVersion");

async function sync() {
    await connectDB();

    const version = await getLatestVersion();

    console.log(`Latest version: ${version}`);

    await syncChampions(version);
    await syncItems(version);

}

module.exports.sync = sync;