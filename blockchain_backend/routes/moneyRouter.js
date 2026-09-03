const express = require("express");
const DNT = require("../model/Donaters.js");
const { authMiddleware } = require("../middlewares/auth.js"); // your new auth middleware
const { setUserReward } = require("../contractService/Token_contract.js");

const router = express.Router();

router.patch("/donate", authMiddleware, async (req, res) => {
  console.log("Received body:", req.body); // Debug
  console.log("User:", req.user);

  const reward = req.body.reward;
  const money = req.body.amount;

  if (!reward) {
    return res.status(400).json({ error: "Reward amount is required" });
  }

  if (!money) {
    return res.status(400).json({ error: "Donation amount is required" });
  }

  try {
    // Use req.user._id to identify the currently logged-in user
    const updatedUser = await DNT.findOneAndUpdate(
      { shortId: req.user._id.toString() }, // current logged-in user's ID
      {
        $inc: {
          reward: reward, // increment reward
          moneyDonated: money, // increment money donated
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    let txHash = null;
    if (updatedUser.walletAddress != null) {
      try {
        txHash = await setUserReward(updatedUser.walletAddress, reward);
      } catch (blockchainError) {
        console.error("Blockchain error:", blockchainError);
        // Don't fail the entire request if blockchain fails
        // The database update was successful
      }
    }

    res.status(200).json({
      success: true,
      txHash,
      user: updatedUser, // Fixed: use updatedUser instead of undefined user
      message: `Successfully donated ₹${money} and received ${reward} reward tokens`,
    });
  } catch (err) {
    console.error("Donation error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
