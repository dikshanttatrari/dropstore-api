const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema({
  userId: {
    type: String,
  },
  name: {
    type: String,
    required: true,
  },
  mobileNo: {
    type: String,
    required: true,
  },
  postalCode: {
    type: String,
    required: true,
  },
  landmark: {
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
  timeStamp: {
    type: Date,
    default: Date.now,
  },
});

const addressModel = mongoose.model("address", addressSchema);

module.exports = addressModel;
