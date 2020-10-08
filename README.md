# wLoki Staking Contract

This contract is derived from the [Pickle Finance staking rewards contract](https://github.com/pickle-finance/protocol/blob/master/src/staking-rewards.sol). No changes in logic have been made and it is being uses as is.

## How it works

- Users stake into the contract

  - Call `approve` on the staking token with the staking amount
  - Call `stake` on the contract with the staking amount

- The time difference is calculated between each block and a reward is paid out according to the % share a user owns in the staked pool

- Users can `exit` the pool or call `getReward` to get their reward token

## How to start rewards

- Call `setRewardsDuration` on the contract with the duration you want to hand out the rewards (in seconds)
- Transfer the reward token amount to the contract address
- Call `notifyRewardAmount` with the transferred amount to begin

## Deploy

Deployment can be done via [Remix](https://remix.ethereum.org/)

```bash
nvm use 12.18.0
npm install
npm run build

# StakingRewards.sol file can be found inside the build directory
```
