const mongoose = require("mongoose");
const homeCategoriesSchema = new mongoose.Schema({
  title: {
    type: String,
  },
  selectedCategory: {
    type: String,
  },
  type: {
    type: Number,
  },
});

const homeCategoriesModel = mongoose.model(
  "homeCategories",
  homeCategoriesSchema
);

module.exports = homeCategoriesModel;
