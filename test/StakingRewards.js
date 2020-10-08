const { accounts, contract } = require("@openzeppelin/test-environment");
const { BN, time } = require("@openzeppelin/test-helpers");

const StakingRewards = contract.fromArtifact("StakingRewards");
const MockERC20 = contract.fromArtifact("MockERC20");

const { assert } = require("chai");

const DAY = 24 * 60 * 60;

const REWARD_DECIMALS = 1e9;
const STAKING_DECIMALS = 1e18;

describe("StakingRewards", () => {
  const [owner, user, another] = accounts;

  let contract;
  let stakingToken;
  let rewardsToken;

  beforeEach(async () => {
    stakingToken = await MockERC20.new("staking", "STK", {
      from: owner,
    });

    rewardsToken = await MockERC20.new("reward", "RWD", {
      from: owner,
    });

    contract = await StakingRewards.new(
      rewardsToken.address,
      stakingToken.address,
      {
        from: owner,
      }
    );
  });

  it("should stake correctly", async () => {
    const stakeAmount = (100 * STAKING_DECIMALS).toString();
    const rewardAmount = (100 * REWARD_DECIMALS).toString();

    await stakingToken.mint(user, stakeAmount);
    await rewardsToken.mint(owner, rewardAmount);

    await stakingToken.approve(contract.address, stakeAmount, { from: user });
    await contract.stake(stakeAmount, { from: user });

    // Make sure nothing is earned
    let _before = await contract.earned(owner);
    assert.equal(_before.toNumber(), 0);

    // Fast forward
    await time.increase(1 * DAY);

    // No funds until we actually supply funds
    let _after = await contract.earned(user);
    assert.isTrue(_after.eq(_before));

    // Give rewards
    await rewardsToken.transfer(contract.address, rewardAmount, {
      from: owner,
    });
    await contract.notifyRewardAmount(rewardAmount, { from: owner });

    const _rateBefore = await contract.getRewardForDuration();
    assert.isTrue(_rateBefore.gt(0));

    // Fast forward
    _before = await contract.earned(user);
    await time.increase(1 * DAY);

    _after = await contract.earned(user);
    assert.isTrue(_after.gt(_before));
    assert.isTrue(_after.gt(0));

    // Add more rewards, rate should increase
    await rewardsToken.mint(owner, rewardAmount);
    await rewardsToken.transfer(contract.address, rewardAmount, {
      from: owner,
    });
    await contract.notifyRewardAmount(rewardAmount, { from: owner });

    let _rateAfter = await contract.getRewardForDuration();
    assert.isTrue(_rateAfter.gt(_rateBefore));

    // Change time to finish
    await time.increaseTo((await contract.periodFinish()).toNumber() + 1 * DAY);

    // Retrieve tokens
    await contract.getReward({ from: user });

    _before = await contract.earned(user);
    await time.increase(1 * DAY);
    _after = await contract.earned(user);

    // Check that user got the rewards
    const rewardBalance = await rewardsToken.balanceOf(user);
    const numberBalance = rewardBalance.toNumber() / REWARD_DECIMALS;
    assert.isTrue(numberBalance > 199.9); // Make sure the user got the full reward

    // Earn 0 after period finished
    assert.equal(_before.toNumber(), 0);
    assert.equal(_after.toNumber(), 0);
  });

  it("should divide rewards according to shares", async () => {
    const firstStakeAmount = STAKING_DECIMALS.toString();
    const secondStakeAmount = (3 * STAKING_DECIMALS).toString();
    const rewardAmount = (100 * REWARD_DECIMALS).toString();

    await stakingToken.mint(user, firstStakeAmount);
    await stakingToken.mint(another, secondStakeAmount);
    await rewardsToken.mint(owner, rewardAmount);

    await stakingToken.approve(contract.address, firstStakeAmount, {
      from: user,
    });
    await contract.stake(firstStakeAmount, { from: user });

    await stakingToken.approve(contract.address, secondStakeAmount, {
      from: another,
    });
    await contract.stake(secondStakeAmount, { from: another });

    // Give rewards
    await rewardsToken.transfer(contract.address, rewardAmount, {
      from: owner,
    });
    await contract.notifyRewardAmount(rewardAmount, { from: owner });

    // Change time to finish
    await time.increaseTo((await contract.periodFinish()).toNumber());

    // Retrieve tokens
    await contract.getReward({ from: user });
    await contract.getReward({ from: another });

    // Check that user got the rewards
    const rewardBalance = await rewardsToken.balanceOf(user);
    const numberBalance = rewardBalance.toNumber() / REWARD_DECIMALS;
    assert.isTrue(numberBalance > 0 && numberBalance <= 25); // user owns 25%

    // Check that user got the rewards
    const rewardBalance2 = await rewardsToken.balanceOf(another);
    const numberBalance2 = rewardBalance2.toNumber() / REWARD_DECIMALS;
    assert.isTrue(numberBalance2 > 25 && numberBalance <= 75); // user owns 75%

    // Check that user got the rewards
    const contractBalance = await rewardsToken.balanceOf(contract.address);
    const contractNumberBalance = contractBalance.toNumber() / REWARD_DECIMALS;
    assert.isTrue(contractNumberBalance < 1); // Contract owns 0%
  });
});
