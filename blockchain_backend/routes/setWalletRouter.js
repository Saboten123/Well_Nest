const express = require("express");
const DNT = require("../model/Donaters.js");
const { setUserReward } = require("../contractService/Token_contract.js");
const { authMiddleware } = require("../middlewares/auth.js");

const router = express.Router();
// PATCH /set
router.patch("/set", authMiddleware, async (req, res) => {
  try {
    const { walletAddress } = req.body;

    if (!walletAddress) {
      return res.status(400).json({ error: "walletAddress required" });
    }

    const userId = req.user._id.toString();

    // Fetch the user first
    const existingUser = await DNT.findOne({ shortId: userId });
    console.log(existingUser);
    // If wallet address is already set and same, skip update + tx
    if (
      existingUser &&
      existingUser.walletAddress != null &&
      existingUser.walletAddress === walletAddress
    ) {
      return res.status(200).json({
        success: true,
        message: "Wallet address already set, no changes made",
        user: existingUser,
      });
    }

    // Update user (only if new or changed wallet)
    const updatedUser = await DNT.findOneAndUpdate(
      { shortId: userId },
      {
        $set: { walletAddress: walletAddress },
        $setOnInsert: { shortId: userId },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    // Call contract only if wallet changed
    const txHash = await setUserReward(walletAddress, updatedUser.reward);

    res.status(200).json({ success: true, txHash, user: updatedUser });
  } catch (error) {
    console.error("Error in /set route:", error);
    res.status(500).json({ error: error.message });
  }
});


module.exports = router;
