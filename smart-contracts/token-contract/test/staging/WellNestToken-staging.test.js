// test/staging/WellNestToken.staging.test.js - Integration tests (testnet only)
const { assert, expect } = require("chai");
const { network, ethers, getNamedAccounts, deployments } = require("hardhat"); // Added missing imports
const {
  developmentChains,
  INITIAL_SUPPLY,
} = require("../../helper-hardhat-config");

// ONLY run on testnets (skip on development and mainnet)
developmentChains.includes(network.name)
  ? describe.skip
  : describe("WellNestToken Staging Test", function () {
      let wellnestToken, deployer;

      beforeEach(async function () {
        try {
          // Get the deployer account
          const accounts = await getNamedAccounts();
          deployer = accounts.deployer;

          // Get the signer for the deployer
          const signer = await ethers.getSigner(deployer);

          // Get the deployed contract
          const wellnestTokenDeployment =
            await deployments.get("WellNestToken");

          // Create contract instance - Fixed variable name from 'raffle' to 'wellnestToken'
          wellnestToken = await ethers.getContractAt(
            "WellNestToken",
            wellnestTokenDeployment.address,
            signer
          );

          console.log(
            `Connected to WellNestToken at: ${wellnestTokenDeployment.address}`
          );
          console.log(`Using deployer: ${deployer}`);
        } catch (error) {
          console.error("Setup error:", error);
          throw error;
        }
      });

      it("allows transfers on testnet", async function () {
        // This test will take longer on testnet
        this.timeout(300000); // 5 minutes timeout

        // Test with small amounts to minimize gas costs
        const tokensToSend = ethers.parseEther("1");

        // Create a new wallet for testing (or use a predefined test address)
        const testWallet = ethers.Wallet.createRandom();
        const user1 = testWallet.address;

        console.log(
          `Transferring ${ethers.formatEther(tokensToSend)} tokens to ${user1}`
        );

        const initialBalance = await wellnestToken.balanceOf(user1);
        console.log(`Initial balance: ${ethers.formatEther(initialBalance)}`);

        const deployerInitialBalance = await wellnestToken.balanceOf(deployer);
        console.log(
          `Deployer initial balance: ${ethers.formatEther(
            deployerInitialBalance
          )}`
        );

        // Execute transfer
        const tx = await wellnestToken.transfer(user1, tokensToSend);
        await tx.wait(); // Wait for transaction confirmation

        const finalBalance = await wellnestToken.balanceOf(user1);
        const deployerFinalBalance = await wellnestToken.balanceOf(deployer);

        console.log(`Final balance: ${ethers.formatEther(finalBalance)}`);
        console.log(
          `Deployer final balance: ${ethers.formatEther(deployerFinalBalance)}`
        );

        // Check that tokens were transferred correctly
        expect(finalBalance).to.equal(initialBalance + tokensToSend);
        expect(deployerFinalBalance).to.equal(
          deployerInitialBalance - tokensToSend
        );
      });

      it("maintains correct total supply on testnet", async function () {
        this.timeout(60000); // 1 minute timeout

        const totalSupply = await wellnestToken.totalSupply();
        console.log(`Total supply: ${ethers.formatEther(totalSupply)}`);

        expect(totalSupply).to.be.gt(0); // Just verify it exists

        // Optional: Check if it matches expected initial supply
        const expectedSupply = ethers.parseEther(INITIAL_SUPPLY.toString());
        expect(totalSupply).to.equal(expectedSupply);
      });

      it("has correct token metadata on testnet", async function () {
        this.timeout(60000);

        const name = await wellnestToken.name();
        const symbol = await wellnestToken.symbol();
        const decimals = await wellnestToken.decimals();

        console.log(`Token: ${name} (${symbol}) - ${decimals} decimals`);

        expect(name).to.equal("WellNestToken");
        expect(symbol).to.equal("WNT");
        expect(decimals).to.equal(18);
      });

      it("deployer has initial token balance", async function () {
        this.timeout(60000);

        const deployerBalance = await wellnestToken.balanceOf(deployer);
        console.log(`Deployer balance: ${ethers.formatEther(deployerBalance)}`);

        expect(deployerBalance).to.be.gt(0);
      });

      // NEW STAGING TESTS FOR SPEND FUNCTIONALITY
      describe("Spend functionality on testnet", function () {
        let testUser, testUserContract;

        beforeEach(async function () {
          // Create a test user for spending tests
          const testWallet = ethers.Wallet.createRandom().connect(
            ethers.provider
          );
          testUser = testWallet.address;

          // Fund the test wallet with some ETH for gas (if needed)
          // This would require the deployer to have ETH to send
          try {
            const deployerSigner = await ethers.getSigner(deployer);
            const ethAmount = ethers.parseEther("0.01"); // Small amount for gas

            // Send ETH to test wallet for gas fees
            await deployerSigner.sendTransaction({
              to: testUser,
              value: ethAmount,
            });

            // Create contract instance connected to test user
            testUserContract = wellnestToken.connect(testWallet);
          } catch (error) {
            console.log(
              "Note: Could not fund test wallet, some tests may fail due to gas"
            );
            testUserContract = null;
          }
        });

        it("allows owner to set and user to claim rewards on testnet", async function () {
          this.timeout(300000); // 5 minutes timeout

          const rewardAmount = ethers.parseEther("2");

          console.log(
            `Setting reward of ${ethers.formatEther(rewardAmount)} tokens for ${testUser}`
          );

          // Set reward for test user
          const setRewardTx = await wellnestToken.setUserReward(
            testUser,
            rewardAmount
          );
          await setRewardTx.wait();

          // Check reward was set
          const claimableReward = await wellnestToken.getUserReward(testUser);
          console.log(
            `Claimable reward: ${ethers.formatEther(claimableReward)}`
          );
          expect(claimableReward).to.equal(rewardAmount);

          if (testUserContract) {
            // Get initial balances
            const initialUserBalance = await wellnestToken.balanceOf(testUser);
            const initialDeployerBalance =
              await wellnestToken.balanceOf(deployer);

            console.log(
              `User initial balance: ${ethers.formatEther(initialUserBalance)}`
            );

            // User claims reward
            const claimTx = await testUserContract.claim();
            await claimTx.wait();

            // Check balances after claim
            const finalUserBalance = await wellnestToken.balanceOf(testUser);
            const finalDeployerBalance =
              await wellnestToken.balanceOf(deployer);

            console.log(
              `User final balance: ${ethers.formatEther(finalUserBalance)}`
            );
            console.log(
              `Deployer balance change: ${ethers.formatEther(initialDeployerBalance - finalDeployerBalance)}`
            );

            expect(finalUserBalance).to.equal(
              initialUserBalance + rewardAmount
            );
          } else {
            console.log("Skipping claim test due to wallet funding issue");
          }
        });

        it("allows user to spend tokens back to owner on testnet", async function () {
          this.timeout(300000); // 5 minutes timeout

          if (!testUserContract) {
            console.log("Skipping spend test due to wallet funding issue");
            return;
          }

          const tokensToGive = ethers.parseEther("5");
          const tokensToSpend = ethers.parseEther("3");

          console.log(`Giving user ${ethers.formatEther(tokensToGive)} tokens`);

          // First, give user some tokens
          const transferTx = await wellnestToken.transfer(
            testUser,
            tokensToGive
          );
          await transferTx.wait();

          // Verify user received tokens
          const userBalance = await wellnestToken.balanceOf(testUser);
          console.log(
            `User balance after receiving tokens: ${ethers.formatEther(userBalance)}`
          );
          expect(userBalance).to.equal(tokensToGive);

          // Get initial deployer balance
          const initialDeployerBalance =
            await wellnestToken.balanceOf(deployer);

          console.log(
            `User spending ${ethers.formatEther(tokensToSpend)} tokens`
          );

          // User spends tokens
          const spendTx = await testUserContract.spend(tokensToSpend);
          await spendTx.wait();

          // Check final balances
          const finalUserBalance = await wellnestToken.balanceOf(testUser);
          const finalDeployerBalance = await wellnestToken.balanceOf(deployer);

          console.log(
            `User final balance: ${ethers.formatEther(finalUserBalance)}`
          );
          console.log(
            `Deployer final balance: ${ethers.formatEther(finalDeployerBalance)}`
          );

          expect(finalUserBalance).to.equal(tokensToGive - tokensToSpend);
          expect(finalDeployerBalance).to.equal(
            initialDeployerBalance + tokensToSpend
          );
        });

        it("correctly reports spendable balance on testnet", async function () {
          this.timeout(180000); // 3 minutes timeout

          const tokensToGive = ethers.parseEther("7");

          // Give user some tokens
          const transferTx = await wellnestToken.transfer(
            testUser,
            tokensToGive
          );
          await transferTx.wait();

          // Check spendable balance
          const spendableBalance =
            await wellnestToken.getSpendableBalance(testUser);
          const actualBalance = await wellnestToken.balanceOf(testUser);

          console.log(
            `Spendable balance: ${ethers.formatEther(spendableBalance)}`
          );
          console.log(`Actual balance: ${ethers.formatEther(actualBalance)}`);

          expect(spendableBalance).to.equal(actualBalance);
          expect(spendableBalance).to.equal(tokensToGive);
        });

        it("verifies spend events are emitted on testnet", async function () {
          this.timeout(300000); // 5 minutes timeout

          if (!testUserContract) {
            console.log("Skipping event test due to wallet funding issue");
            return;
          }

          const tokensToGive = ethers.parseEther("4");
          const tokensToSpend = ethers.parseEther("2");

          // Give user some tokens
          const transferTx = await wellnestToken.transfer(
            testUser,
            tokensToGive
          );
          await transferTx.wait();

          console.log(`Testing spend event emission`);

          // User spends tokens and check for event
          const spendTx = await testUserContract.spend(tokensToSpend);
          const receipt = await spendTx.wait();

          // Check if TokensSpent event was emitted
          const spendEvent = receipt.logs.find((log) => {
            try {
              const parsed = wellnestToken.interface.parseLog(log);
              return parsed.name === "TokensSpent";
            } catch {
              return false;
            }
          });

          expect(spendEvent).to.not.be.undefined;
          console.log("TokensSpent event successfully emitted");
        });
      });
    });
