const { ethers } = require("ethers");
require("dotenv").config();

// 1. Connect to RPC (e.g., Infura, Alchemy, or local Hardhat node)
const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);

// 2. Create wallet instance from private key
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

// 3. Load contract
const contractDetails = require("./contract-details/Token_details.json"); // ABI file from hardhat artifacts
const contractABI = contractDetails.abi;
const contractAddress = contractDetails.address;

const contract = new ethers.Contract(contractAddress, contractABI, wallet);

// 4. Function to set reward
// In your contractService/contract.js
const setUserReward = async (walletAddress, reward) => {
  try {
    // Normalize wallet address
    const normalizedAddress = ethers.getAddress(walletAddress);

    // Convert reward to BigInt or with decimals
    reward = ethers.parseEther(reward.toString());

    const tx = await contract.setUserReward(normalizedAddress, reward);

    // Wait for transaction to be mined
    const receipt = await tx.wait();
    return receipt.hash;
  } catch (error) {
    console.log(error);
    // if (
    //   error.code === "UNKNOWN_ERROR" &&
    //   error.error?.message === "already known"
    // ) {
    //   throw new Error(
    //     "Transaction already pending. Please wait for it to complete."
    //   );
    // }
    throw error;
  }
};

module.exports = { setUserReward };
