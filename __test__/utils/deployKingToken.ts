import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
// @ts-ignore
import { ethers } from 'hardhat'
import { King, VestingScheduleConfigStruct } from '../../types/contracts/King'

export type DeployKingTokenConfig = {
  vestingScheduleConfigs?: VestingScheduleConfigStruct[]
  owner?: SignerWithAddress
}

export const deployKingToken = async (
  { vestingScheduleConfigs = [], owner }: DeployKingTokenConfig = {
    vestingScheduleConfigs: [],
  },
) => {
  const [defaultOwner] = await ethers.getSigners()
  const TokenContractFactory = await ethers.getContractFactory('King')
  const targetOwner = owner ?? defaultOwner
  const token = await TokenContractFactory.connect(targetOwner).deploy(
    vestingScheduleConfigs,
  )
  return [token, targetOwner, vestingScheduleConfigs] as [
    King,
    SignerWithAddress,
    VestingScheduleConfigStruct[],
  ]
}
