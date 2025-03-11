const mongoose = require("mongoose");
const TrendingSchema = new mongoose.Schema({
  category: {
    type: String,
  },
  name: {
    type: String,
  },
  image: {
    type: String,
  },
  position: Number,
});

const trendingModel = mongoose.model("trending", TrendingSchema);
module.exports = trendingModel;
