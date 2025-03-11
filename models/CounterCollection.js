const mongoose = require("mongoose");

const counterSchema = new mongoose.Schema({
  entity: {
    type: String,
    required: true,
    unique: true,
  },
  sequence: {
    type: Number,
    required: true,
    default: 0,
  },
});

const counterModel = mongoose.model("counter", counterSchema);

module.exports = counterModel;
