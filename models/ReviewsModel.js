const mongoose = require("mongoose");

const ReviewsSchema = new mongoose.Schema({
  productId: {
    type: String,
    required: true,
  },
  userId: {
    type: String,
    required: true,
  },
  product: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  pictures: {
    type: [String],
    maxLength: 3,
  },
  comment: {
    type: String,
    required: true,
  },
  rating: {
    type: Number,
    required: true,
  },
});

const reviewModel = mongoose.model("reviews", ReviewsSchema);
module.exports = reviewModel;
