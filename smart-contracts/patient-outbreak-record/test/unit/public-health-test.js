const { network, getNamedAccounts, deployments } = require("hardhat");
const {
  developmentChains,
  networkConfig,
} = require("../../helper-hardhat-config");
const { assert, expect } = require("chai");

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("PublicHealthReports", function () {
      let publicHealthReports, deployer;
      const chainId = network.config.chainId;

      // Sample data with pincode
      const sampleLocation = {
        country: "India",
        state: "West Bengal",
        district: "Kolkata",
        pincode: "700001",
      };

      const sampleLocation2 = {
        country: "India",
        state: "Maharashtra",
        district: "Mumbai",
        pincode: "400001",
      };

      const sampleLocation3 = {
        country: "India",
        state: "West Bengal",
        district: "Kolkata",
        pincode: "700002", // Same district, different pincode
      };

      beforeEach(async function () {
        deployer = (await getNamedAccounts()).deployer;
        await deployments.fixture(["pubhealth"]);

        const PublicHealthReportsDeployment = await deployments.get(
          "PublicHealthReports"
        );
        publicHealthReports = await ethers.getContractAt(
          "PublicHealthReports",
          PublicHealthReportsDeployment.address
        );
      });

      describe("Constructor", function () {
        it("Initializes the contract correctly", async function () {
          // Contract should deploy without errors
          assert(publicHealthReports.target);
        });
      });

      describe("submitHealthReport", function () {
        const sampleDataHash = ethers.keccak256(
          ethers.toUtf8Bytes("sample-health-data")
        );

        it("submits a new health report successfully", async function () {
          const tx = await publicHealthReports.submitHealthReport(
            sampleDataHash,
            "Dr. John Doe",
            "john@example.com",
            "outbreak",
            sampleLocation
          );

          // Check if event was emitted with pincode
          await expect(tx)
            .to.emit(publicHealthReports, "ReportSubmitted")
            .withArgs(
              sampleDataHash,
              sampleLocation.country,
              sampleLocation.state,
              sampleLocation.district,
              sampleLocation.pincode,
              "outbreak",
              deployer
            );
        });

        it("records report data correctly when submitted including pincode", async function () {
          await publicHealthReports.submitHealthReport(
            sampleDataHash,
            "Dr. John Doe",
            "john@example.com",
            "outbreak",
            sampleLocation
          );

          const report = await publicHealthReports.reports(sampleDataHash);
          assert.equal(report.dataHash, sampleDataHash);
          assert.equal(report.reportType, "outbreak");
          assert.equal(report.location.country, sampleLocation.country);
          assert.equal(report.location.state, sampleLocation.state);
          assert.equal(report.location.district, sampleLocation.district);
          assert.equal(report.location.pincode, sampleLocation.pincode);
          assert.equal(report.submittedBy, "Dr. John Doe");
          assert.equal(report.email, "john@example.com");
          assert.equal(report.isverified, false);
          assert.equal(report.verifiedById, "");
          assert(Number(report.timestamp) > 0);
        });

        it("reverts when submitting duplicate reports", async function () {
          await publicHealthReports.submitHealthReport(
            sampleDataHash,
            "Dr. John Doe",
            "john@example.com",
            "outbreak",
            sampleLocation
          );

          await expect(
            publicHealthReports.submitHealthReport(
              sampleDataHash,
              "Dr. Jane Smith",
              "jane@example.com",
              "health_survey",
              sampleLocation2
            )
          ).to.be.revertedWith("Report already exists");
        });

        it("adds report hash to all relevant mappings including pincode", async function () {
          await publicHealthReports.submitHealthReport(
            sampleDataHash,
            "Dr. John Doe",
            "john@example.com",
            "outbreak",
            sampleLocation
          );

          const countryReports = await publicHealthReports.getReportsByCountry(
            sampleLocation.country
          );
          const stateReports = await publicHealthReports.getReportsByState(
            sampleLocation.state
          );
          const districtReports =
            await publicHealthReports.getReportsByDistrict(
              sampleLocation.district
            );
          const pincodeReports = await publicHealthReports.getReportsByPincode(
            sampleLocation.pincode
          );
          const typeReports =
            await publicHealthReports.getReportsByType("outbreak");

          assert(countryReports.includes(sampleDataHash));
          assert(stateReports.includes(sampleDataHash));
          assert(districtReports.includes(sampleDataHash));
          assert(pincodeReports.includes(sampleDataHash));
          assert(typeReports.includes(sampleDataHash));
        });
      });

      describe("verifyHealthReport", function () {
        const sampleDataHash = ethers.keccak256(
          ethers.toUtf8Bytes("sample-health-data")
        );

        beforeEach(async function () {
          await publicHealthReports.submitHealthReport(
            sampleDataHash,
            "Dr. John Doe",
            "john@example.com",
            "outbreak",
            sampleLocation
          );
        });

        it("returns true when verifying existing report", async function () {
          const result =
            await publicHealthReports.verifyHealthReport.staticCall(
              sampleDataHash,
              "Verifier Name"
            );
          assert.equal(result, true);
        });

        it("updates report verification status", async function () {
          await publicHealthReports.verifyHealthReport(
            sampleDataHash,
            "Verifier Name"
          );

          const report = await publicHealthReports.reports(sampleDataHash);
          assert.equal(report.isverified, true);
          assert.equal(report.verifiedById, "Verifier Name");
        });

        it("returns false for non-existent report", async function () {
          const nonExistentHash = ethers.keccak256(
            ethers.toUtf8Bytes("non-existent")
          );

          const result =
            await publicHealthReports.verifyHealthReport.staticCall(
              nonExistentHash,
              "Verifier Name"
            );
          assert.equal(result, false);
        });

        it("allows re-verification and overwrites previous verification", async function () {
          await publicHealthReports.verifyHealthReport(
            sampleDataHash,
            "First Verifier"
          );

          let report = await publicHealthReports.reports(sampleDataHash);
          assert.equal(report.verifiedById, "First Verifier");

          await publicHealthReports.verifyHealthReport(
            sampleDataHash,
            "Second Verifier"
          );

          report = await publicHealthReports.reports(sampleDataHash);
          assert.equal(report.verifiedById, "Second Verifier");
        });
      });

      describe("getReportsByCountry", function () {
        const hash1 = ethers.keccak256(ethers.toUtf8Bytes("data1"));
        const hash2 = ethers.keccak256(ethers.toUtf8Bytes("data2"));

        beforeEach(async function () {
          await publicHealthReports.submitHealthReport(
            hash1,
            "Dr. John Doe",
            "john@example.com",
            "outbreak",
            sampleLocation
          );

          await publicHealthReports.submitHealthReport(
            hash2,
            "Dr. Jane Smith",
            "jane@example.com",
            "health_survey",
            sampleLocation2
          );
        });

        it("returns all reports for specified country", async function () {
          const indiaReports =
            await publicHealthReports.getReportsByCountry("India");
          assert.equal(indiaReports.length, 2);
          assert(indiaReports.includes(hash1));
          assert(indiaReports.includes(hash2));
        });

        it("returns empty array for country with no reports", async function () {
          const usReports =
            await publicHealthReports.getReportsByCountry("USA");
          assert.equal(usReports.length, 0);
        });
      });

      describe("getReportsByState", function () {
        const hash1 = ethers.keccak256(ethers.toUtf8Bytes("data1"));
        const hash2 = ethers.keccak256(ethers.toUtf8Bytes("data2"));

        beforeEach(async function () {
          await publicHealthReports.submitHealthReport(
            hash1,
            "Dr. John Doe",
            "john@example.com",
            "outbreak",
            sampleLocation
          );

          await publicHealthReports.submitHealthReport(
            hash2,
            "Dr. Jane Smith",
            "jane@example.com",
            "health_survey",
            sampleLocation2
          );
        });

        it("returns reports for West Bengal", async function () {
          const wbReports =
            await publicHealthReports.getReportsByState("West Bengal");
          assert.equal(wbReports.length, 1);
          assert(wbReports.includes(hash1));
        });

        it("returns reports for Maharashtra", async function () {
          const mhReports =
            await publicHealthReports.getReportsByState("Maharashtra");
          assert.equal(mhReports.length, 1);
          assert(mhReports.includes(hash2));
        });
      });

      describe("getReportsByDistrict", function () {
        const hash1 = ethers.keccak256(ethers.toUtf8Bytes("data1"));
        const hash2 = ethers.keccak256(ethers.toUtf8Bytes("data2"));
        const hash3 = ethers.keccak256(ethers.toUtf8Bytes("data3"));

        beforeEach(async function () {
          await publicHealthReports.submitHealthReport(
            hash1,
            "Dr. John Doe",
            "john@example.com",
            "outbreak",
            sampleLocation
          );

          await publicHealthReports.submitHealthReport(
            hash2,
            "Dr. Jane Smith",
            "jane@example.com",
            "health_survey",
            sampleLocation2
          );

          await publicHealthReports.submitHealthReport(
            hash3,
            "Dr. Bob Wilson",
            "bob@example.com",
            "outbreak",
            sampleLocation3
          );
        });

        it("returns reports for Kolkata district (multiple pincodes)", async function () {
          const kolkataReports =
            await publicHealthReports.getReportsByDistrict("Kolkata");
          assert.equal(kolkataReports.length, 2);
          assert(kolkataReports.includes(hash1));
          assert(kolkataReports.includes(hash3));
        });

        it("returns reports for Mumbai district", async function () {
          const mumbaiReports =
            await publicHealthReports.getReportsByDistrict("Mumbai");
          assert.equal(mumbaiReports.length, 1);
          assert(mumbaiReports.includes(hash2));
        });
      });

      describe("getReportsByPincode", function () {
        const hash1 = ethers.keccak256(ethers.toUtf8Bytes("data1"));
        const hash2 = ethers.keccak256(ethers.toUtf8Bytes("data2"));
        const hash3 = ethers.keccak256(ethers.toUtf8Bytes("data3"));

        beforeEach(async function () {
          await publicHealthReports.submitHealthReport(
            hash1,
            "Dr. John Doe",
            "john@example.com",
            "outbreak",
            sampleLocation
          );

          await publicHealthReports.submitHealthReport(
            hash2,
            "Dr. Jane Smith",
            "jane@example.com",
            "health_survey",
            sampleLocation2
          );

          await publicHealthReports.submitHealthReport(
            hash3,
            "Dr. Bob Wilson",
            "bob@example.com",
            "outbreak",
            sampleLocation3
          );
        });

        it("returns reports for specific pincode 700001", async function () {
          const pincode700001Reports =
            await publicHealthReports.getReportsByPincode("700001");
          assert.equal(pincode700001Reports.length, 1);
          assert(pincode700001Reports.includes(hash1));
        });

        it("returns reports for specific pincode 700002", async function () {
          const pincode700002Reports =
            await publicHealthReports.getReportsByPincode("700002");
          assert.equal(pincode700002Reports.length, 1);
          assert(pincode700002Reports.includes(hash3));
        });

        it("returns reports for Mumbai pincode 400001", async function () {
          const pincode400001Reports =
            await publicHealthReports.getReportsByPincode("400001");
          assert.equal(pincode400001Reports.length, 1);
          assert(pincode400001Reports.includes(hash2));
        });

        it("returns empty array for non-existent pincode", async function () {
          const nonExistentPincodeReports =
            await publicHealthReports.getReportsByPincode("999999");
          assert.equal(nonExistentPincodeReports.length, 0);
        });
      });

      describe("getReportsByType", function () {
        const hash1 = ethers.keccak256(ethers.toUtf8Bytes("data1"));
        const hash2 = ethers.keccak256(ethers.toUtf8Bytes("data2"));

        beforeEach(async function () {
          await publicHealthReports.submitHealthReport(
            hash1,
            "Dr. John Doe",
            "john@example.com",
            "outbreak",
            sampleLocation
          );

          await publicHealthReports.submitHealthReport(
            hash2,
            "Dr. Jane Smith",
            "jane@example.com",
            "health_survey",
            sampleLocation2
          );
        });

        it("returns reports for outbreak type", async function () {
          const outbreakReports =
            await publicHealthReports.getReportsByType("outbreak");
          assert.equal(outbreakReports.length, 1);
          assert(outbreakReports.includes(hash1));
        });

        it("returns reports for health_survey type", async function () {
          const surveyReports =
            await publicHealthReports.getReportsByType("health_survey");
          assert.equal(surveyReports.length, 1);
          assert(surveyReports.includes(hash2));
        });
      });

      describe("getReportsByLocation", function () {
        const hash1 = ethers.keccak256(ethers.toUtf8Bytes("data1"));
        const hash2 = ethers.keccak256(ethers.toUtf8Bytes("data2"));
        const hash3 = ethers.keccak256(ethers.toUtf8Bytes("data3"));
        const hash4 = ethers.keccak256(ethers.toUtf8Bytes("data4"));

        beforeEach(async function () {
          await publicHealthReports.submitHealthReport(
            hash1,
            "Dr. John Doe",
            "john@example.com",
            "outbreak",
            sampleLocation
          );

          await publicHealthReports.submitHealthReport(
            hash2,
            "Dr. Jane Smith",
            "jane@example.com",
            "health_survey",
            sampleLocation2
          );

          await publicHealthReports.submitHealthReport(
            hash3,
            "Dr. Bob Wilson",
            "bob@example.com",
            "outbreak",
            sampleLocation
          );

          await publicHealthReports.submitHealthReport(
            hash4,
            "Dr. Alice Brown",
            "alice@example.com",
            "survey",
            sampleLocation3
          );
        });

        it("returns reports matching complete location including pincode", async function () {
          const locationReports =
            await publicHealthReports.getReportsByLocation(sampleLocation);
          assert.equal(locationReports.length, 2);
          assert(locationReports.includes(hash1));
          assert(locationReports.includes(hash3));
        });

        it("returns reports for different location with different pincode", async function () {
          const location3Reports =
            await publicHealthReports.getReportsByLocation(sampleLocation3);
          assert.equal(location3Reports.length, 1);
          assert(location3Reports.includes(hash4));
        });

        it("returns reports for Mumbai location", async function () {
          const location2Reports =
            await publicHealthReports.getReportsByLocation(sampleLocation2);
          assert.equal(location2Reports.length, 1);
          assert(location2Reports.includes(hash2));
        });

        it("returns empty array for non-existent location", async function () {
          const nonExistentLocation = {
            country: "USA",
            state: "California",
            district: "Los Angeles",
            pincode: "90210",
          };
          const noReports =
            await publicHealthReports.getReportsByLocation(nonExistentLocation);
          assert.equal(noReports.length, 0);
        });

        it("distinguishes between same district but different pincodes", async function () {
          // Both sampleLocation and sampleLocation3 are in Kolkata district
          // but different pincodes (700001 vs 700002)
          const location1Reports =
            await publicHealthReports.getReportsByLocation(sampleLocation);
          const location3Reports =
            await publicHealthReports.getReportsByLocation(sampleLocation3);

          assert.equal(location1Reports.length, 2); // hash1, hash3
          assert.equal(location3Reports.length, 1); // hash4
          assert(!location1Reports.includes(hash4));
          assert(!location3Reports.includes(hash1));
          assert(!location3Reports.includes(hash3));
        });
      });

      describe("getReportDetails", function () {
        const sampleDataHash = ethers.keccak256(
          ethers.toUtf8Bytes("sample-health-data")
        );

        beforeEach(async function () {
          await publicHealthReports.submitHealthReport(
            sampleDataHash,
            "Dr. John Doe",
            "john@example.com",
            "outbreak",
            sampleLocation
          );
        });

        it("returns complete report details for existing report including pincode", async function () {
          const report =
            await publicHealthReports.getReportDetails(sampleDataHash);
          assert.equal(report.dataHash, sampleDataHash);
          assert.equal(report.reportType, "outbreak");
          assert.equal(report.submittedBy, "Dr. John Doe");
          assert.equal(report.email, "john@example.com");
          assert.equal(report.location.country, sampleLocation.country);
          assert.equal(report.location.state, sampleLocation.state);
          assert.equal(report.location.district, sampleLocation.district);
          assert.equal(report.location.pincode, sampleLocation.pincode);
        });

        it("reverts when getting details for non-existent report", async function () {
          const nonExistentHash = ethers.keccak256(
            ethers.toUtf8Bytes("non-existent")
          );

          await expect(
            publicHealthReports.getReportDetails(nonExistentHash)
          ).to.be.revertedWith("Report does not exist");
        });
      });

      describe("Edge Cases", function () {
        it("handles empty strings in location fields including pincode", async function () {
          const emptyLocation = {
            country: "",
            state: "",
            district: "",
            pincode: "",
          };
          const hash = ethers.keccak256(
            ethers.toUtf8Bytes("empty-location-test")
          );

          await publicHealthReports.submitHealthReport(
            hash,
            "Dr. John Doe",
            "john@example.com",
            "outbreak",
            emptyLocation
          );

          const report = await publicHealthReports.reports(hash);
          assert.equal(report.location.country, "");
          assert.equal(report.location.state, "");
          assert.equal(report.location.district, "");
          assert.equal(report.location.pincode, "");
        });

        it("handles multiple reports in same location with same pincode", async function () {
          const hash1 = ethers.keccak256(ethers.toUtf8Bytes("data1"));
          const hash2 = ethers.keccak256(ethers.toUtf8Bytes("data2"));
          const hash3 = ethers.keccak256(ethers.toUtf8Bytes("data3"));

          await publicHealthReports.submitHealthReport(
            hash1,
            "Dr. A",
            "a@example.com",
            "outbreak",
            sampleLocation
          );
          await publicHealthReports.submitHealthReport(
            hash2,
            "Dr. B",
            "b@example.com",
            "survey",
            sampleLocation
          );
          await publicHealthReports.submitHealthReport(
            hash3,
            "Dr. C",
            "c@example.com",
            "outbreak",
            sampleLocation
          );

          const locationReports =
            await publicHealthReports.getReportsByLocation(sampleLocation);
          const pincodeReports = await publicHealthReports.getReportsByPincode(
            sampleLocation.pincode
          );
          const outbreakReports =
            await publicHealthReports.getReportsByType("outbreak");

          assert.equal(locationReports.length, 3);
          assert.equal(pincodeReports.length, 3);
          assert.equal(outbreakReports.length, 2);
          assert(locationReports.includes(hash1));
          assert(locationReports.includes(hash2));
          assert(locationReports.includes(hash3));
        });

        it("handles special characters in pincode", async function () {
          const specialPincodeLocation = {
            country: "India",
            state: "Special State",
            district: "Special District",
            pincode: "ABC-123",
          };
          const hash = ethers.keccak256(
            ethers.toUtf8Bytes("special-pincode-test")
          );

          await publicHealthReports.submitHealthReport(
            hash,
            "Dr. Special",
            "special@example.com",
            "outbreak",
            specialPincodeLocation
          );

          const pincodeReports =
            await publicHealthReports.getReportsByPincode("ABC-123");
          assert.equal(pincodeReports.length, 1);
          assert(pincodeReports.includes(hash));
        });

        it("correctly differentiates reports with similar but different pincodes", async function () {
          const location1 = { ...sampleLocation, pincode: "700001" };
          const location2 = { ...sampleLocation, pincode: "700010" }; // Similar but different

          const hash1 = ethers.keccak256(ethers.toUtf8Bytes("pincode1"));
          const hash2 = ethers.keccak256(ethers.toUtf8Bytes("pincode2"));

          await publicHealthReports.submitHealthReport(
            hash1,
            "Dr. A",
            "a@example.com",
            "outbreak",
            location1
          );
          await publicHealthReports.submitHealthReport(
            hash2,
            "Dr. B",
            "b@example.com",
            "outbreak",
            location2
          );

          const reports1 =
            await publicHealthReports.getReportsByPincode("700001");
          const reports2 =
            await publicHealthReports.getReportsByPincode("700010");

          assert.equal(reports1.length, 1);
          assert.equal(reports2.length, 1);
          assert(reports1.includes(hash1));
          assert(reports2.includes(hash2));
          assert(!reports1.includes(hash2));
          assert(!reports2.includes(hash1));
        });
      });
    });
