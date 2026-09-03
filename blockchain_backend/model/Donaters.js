const mongoose = require("mongoose");

const urlSchema = new mongoose.Schema(
  {
    //this id will be fetched from girirajs db
    shortId: {
      type: String,
      required: true,
      unique: true,
    },
    moneyDonated: {
      type: Number,
      default: 0,
    },
    reward: {
      type: Number,
      default: 0,
    },
    walletAddress: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const DNT = mongoose.model("Donate", urlSchema);

module.exports = DNT;
