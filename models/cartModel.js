const mongoose = require("mongoose");

const cartSchema = new mongoose.Schema({
  productId: {
    type: String,
    ref: "product",
  },
  quantity: {
    type: Number,
  },
  userId: {
    type: String,
  },
  timeStamp: {
    type: Date,
    default: Date.now,
  },
});

const cartModel = mongoose.model("cart", cartSchema);

module.exports = cartModel;
