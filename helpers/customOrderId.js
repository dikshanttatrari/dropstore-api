const counterModel = require("../models/CounterCollection");

const generateOrderID = async () => {
  const entity = "order";

  try {
    const counter = await counterModel.findOneAndUpdate(
      { entity },
      { $inc: { sequence: 1 } },
      { new: true, upsert: true }
    );

    return `DS_ORD${String(counter.sequence).padStart(4, "0")}`;
  } catch (error) {
    console.error("Error generating order ID:", error);
    throw new Error("Unable to generate order ID");
  }
};

module.exports = generateOrderID;
