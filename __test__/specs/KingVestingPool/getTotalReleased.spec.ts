import { expect, assert } from 'chai'
import Chance from 'chance'
import { BigNumber } from 'ethers'
import { ethers } from 'hardhat'
import { VestingScheduleConfigStruct } from '../../../types/contracts/KingVestingPool'
import { deployKingVestingPool } from '../../utils/deployKingVestingPool'
import { KingVestingPoolFactory } from '../../utils/KingVestingPoolFactory'
import { SafeMath } from '../../utils/safeMath'
import { UnitParser } from '../../utils/UnitParser'

const chance = new Chance()

describe.skip('UNIT TEST: KingVestingPool - getTotalReleased', () => {
  it('_getLockupReleased: should return zero if the blocktime is less than lockup duration + launchTime', async () => {
    const [owner, beneficiaryA, beneficiaryB] = await ethers.getSigners()

    const config: VestingScheduleConfigStruct = KingVestingPoolFactory.generateVestingScheduleConfig(
      {
        beneficiaryAddress: beneficiaryA.address,
        lockupDurationInDays: 1,
        vestingAmount: 0,
        vestingDurationInDays: 0,
      },
    )

    const {
      vestingPool,
      vestingScheduleConfigs,
      token,
    } = await KingVestingPoolFactory.utilVestingScheduleCreated({
      owner,
      vestingScheduleConfigs: [config],
    })

    const totalReleased = await vestingPool
      .connect(beneficiaryA)
      .getTotalReleased()

    expect(totalReleased).to.equal(0)
  })

  it('_getLockupReleased: should return all lockupAmount if the blocktime is greater or equal to lockup duration + launchTime', async () => {
    const [owner, beneficiaryA, beneficiaryB] = await ethers.getSigners()

    const config: VestingScheduleConfigStruct = KingVestingPoolFactory.generateVestingScheduleConfig(
      {
        beneficiaryAddress: beneficiaryA.address,
        lockupDurationInDays: 1,
        vestingAmount: 0,
        vestingDurationInDays: 0,
      },
    )

    const {
      vestingPool,
      vestingScheduleConfigs,
      token,
    } = await KingVestingPoolFactory.utilVestingScheduleCreated({
      owner,
      vestingScheduleConfigs: [config],
    })

    const twoDays = 2 * 24 * 60 * 60
    await ethers.provider.send('evm_increaseTime', [twoDays])
    await ethers.provider.send('evm_mine', [])

    const totalReleased = await vestingPool
      .connect(beneficiaryA)
      .getTotalReleased()
    expect(totalReleased).to.equal(config.lockupAmount)
  })

  it('_getVestingReleased: should return zero if the blocktime is less than lockupDuration + launchTime', async () => {
    const [owner, beneficiaryA] = await ethers.getSigners()

    const config: VestingScheduleConfigStruct = KingVestingPoolFactory.generateVestingScheduleConfig(
      {
        beneficiaryAddress: beneficiaryA.address,
        lockupAmount: 0,
        lockupDurationInDays: 30,
        vestingAmount: 1,
        vestingDurationInDays: 30,
      },
    )

    const {
      vestingPool,
      vestingScheduleConfigs,
      token,
    } = await KingVestingPoolFactory.utilVestingScheduleCreated({
      owner,
      vestingScheduleConfigs: [config],
    })

    const twoDays = 2 * 24 * 60 * 60
    await ethers.provider.send('evm_increaseTime', [twoDays])
    await ethers.provider.send('evm_mine', [])

    const totalReleased = await vestingPool
      .connect(beneficiaryA)
      .getTotalReleased()
    expect(totalReleased).to.equal(0)
  })

  it('_getVestingReleased: should return all vesting amount if the blocktime is greater or equals to vestingEndTime', async () => {
    const [owner, beneficiaryA] = await ethers.getSigners()

    const config: VestingScheduleConfigStruct = KingVestingPoolFactory.generateVestingScheduleConfig(
      {
        beneficiaryAddress: beneficiaryA.address,
        lockupAmount: 0,
        lockupDurationInDays: 30,
        vestingAmount: 1,
        vestingDurationInDays: 30,
      },
    )

    const {
      vestingPool,
      vestingScheduleConfigs,
      token,
    } = await KingVestingPoolFactory.utilVestingScheduleCreated({
      owner,
      vestingScheduleConfigs: [config],
    })

    const sixtyDays = 60 * 24 * 60 * 60
    await ethers.provider.send('evm_increaseTime', [sixtyDays])
    await ethers.provider.send('evm_mine', [])

    const totalReleased = await vestingPool
      .connect(beneficiaryA)
      .getTotalReleased()
    expect(totalReleased).to.equal(config.vestingAmount)
  })

  it('_getVestingReleased: should return zero if the blocktime is greater than vestingStartTime but less than one unit vesting interval', async () => {
    const [owner, beneficiaryA] = await ethers.getSigners()

    const config: VestingScheduleConfigStruct = KingVestingPoolFactory.generateVestingScheduleConfig(
      {
        beneficiaryAddress: beneficiaryA.address,
        lockupAmount: 0,
        lockupDurationInDays: 0,
        vestingAmount: 1,
        vestingDurationInDays: 60,
      },
    )

    const {
      vestingPool,
      vestingScheduleConfigs,
      token,
    } = await KingVestingPoolFactory.utilVestingScheduleCreated({
      owner,
      vestingScheduleConfigs: [config],
    })

    const unitVestingInterval = (
      await vestingPool.UNIT_VESTING_INTERVAL()
    ).toNumber()

    const lessThanOneVestingInterval = unitVestingInterval - 1000

    await ethers.provider.send('evm_increaseTime', [lessThanOneVestingInterval])
    await ethers.provider.send('evm_mine', [])

    const totalReleased = await vestingPool
      .connect(beneficiaryA)
      .getTotalReleased()
    expect(totalReleased).to.equal(0)
  })

  it('_getVestingReleased: should return one unitVestingRelease if the blocktime is equals to vestingStartTime + one unit vesting interval', async () => {
    const [owner, beneficiaryA] = await ethers.getSigners()

    const config: VestingScheduleConfigStruct = KingVestingPoolFactory.generateVestingScheduleConfig(
      {
        beneficiaryAddress: beneficiaryA.address,
        lockupAmount: 0,
        lockupDurationInDays: 0,
        vestingAmount: 2,
        vestingDurationInDays: 60,
      },
    )

    const {
      vestingPool,
      vestingScheduleConfigs,
      token,
    } = await KingVestingPoolFactory.utilVestingScheduleCreated({
      owner,
      vestingScheduleConfigs: [config],
    })

    const unitVestingInterval = (
      await vestingPool.UNIT_VESTING_INTERVAL()
    ).toNumber()

    const oneVestingInterval = unitVestingInterval

    await ethers.provider.send('evm_increaseTime', [oneVestingInterval])
    await ethers.provider.send('evm_mine', [])

    const totalReleased = await vestingPool
      .connect(beneficiaryA)
      .getTotalReleased()
    expect(totalReleased).to.equal(
      (config.vestingAmount as BigNumber)
        .mul(unitVestingInterval)
        .div(config.vestingDuration as BigNumber),
    )
  })

  it('_getVestingReleased: should return corresponding number * unitVestingRelease if the blocktime is equals to vestingStartTime + certain number of unit vesting interval', async () => {
    const [owner, beneficiaryA] = await ethers.getSigners()

    const config: VestingScheduleConfigStruct = KingVestingPoolFactory.generateVestingScheduleConfig(
      {
        beneficiaryAddress: beneficiaryA.address,
        lockupAmount: 0,
        lockupDurationInDays: 0,
        vestingAmount: chance.integer({ min: 1, max: 200000 }),
        vestingDurationInDays:
          chance.integer({
            min: 1,
            max: 24,
          }) * 30,
      },
    )

    const {
      vestingPool,
      vestingScheduleConfigs,
      token,
    } = await KingVestingPoolFactory.utilVestingScheduleCreated({
      owner,
      vestingScheduleConfigs: [config],
    })

    const unitVestingInterval = (
      await vestingPool.UNIT_VESTING_INTERVAL()
    ).toNumber()

    const numberOfUnitVestingIntervalPassed = chance.integer({
      min: 1,
      max: SafeMath.div(
        (config.vestingDuration as any) as any,
        unitVestingInterval,
      ),
    })

    const correspondingNumOfIntervalPassed = SafeMath.mul(
      numberOfUnitVestingIntervalPassed,
      unitVestingInterval,
    )

    await ethers.provider.send('evm_increaseTime', [
      correspondingNumOfIntervalPassed,
    ])
    await ethers.provider.send('evm_mine', [])

    const totalReleased = await vestingPool
      .connect(beneficiaryA)
      .getTotalReleased()
    expect(totalReleased).to.equal(
      (config.vestingAmount as BigNumber)
        .mul(unitVestingInterval)
        .div(config.vestingDuration as BigNumber)
        .mul(numberOfUnitVestingIntervalPassed),
    )
  })

  it('should return zero if random people calling this function', async () => {
    const [owner, beneficiaryA, random] = await ethers.getSigners()
    const config: VestingScheduleConfigStruct = KingVestingPoolFactory.generateVestingScheduleConfig(
      {
        beneficiaryAddress: beneficiaryA.address,
        lockupAmount: 0,
        lockupDurationInDays: 0,
        vestingAmount: chance.integer({ min: 1, max: 200000 }),
        vestingDurationInDays:
          chance.integer({
            min: 1,
            max: 24,
          }) * 30,
      },
    )
    const {
      vestingPool,
      vestingScheduleConfigs,
      token,
    } = await KingVestingPoolFactory.utilVestingScheduleCreated({
      owner,
      vestingScheduleConfigs: [config],
    })
    const randomGuyTotalReleased = await vestingPool.connect(random).getTotalReleased()

    expect(randomGuyTotalReleased).to.equal(0)
  })
})
