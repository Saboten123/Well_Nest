// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Capped} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Capped.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";

// ERC20Capped inherits from ERC20
contract WellNestToken is ERC20Capped, ERC20Burnable {
    address payable private s_owner;
    uint256 private blockReward;
    mapping(address => uint256) public claimableRewards;

    // Events for better tracking
    event TokensSpent(address indexed spender, uint256 amount);
    event RewardClaimed(address indexed claimer, uint256 amount);

    constructor(
        uint256 _cap,
        uint256 _blockReward,
        uint256 _initialSupply
    ) ERC20("WellNestToken", "WNT") ERC20Capped(_cap * (10 ** decimals())) {
        s_owner = payable(msg.sender);
        _mint(msg.sender, _initialSupply * (10 ** decimals()));
        blockReward = _blockReward * (10 ** decimals());
    }

    // Override required by Solidity when inheriting from multiple contracts
    function _update(
        address from,
        address to,
        uint256 value
    ) internal override(ERC20, ERC20Capped) {
        // Mint miner reward before processing the transfer if needed
        if (
            from == address(0) &&
            to != block.coinbase &&
            block.coinbase != address(0)
        ) {
            _mintMinerReward();
        }

        //must be included
        super._update(from, to, value);
    }

    function setUserReward(address user, uint256 amount) external onlyOwner {
        claimableRewards[user] += amount;
    }

    function claim() external {
        uint256 amount = claimableRewards[msg.sender];
        require(amount > 0, "No reward to claim");
        claimableRewards[msg.sender] = 0; // Reset before sending to prevent re-claiming
        _transfer(s_owner, msg.sender, amount); // Transfer from owner to user

        emit RewardClaimed(msg.sender, amount);
    }

    // Function for users to spend tokens - transfers tokens back to owner
    function spend(uint256 amount) external {
        require(amount > 0, "Amount must be greater than 0");
        require(
            balanceOf(msg.sender) >= amount,
            "Insufficient balance to spend"
        );

        _transfer(msg.sender, s_owner, amount);

        emit TokensSpent(msg.sender, amount);
    }

    function _mintMinerReward() internal {
        _mint(block.coinbase, blockReward); //block.coinbase == who mined the block
    }

    function setBlockReward(uint256 _blockReward) public onlyOwner {
        blockReward = _blockReward * (10 ** decimals());
    }

    function getOwner() public view returns (address) {
        return s_owner;
    }

    function getblockReward() public view returns (uint256) {
        return blockReward;
    }

    function getUserReward(address user) external view returns (uint256) {
        return claimableRewards[user];
    }

    // Get user's spendable balance
    function getSpendableBalance(address user) external view returns (uint256) {
        return balanceOf(user);
    }

    modifier onlyOwner() {
        require(msg.sender == s_owner, "Only the owner can call this function");
        _;
    }
}
