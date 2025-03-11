const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  _id: {
    type: String,
  },
  name: {
    type: String,
  },
  verified: {
    type: Boolean,
    default: false,
  },
  mobileNo: {
    type: Number,
    required: true,
    unique: true,
  },
  role: {
    type: String,
    default: "user",
  },
  otp: {
    type: Number,
  },
  timeStamp: {
    type: Date,
    default: Date.now,
  },
  pushToken: {
    type: String,
  },
});

const userModel = mongoose.model("users", userSchema);

module.exports = userModel;
