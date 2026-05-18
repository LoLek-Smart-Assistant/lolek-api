const mongoose = require('mongoose')

const itemSchema = new mongoose.Schema({
    version: String,
    itemId: String,
    itemName: String,
    tags: [String],
    image: String,
});

module.exports = mongoose.model("Item", itemSchema);