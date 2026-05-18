const mongoose = require('mongoose');

const championSchema = new mongoose.Schema({
    version: String,
    championId: String,
    championName: String,
    tags: [String],
    image: String,
});

module.exports = mongoose.model('Champion', championSchema);