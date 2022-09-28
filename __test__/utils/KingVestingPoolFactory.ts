import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import Chance from 'chance'
import { BigNumber } from 'ethers'
import { ethers } from 'hardhat'
import { VestingScheduleConfigStruct } from '../../types/contracts/KingVestingPool'
import { deployKingVestingPool } from './deployKingVestingPool'
import { SafeMath } from './safeMath'
import { UnitParser } from './UnitParser'
const chance = new Chance()

export const KingVestingPoolFactory = {
  generateVestingScheduleConfig({
    beneficiaryAddress,
    lockupDurationInDays = 0,
    lockupAmount = chance.integer({ min: 1, max: 2000000 }),
    vestingDurationInDays = 0,
    vestingAmount = chance.integer({ min: 1, max: 2000000 }),
  }: {
    beneficiaryAddress: string
    lockupDurationInDays?: number
    lockupAmount?: number
    vestingDurationInDays?: number
    vestingAmount?: number
  }) {
    return {
      beneficiaryAddress,
      lockupDuration: lockupDurationInDays * 60 * 60 * 24,
      lockupAmount: UnitParser.toEther(lockupAmount),
      vestingDuration: vestingDurationInDays * 60 * 60 * 24,
      vestingAmount: UnitParser.toEther(vestingAmount),
    } as VestingScheduleConfigStruct
  },
  async utilVestingScheduleCreated({
    owner,
    vestingScheduleConfigs = [],
  }: {
    owner?: SignerWithAddress
    vestingScheduleConfigs?: VestingScheduleConfigStruct[]
  } = {}) {
    const [defaultOwner, beneficiaryA] = await ethers.getSigners()

    const targetOwner = owner ?? defaultOwner
    const targetVestingScheduleConfigs = vestingScheduleConfigs.length
      ? vestingScheduleConfigs
      : [
          this.generateVestingScheduleConfig({
            beneficiaryAddress: beneficiaryA.address,
          }),
        ]

    const [vestingPool, token] = await deployKingVestingPool({
      owner: targetOwner,
    })

    const totalVestingAmount = targetVestingScheduleConfigs.reduce(
      (prev, curr) => {
        return (curr.lockupAmount as BigNumber)
          .add(curr.vestingAmount as BigNumber)
          .add(prev)
      },
      BigNumber.from(0),
    )

    await token
      .connect(targetOwner)
      .approve(vestingPool.address, totalVestingAmount)

    await vestingPool
      .connect(targetOwner)
      .addVestingSchedules(targetVestingScheduleConfigs)

    return {
      vestingPool,
      token,
      vestingScheduleConfigs: targetVestingScheduleConfigs,
      owner: targetOwner,
    }
  },
}
