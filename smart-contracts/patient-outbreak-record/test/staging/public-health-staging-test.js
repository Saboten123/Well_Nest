const { assert, expect } = require("chai");
const { getNamedAccounts, ethers, network, deployments } = require("hardhat");
const { developmentChains } = require("../../helper-hardhat-config");

developmentChains.includes(network.name)
  ? describe.skip
  : describe("PublicHealthReports Staging Tests", function () {
      let publicHealthReports, deployer;

      // Sample data for staging tests with pincode
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
        pincode: "700002", // Different pincode, same district
      };

      beforeEach(async function () {
        deployer = (await getNamedAccounts()).deployer;
        const signer = await ethers.getSigner(deployer);
        const PublicHealthReportsDeployment = await deployments.get(
          "PublicHealthReports"
        );
        publicHealthReports = await ethers.getContractAt(
          "PublicHealthReports",
          PublicHealthReportsDeployment.address,
          signer
        );
      });

      describe("submitHealthReport", function () {
        it("works with real testnet deployment, submits and verifies health reports", async function () {
          console.log("Setting up test...");
          const accounts = await ethers.getSigners();
          const dataHash = ethers.keccak256(
            ethers.toUtf8Bytes(`staging-test-${Date.now()}`)
          );

          console.log("Setting up Listener...");
          await new Promise(async (resolve, reject) => {
            // Setup listener before we submit the report
            publicHealthReports.once(
              "ReportSubmitted",
              async (
                reportHash,
                country,
                state,
                district,
                pincode,
                reportType,
                submitter
              ) => {
                console.log("ReportSubmitted event fired!");
                try {
                  // Add our asserts here
                  const storedReport =
                    await publicHealthReports.reports(reportHash);
                  console.log("Report hash is: " + reportHash.toString());
                  console.log("Submitter is: " + submitter.toString());

                  // Verify the report was stored correctly
                  assert.equal(storedReport.dataHash, reportHash);
                  assert.equal(storedReport.reportType, "outbreak");
                  assert.equal(storedReport.submittedBy, "Dr. Staging Test");
                  assert.equal(storedReport.email, "staging@test.com");
                  assert.equal(
                    storedReport.location.country,
                    sampleLocation.country
                  );
                  assert.equal(
                    storedReport.location.state,
                    sampleLocation.state
                  );
                  assert.equal(
                    storedReport.location.district,
                    sampleLocation.district
                  );
                  assert.equal(
                    storedReport.location.pincode,
                    sampleLocation.pincode
                  );
                  assert.equal(storedReport.isverified, false);
                  assert.equal(submitter.toString(), accounts[0].address);

                  // Test verification
                  console.log("Verifying the report...");
                  const verifyTx = await publicHealthReports.verifyHealthReport(
                    reportHash,
                    "Staging Verifier"
                  );
                  await verifyTx.wait(1);

                  const verifiedReport =
                    await publicHealthReports.reports(reportHash);
                  assert.equal(verifiedReport.isverified, true);
                  assert.equal(verifiedReport.verifiedById, "Staging Verifier");

                  // Test getter functions including pincode
                  const countryReports =
                    await publicHealthReports.getReportsByCountry(
                      sampleLocation.country
                    );
                  const pincodeReports =
                    await publicHealthReports.getReportsByPincode(
                      sampleLocation.pincode
                    );
                  const typeReports =
                    await publicHealthReports.getReportsByType("outbreak");

                  assert(countryReports.includes(reportHash));
                  assert(pincodeReports.includes(reportHash));
                  assert(typeReports.includes(reportHash));

                  console.log("All assertions passed!");
                  resolve();
                } catch (error) {
                  console.log(error);
                  reject(error);
                }
              }
            );

            // Then submit the health report
            console.log("Submitting Health Report...");
            const tx = await publicHealthReports.submitHealthReport(
              dataHash,
              "Dr. Staging Test",
              "staging@test.com",
              "outbreak",
              sampleLocation
            );
            await tx.wait(1);
            console.log("Ok, time to wait for event...");

            // This code won't complete until our listener has finished listening!
          });
        });
      });

      describe("Pincode-specific Tests", function () {
        it("handles pincode-based queries and location matching on testnet", async function () {
          console.log("Setting up pincode tests...");
          const reports = [];

          // Submit reports with different pincodes
          console.log("Submitting reports with different pincodes...");

          const reportData = [
            {
              location: sampleLocation,
              type: "outbreak",
              doctor: "Dr. Pincode Test 1",
            },
            {
              location: sampleLocation2,
              type: "health_survey",
              doctor: "Dr. Pincode Test 2",
            },
            {
              location: sampleLocation3,
              type: "outbreak",
              doctor: "Dr. Pincode Test 3",
            },
          ];

          for (let i = 0; i < reportData.length; i++) {
            const data = reportData[i];
            const dataHash = ethers.keccak256(
              ethers.toUtf8Bytes(`pincode-test-${Date.now()}-${i}`)
            );

            const tx = await publicHealthReports.submitHealthReport(
              dataHash,
              data.doctor,
              `pincode${i}@test.com`,
              data.type,
              data.location
            );
            const receipt = await tx.wait(1);
            console.log(
              `Report ${i + 1} submitted. Gas used: ${receipt.gasUsed.toString()}`
            );

            reports.push({
              hash: dataHash,
              location: data.location,
              type: data.type,
            });
          }

          // Test pincode-specific queries
          console.log("Testing pincode-specific queries...");

          const pincode700001Reports =
            await publicHealthReports.getReportsByPincode("700001");
          const pincode700002Reports =
            await publicHealthReports.getReportsByPincode("700002");
          const pincode400001Reports =
            await publicHealthReports.getReportsByPincode("400001");

          console.log(`Pincode 700001 reports: ${pincode700001Reports.length}`);
          console.log(`Pincode 700002 reports: ${pincode700002Reports.length}`);
          console.log(`Pincode 400001 reports: ${pincode400001Reports.length}`);

          // Verify each pincode has the correct reports
          assert(pincode700001Reports.includes(reports[0].hash));
          assert(pincode700002Reports.includes(reports[2].hash));
          assert(pincode400001Reports.includes(reports[1].hash));

          // Test getReportsByLocation function (complete location match)
          console.log("Testing complete location matching...");

          const exactLocationReports =
            await publicHealthReports.getReportsByLocation(sampleLocation);
          console.log(
            `Exact location match for sampleLocation: ${exactLocationReports.length}`
          );
          assert(exactLocationReports.includes(reports[0].hash));
          assert(!exactLocationReports.includes(reports[1].hash)); // Different state
          assert(!exactLocationReports.includes(reports[2].hash)); // Different pincode

          const exactLocationReports2 =
            await publicHealthReports.getReportsByLocation(sampleLocation2);
          console.log(
            `Exact location match for sampleLocation2: ${exactLocationReports2.length}`
          );
          assert(exactLocationReports2.includes(reports[1].hash));
          assert(!exactLocationReports2.includes(reports[0].hash));
          assert(!exactLocationReports2.includes(reports[2].hash));

          console.log("All pincode tests passed!");
        });

        it("handles pincode analytics and cross-region comparisons on testnet", async function () {
          console.log("Testing pincode analytics workflow...");

          const pincodeData = [
            { pincode: "700001", count: 2 },
            { pincode: "700002", count: 1 },
            { pincode: "400001", count: 3 },
          ];

          const submittedReports = [];
          let totalGasUsed = 0n;

          // Submit multiple reports per pincode
          console.log("Submitting multiple reports per pincode...");
          for (const data of pincodeData) {
            for (let i = 0; i < data.count; i++) {
              const location = {
                country: "India",
                state: data.pincode.startsWith("700")
                  ? "West Bengal"
                  : "Maharashtra",
                district: data.pincode.startsWith("700") ? "Kolkata" : "Mumbai",
                pincode: data.pincode,
              };

              const dataHash = ethers.keccak256(
                ethers.toUtf8Bytes(
                  `analytics-${data.pincode}-${i}-${Date.now()}`
                )
              );

              const tx = await publicHealthReports.submitHealthReport(
                dataHash,
                `Dr. Analytics ${data.pincode}-${i}`,
                `analytics${data.pincode}${i}@test.com`,
                i % 2 === 0 ? "outbreak" : "health_survey",
                location
              );
              const receipt = await tx.wait(1);
              totalGasUsed += receipt.gasUsed;

              submittedReports.push({
                hash: dataHash,
                pincode: data.pincode,
                location: location,
              });

              console.log(
                `Report for pincode ${data.pincode} (${i + 1}/${data.count}) submitted`
              );
            }
          }

          // Verify counts per pincode
          console.log("Verifying pincode report counts...");
          for (const data of pincodeData) {
            const pincodeReports =
              await publicHealthReports.getReportsByPincode(data.pincode);
            console.log(
              `Pincode ${data.pincode}: Expected ${data.count}, Got ${pincodeReports.length}`
            );
            assert(
              pincodeReports.length >= data.count,
              `Insufficient reports for pincode ${data.pincode}`
            );
          }

          // Cross-region analysis
          console.log("Performing cross-region analysis...");
          const wbReports =
            await publicHealthReports.getReportsByState("West Bengal");
          const mhReports =
            await publicHealthReports.getReportsByState("Maharashtra");

          console.log(`West Bengal total reports: ${wbReports.length}`);
          console.log(`Maharashtra total reports: ${mhReports.length}`);
          console.log(
            `Total gas used for analytics test: ${totalGasUsed.toString()}`
          );

          console.log("Pincode analytics test completed!");
        });
      });

      describe("Multiple Reports Workflow", function () {
        it("handles multiple report submissions and queries on testnet", async function () {
          console.log("Setting up multiple reports test...");
          const reports = [];
          const numReports = 3;

          // Submit multiple reports
          console.log(`Submitting ${numReports} reports...`);
          for (let i = 0; i < numReports; i++) {
            const dataHash = ethers.keccak256(
              ethers.toUtf8Bytes(`multi-test-${Date.now()}-${i}`)
            );
            const location = i % 2 === 0 ? sampleLocation : sampleLocation2;
            const reportType = i % 2 === 0 ? "outbreak" : "health_survey";

            const tx = await publicHealthReports.submitHealthReport(
              dataHash,
              `Dr. Test ${i}`,
              `test${i}@example.com`,
              reportType,
              location
            );
            const receipt = await tx.wait(1);
            console.log(
              `Report ${i + 1} submitted. Gas used: ${receipt.gasUsed.toString()}`
            );

            reports.push({
              hash: dataHash,
              location,
              type: reportType,
            });
          }

          // Test querying by different criteria
          console.log("Testing queries on multiple reports...");

          const indiaReports =
            await publicHealthReports.getReportsByCountry("India");
          console.log(`Found ${indiaReports.length} reports for India`);
          assert(indiaReports.length >= numReports);

          const outbreakReports =
            await publicHealthReports.getReportsByType("outbreak");
          const surveyReports =
            await publicHealthReports.getReportsByType("health_survey");
          console.log(`Found ${outbreakReports.length} outbreak reports`);
          console.log(`Found ${surveyReports.length} survey reports`);

          // Verify each report individually
          console.log("Verifying all reports...");
          for (let i = 0; i < reports.length; i++) {
            const verifyTx = await publicHealthReports.verifyHealthReport(
              reports[i].hash,
              `Batch Verifier ${i}`
            );
            const receipt = await verifyTx.wait(1);
            console.log(
              `Report ${i + 1} verified. Gas used: ${receipt.gasUsed.toString()}`
            );
          }

          console.log("All reports submitted and verified successfully!");
        });
      });

      describe("Error Handling", function () {
        it("properly handles duplicate submission attempts on testnet", async function () {
          console.log("Testing duplicate submission handling...");

          const dataHash = ethers.keccak256(
            ethers.toUtf8Bytes(`duplicate-test-${Date.now()}`)
          );

          // Submit first report
          console.log("Submitting first report...");
          const tx1 = await publicHealthReports.submitHealthReport(
            dataHash,
            "Dr. Original",
            "original@test.com",
            "outbreak",
            sampleLocation
          );
          await tx1.wait(1);
          console.log("First report submitted successfully");

          // Try to submit duplicate
          console.log("Attempting duplicate submission...");
          await expect(
            publicHealthReports.submitHealthReport(
              dataHash,
              "Dr. Duplicate",
              "duplicate@test.com",
              "health_survey",
              sampleLocation2
            )
          ).to.be.revertedWith("Report already exists");
          console.log("Duplicate submission properly rejected");
        });

        it("handles non-existent report queries gracefully on testnet", async function () {
          console.log("Testing queries for non-existent data...");

          const nonExistentHash = ethers.keccak256(
            ethers.toUtf8Bytes("non-existent-data")
          );

          // Test verification of non-existent report
          const verifyResult =
            await publicHealthReports.verifyHealthReport.staticCall(
              nonExistentHash,
              "Test Verifier"
            );
          assert.equal(verifyResult, false);
          console.log("Non-existent report verification returned false");

          // Test getting details of non-existent report
          await expect(
            publicHealthReports.getReportDetails(nonExistentHash)
          ).to.be.revertedWith("Report does not exist");
          console.log("Non-existent report details query properly reverted");

          // Test empty location queries including pincode
          const emptyResults =
            await publicHealthReports.getReportsByCountry("NonExistentCountry");
          const emptyPincodeResults =
            await publicHealthReports.getReportsByPincode("999999");
          assert.equal(emptyResults.length, 0);
          assert.equal(emptyPincodeResults.length, 0);
          console.log("Empty query results handled correctly");
        });
      });

      describe("Real-world Scenario", function () {
        it("simulates complete disease outbreak reporting workflow with pincode tracking on testnet", async function () {
          console.log(
            "🦠 Starting disease outbreak simulation with pincode tracking..."
          );

          const outbreakId = `outbreak-${Date.now()}`;
          const reports = [];
          let totalGasUsed = 0n;

          // Health workers report outbreak with specific pincodes
          const healthWorkers = [
            {
              name: "Dr. Primary Care",
              email: "primary@hospital.com",
              location: { ...sampleLocation, pincode: "700001" },
            },
            {
              name: "Nurse Field Worker",
              email: "field@ngo.org",
              location: { ...sampleLocation2, pincode: "400001" },
            },
            {
              name: "Community Health Worker",
              email: "community@health.org",
              location: { ...sampleLocation3, pincode: "700002" },
            },
          ];

          console.log("Phase 1: Health workers submit outbreak reports...");
          for (let i = 0; i < healthWorkers.length; i++) {
            const worker = healthWorkers[i];
            const dataHash = ethers.keccak256(
              ethers.toUtf8Bytes(`${outbreakId}-report-${i}`)
            );

            const tx = await publicHealthReports.submitHealthReport(
              dataHash,
              worker.name,
              worker.email,
              "outbreak",
              worker.location
            );
            const receipt = await tx.wait(1);
            totalGasUsed += receipt.gasUsed;

            reports.push(dataHash);
            console.log(
              `✅ Report from ${worker.name} (Pincode: ${worker.location.pincode}) submitted (Gas: ${receipt.gasUsed.toString()})`
            );
          }

          console.log("Phase 2: Health authorities verify reports...");
          for (let i = 0; i < reports.length; i++) {
            const tx = await publicHealthReports.verifyHealthReport(
              reports[i],
              "Health Department Official"
            );
            const receipt = await tx.wait(1);
            totalGasUsed += receipt.gasUsed;
            console.log(
              `✅ Report ${i + 1} verified (Gas: ${receipt.gasUsed.toString()})`
            );
          }

          console.log("Phase 3: Generating analytics with pincode data...");
          const totalOutbreaks =
            await publicHealthReports.getReportsByType("outbreak");
          const wbReports =
            await publicHealthReports.getReportsByState("West Bengal");
          const mhReports =
            await publicHealthReports.getReportsByState("Maharashtra");

          // Pincode-specific analytics
          const pincode700001Reports =
            await publicHealthReports.getReportsByPincode("700001");
          const pincode700002Reports =
            await publicHealthReports.getReportsByPincode("700002");
          const pincode400001Reports =
            await publicHealthReports.getReportsByPincode("400001");

          console.log(
            `📊 Total outbreak reports in system: ${totalOutbreaks.length}`
          );
          console.log(`📊 West Bengal reports: ${wbReports.length}`);
          console.log(`📊 Maharashtra reports: ${mhReports.length}`);
          console.log(
            `📊 Pincode 700001 reports: ${pincode700001Reports.length}`
          );
          console.log(
            `📊 Pincode 700002 reports: ${pincode700002Reports.length}`
          );
          console.log(
            `📊 Pincode 400001 reports: ${pincode400001Reports.length}`
          );
          console.log(`⛽ Total gas used: ${totalGasUsed.toString()}`);

          console.log("Phase 4: Final verification with location matching...");
          for (let i = 0; i < reports.length; i++) {
            const report = await publicHealthReports.getReportDetails(
              reports[i]
            );
            const worker = healthWorkers[i];

            assert.equal(report.reportType, "outbreak");
            assert.equal(report.isverified, true);
            assert.equal(report.verifiedById, "Health Department Official");
            assert.equal(report.location.pincode, worker.location.pincode);

            // Test exact location matching
            const locationReports =
              await publicHealthReports.getReportsByLocation(worker.location);
            assert(
              locationReports.includes(reports[i]),
              `Report ${i} should be found by location match`
            );
          }

          console.log(
            "🎉 Disease outbreak simulation with pincode tracking completed successfully!"
          );
          console.log(`Network: ${network.name}`);
          console.log(`Contract Address: ${publicHealthReports.target}`);
        });
      });
    });
