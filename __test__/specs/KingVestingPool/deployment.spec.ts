import { expect, assert } from 'chai'
import { ethers } from 'hardhat'
import { deployKingVestingPool } from '../../utils/deployKingVestingPool'
import { deployMintableToken } from '../../utils/deployMintableToken'
describe('UNIT TEST: KingVestingPool - deployment', () => {
  it('should return correct token address when the vesting pool is deployed', async () => {
    const [token] = await deployMintableToken()
    const [vestingPool] = await deployKingVestingPool({
      token,
    })

    expect(await vestingPool.getKingTokenAddress()).to.equal(token.address)
  })

  it('should set correct launchTime when vesting pool is deployed', async () => {
    const [token] = await deployMintableToken()
    const [vestingPool] = await deployKingVestingPool({
      token,
    })
    const provider = await ethers.provider
    const latestBlockNumber = await provider.getBlockNumber()
    const lastestBlock = await provider.getBlock(latestBlockNumber)

    const vestingPoolLaunchTime = await vestingPool.launchTime()

    expect(vestingPoolLaunchTime).to.be.lessThanOrEqual(lastestBlock.timestamp)
  })
})
