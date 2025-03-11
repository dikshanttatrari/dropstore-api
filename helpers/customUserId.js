const counterModel = require("../models/CounterCollection");

const generateCustomID = async () => {
  const entity = "user";

  try {
    const counter = await counterModel.findOneAndUpdate(
      { entity },
      { $inc: { sequence: 1 } },
      { new: true, upsert: true }
    );

    return `DS_USER${String(counter.sequence).padStart(4, "0")}`;
  } catch (error) {
    console.error("Error generating custom ID:", error);
    throw new Error("Unable to generate custom ID");
  }
};

module.exports = generateCustomID;
