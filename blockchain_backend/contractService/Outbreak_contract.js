const { ethers } = require("ethers");
// const crypto = require("crypto");
require("dotenv").config();

// 1. Connect to RPC (e.g., Infura, Alchemy, or local Hardhat node)
const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
// 2. Create wallet instance from private key
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
// 3. Load contract details
const contractDetails = require("./contract-details/Outbreak_details.json"); // ABI file from hardhat artifacts
const contractABI = contractDetails.abi;
const contractAddress = contractDetails.address;

const contract = new ethers.Contract(contractAddress, contractABI, wallet);

const submitHealthReport = async (reportData) => {
  try {
    const { submittedBy, email, reportType, location, actualData } = reportData;

    // Create hash of the actual data for privacy and integrity
    const dataHash = ethers.keccak256(ethers.toUtf8Bytes(actualData));

    // Validate required fields including pincode
    if (!submittedBy || !email || !reportType || !location || !actualData) {
      throw new Error("Missing required fields");
    }

    // Validate location fields including pincode
    if (
      !location.country ||
      !location.state ||
      !location.district ||
      !location.pincode
    ) {
      throw new Error(
        "Missing required location fields (country, state, district, pincode)"
      );
    }

    // Submit transaction
    const tx = await contract.submitHealthReport(
      dataHash,
      submittedBy,
      email,
      reportType,
      location
    );

    console.log(`Transaction submitted: ${tx.hash}`);

    // Wait for transaction to be mined
    const receipt = await tx.wait();
    console.log(`Transaction mined in block: ${receipt.blockNumber}`);

    return {
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      dataHash: dataHash,
      gasUsed: receipt.gasUsed.toString(),
    };
  } catch (error) {
    console.error("Error submitting health report:", error);
    throw error;
  }
};

const verifyHealthReport = async (dataHash, verifiedBy) => {
  try {
    const tx = await contract.verifyHealthReport(dataHash, verifiedBy);
    const receipt = await tx.wait();

    console.log(`Report verified. Transaction: ${receipt.hash}`);

    return {
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      verified: true,
    };
  } catch (error) {
    console.error("Error verifying health report:", error);
    throw error;
  }
};

const getReportsByCountry = async (country) => {
  try {
    const reportHashes = await contract.getReportsByCountry(country);
    console.log(`Found ${reportHashes.length} reports for ${country}`);
    return reportHashes;
  } catch (error) {
    console.error("Error getting reports by country:", error);
    throw error;
  }
};

const getReportsByState = async (state) => {
  try {
    const reportHashes = await contract.getReportsByState(state);
    console.log(`Found ${reportHashes.length} reports for ${state}`);
    return reportHashes;
  } catch (error) {
    console.error("Error getting reports by state:", error);
    throw error;
  }
};

const getReportsByDistrict = async (district) => {
  try {
    const reportHashes = await contract.getReportsByDistrict(district);
    console.log(`Found ${reportHashes.length} reports for ${district}`);
    return reportHashes;
  } catch (error) {
    console.error("Error getting reports by district:", error);
    throw error;
  }
};

const getReportsByPincode = async (pincode) => {
  try {
    const reportHashes = await contract.getReportsByPincode(pincode);
    console.log(`Found ${reportHashes.length} reports for pincode ${pincode}`);
    return reportHashes;
  } catch (error) {
    console.error("Error getting reports by pincode:", error);
    throw error;
  }
};

const getReportsByLocation = async (location) => {
  try {
    // Validate location has all required fields including pincode
    if (
      !location.country ||
      !location.state ||
      !location.district ||
      !location.pincode
    ) {
      throw new Error(
        "Location must include country, state, district, and pincode"
      );
    }

    const reportHashes = await contract.getReportsByLocation(location);
    console.log(
      `Found ${reportHashes.length} reports for the specified location`
    );
    return reportHashes;
  } catch (error) {
    console.error("Error getting reports by location:", error);
    throw error;
  }
};

const getReportsByType = async (reportType) => {
  try {
    const reportHashes = await contract.getReportsByType(reportType);
    console.log(`Found ${reportHashes.length} reports of type ${reportType}`);
    return reportHashes;
  } catch (error) {
    console.error("Error getting reports by type:", error);
    throw error;
  }
};

const getReportDetails = async (dataHash) => {
  try {
    const report = await contract.getReportDetails(dataHash);

    // Convert the struct to a more readable object including pincode
    const reportDetails = {
      dataHash: report.dataHash,
      reportType: report.reportType,
      location: {
        country: report.location.country,
        state: report.location.state,
        district: report.location.district,
        pincode: report.location.pincode,
      },
      submittedBy: report.submittedBy,
      email: report.email,
      timestamp: new Date(Number(report.timestamp) * 1000), // Convert to JavaScript Date
      isVerified: report.isverified,
      verifiedById: report.verifiedById,
    };

    console.log("Report details retrieved:", reportDetails);
    return reportDetails;
  } catch (error) {
    console.error("Error getting report details:", error);
    throw error;
  }
};

const getMultipleReportDetails = async (dataHashes) => {
  try {
    const reportPromises = dataHashes.map((hash) => getReportDetails(hash));
    const reports = await Promise.all(reportPromises);
    return reports;
  } catch (error) {
    console.error("Error getting multiple report details:", error);
    throw error;
  }
};

const getCompleteLocationReports = async (location) => {
  try {
    // Get report hashes
    const reportHashes = await getReportsByLocation(location);

    // Get full details for each report
    const completeReports = await getMultipleReportDetails(reportHashes);

    return completeReports;
  } catch (error) {
    console.error("Error getting complete location reports:", error);
    throw error;
  }
};

const createDataHash = (data) => {
  return ethers.keccak256(ethers.toUtf8Bytes(data));
};

// Export all functions
module.exports = {
  submitHealthReport,
  verifyHealthReport,
  getReportsByCountry,
  getReportsByState,
  getReportsByDistrict,
  getReportsByPincode,
  getReportsByLocation,
  getReportsByType,
  getReportDetails,
  getMultipleReportDetails,
  getCompleteLocationReports,
  createDataHash,
};
