const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  _id: {
    type: String,
  },
  userId: {
    type: String,
    required: true,
  },
  address: {
    name: {
      type: String,
      required: true,
    },
    mobileNo: {
      type: String,
      required: true,
    },
    houseNo: {
      type: String,
      required: true,
    },
    street: {
      type: String,
      required: true,
    },
    landmark: {
      type: String,
      required: true,
    },
    postalCode: {
      type: String,
      required: true,
    },
  },
  cart: [
    {
      productName: {
        type: String,
        required: false,
      },
      brandName: {
        type: String,
        required: false,
      },
      quantity: {
        type: Number,
        required: true,
      },
      price: {
        type: Number,
        required: true,
      },
      productImage: {
        type: [String],
        required: false,
      },
    },
  ],
  finalAmount: {
    type: Number,
    required: true,
  },
  deliveryCharge: {
    type: Number,
    required: true,
  },
  deliveryStatus: {
    type: String,
    default: "placed",
  },
  paymentMethod: {
    type: String,
    required: true,
  },
  timeStamp: {
    type: Date,
    default: () => Date.now(),
  },
});

const orderModel = mongoose.model("order", orderSchema);

module.exports = orderModel;
