const { assert, expect } = require("chai");
const { network, getNamedAccounts, deployments, ethers } = require("hardhat");
const {
  developmentChains,
  CAP,
  BLOCK_REWARD,
  INITIAL_SUPPLY,
} = require("../../helper-hardhat-config");

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("WellNestToken Unit Test", function () {
      //Multipler is used to make reading the math easier because of the 18 decimal points
      const multiplier = 10 ** 18;
      let wellnestToken, deployer, user1;
      beforeEach(async function () {
        // Fix: Get accounts using ethers.getSigners() instead of getNamedAccounts()
        const accounts = await ethers.getSigners();
        deployer = accounts[0].address;
        user1 = accounts[1].address;

        await deployments.fixture("all");
        const wellnestTokenDeployment = await deployments.get("WellNestToken");
        wellnestToken = await ethers.getContractAt(
          "WellNestToken",
          wellnestTokenDeployment.address
        );
      });
      it("was deployed", async () => {
        assert(wellnestToken.target);
      });
      describe("constructor", () => {
        it("Should set the right Owner ", async () => {
          console.log(deployer);
          expect(await wellnestToken.getOwner()).to.equal(deployer);
        });
        it("Should have correct INITIAL_SUPPLY of token ", async () => {
          const totalSupply = await wellnestToken.totalSupply();
          assert.equal(totalSupply.toString(), INITIAL_SUPPLY * 1e18);
        });
        it("Should have correct CAP of token ", async () => {
          const cap = await wellnestToken.cap();
          assert.equal(cap.toString(), CAP * 1e18);
        });
        it("Should have correct BLOCK_REWARD of token ", async () => {
          const reward = await wellnestToken.getblockReward();
          assert.equal(reward.toString(), BLOCK_REWARD * 1e18);
        });
        it("initializes the token with the correct name and symbol ", async () => {
          const name = (await wellnestToken.name()).toString();
          assert.equal(name, "WellNestToken");

          const symbol = (await wellnestToken.symbol()).toString();
          assert.equal(symbol, "WNT");
        });
      });
      describe("transfers", () => {
        it("Should be able to transfer tokens successfully to an address", async () => {
          const tokensToSend = ethers.parseEther("10");
          await wellnestToken.transfer(user1, tokensToSend);
          expect(await wellnestToken.balanceOf(user1)).to.equal(tokensToSend);
        });
        it("emits an transfer event, when an transfer occurs", async () => {
          await expect(
            wellnestToken.transfer(user1, (10 * multiplier).toString())
          ).to.emit(wellnestToken, "Transfer");
        });
      });
      describe("Reward system Test", () => {
        it("sets the user reward correctly", async () => {
          const reward = ethers.parseEther("1");
          await wellnestToken.setUserReward(user1, reward);
          const userReward = await wellnestToken.getUserReward(user1);
          assert.equal(reward.toString(), userReward.toString());
        });
        it("reverts when reward is not available", async () => {
          const accounts = await ethers.getSigners();
          const attacker = accounts[1];
          const wellnestTokenConnectedContract =
            await wellnestToken.connect(attacker);
          await expect(
            wellnestTokenConnectedContract.claim()
          ).to.be.revertedWith("No reward to claim");
          // await wellnestToken.claim();
        });
        it("Lets the user claim if available", async () => {
          const start = await wellnestToken.balanceOf(user1);
          const reward = ethers.parseEther("1");
          await wellnestToken.setUserReward(user1, reward);
          const accounts = await ethers.getSigners();
          const attacker = accounts[1];
          const ConnectedContract = await wellnestToken.connect(attacker);
          await ConnectedContract.claim();
          const end = await wellnestToken.balanceOf(user1);
          assert.equal((start + reward).toString(), end.toString());
        });
      });
      describe("allowances", () => {
        const amount = (20 * multiplier).toString();
        let playerToken; // Fix: Declare playerToken properly
        beforeEach(async () => {
          // Fix: Get the signer object for user1
          const accounts = await ethers.getSigners();
          const user1Signer = accounts[1];

          const wellnestTokenDeployment =
            await deployments.get("WellNestToken");
          playerToken = await ethers.getContractAt(
            "WellNestToken",
            wellnestTokenDeployment.address,
            user1Signer // Use the signer object, not just the address
          );
        });
        it("Should approve other address to spend token", async () => {
          const tokensToSpend = ethers.parseEther("5");
          //Deployer is approving that user1 can spend 5 of their precious OT's
          await wellnestToken.approve(user1, tokensToSpend);
          await playerToken.transferFrom(deployer, user1, tokensToSpend);
          expect(await playerToken.balanceOf(user1)).to.equal(tokensToSpend);
        });
        it("doesn't allow an unnaproved member to do transfers", async () => {
          await expect(
            playerToken.transferFrom(deployer, user1, amount)
          ).to.be.revertedWithCustomError(
            playerToken,
            "ERC20InsufficientAllowance"
          );
        });
        it("emits an approval event, when an approval occurs", async () => {
          await expect(wellnestToken.approve(user1, amount)).to.emit(
            wellnestToken,
            "Approval"
          );
        });
        it("the allowance being set is accurate", async () => {
          await wellnestToken.approve(user1, amount);
          const allowance = await wellnestToken.allowance(deployer, user1);
          assert.equal(allowance.toString(), amount);
        });
        it("won't allow a user to go over the allowance", async () => {
          await wellnestToken.approve(user1, amount);
          await expect(
            playerToken.transferFrom(
              deployer,
              user1,
              (40 * multiplier).toString()
            )
          ).to.be.revertedWithCustomError(
            playerToken,
            "ERC20InsufficientAllowance"
          );
        });
      });

      // NEW TESTS FOR SPEND FUNCTIONALITY
      describe("Spend system Test", () => {
        let user1Contract;

        beforeEach(async () => {
          const accounts = await ethers.getSigners();
          const user1Signer = accounts[1];

          const wellnestTokenDeployment =
            await deployments.get("WellNestToken");
          user1Contract = await ethers.getContractAt(
            "WellNestToken",
            wellnestTokenDeployment.address,
            user1Signer
          );

          // Give user1 some tokens to spend (transfer from deployer)
          const tokensToGive = ethers.parseEther("50");
          await wellnestToken.transfer(user1, tokensToGive);
        });

        it("should allow user to spend tokens and transfer them to owner", async () => {
          const amountToSpend = ethers.parseEther("10");

          // Get initial balances
          const initialUserBalance = await wellnestToken.balanceOf(user1);
          const initialOwnerBalance = await wellnestToken.balanceOf(deployer);

          // User spends tokens
          await user1Contract.spend(amountToSpend);

          // Check final balances
          const finalUserBalance = await wellnestToken.balanceOf(user1);
          const finalOwnerBalance = await wellnestToken.balanceOf(deployer);

          assert.equal(
            (initialUserBalance - amountToSpend).toString(),
            finalUserBalance.toString()
          );
          assert.equal(
            (initialOwnerBalance + amountToSpend).toString(),
            finalOwnerBalance.toString()
          );
        });

        it("should emit TokensSpent event when user spends tokens", async () => {
          const amountToSpend = ethers.parseEther("5");

          await expect(user1Contract.spend(amountToSpend))
            .to.emit(wellnestToken, "TokensSpent")
            .withArgs(user1, amountToSpend);
        });

        it("should revert when user tries to spend 0 tokens", async () => {
          await expect(user1Contract.spend(0)).to.be.revertedWith(
            "Amount must be greater than 0"
          );
        });

        it("should revert when user tries to spend more than their balance", async () => {
          const userBalance = await wellnestToken.balanceOf(user1);
          const excessiveAmount = userBalance + ethers.parseEther("1");

          await expect(user1Contract.spend(excessiveAmount)).to.be.revertedWith(
            "Insufficient balance to spend"
          );
        });

        it("should return correct spendable balance", async () => {
          const userBalance = await wellnestToken.balanceOf(user1);
          const spendableBalance =
            await wellnestToken.getSpendableBalance(user1);

          assert.equal(userBalance.toString(), spendableBalance.toString());
        });

        it("should update spendable balance after spending", async () => {
          const amountToSpend = ethers.parseEther("15");
          const initialSpendableBalance =
            await wellnestToken.getSpendableBalance(user1);

          await user1Contract.spend(amountToSpend);

          const finalSpendableBalance =
            await wellnestToken.getSpendableBalance(user1);

          assert.equal(
            (initialSpendableBalance - amountToSpend).toString(),
            finalSpendableBalance.toString()
          );
        });
      });
    });
