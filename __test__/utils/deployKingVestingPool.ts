import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { KingVestingPool } from '../../types/contracts/KingVestingPool'
// @ts-ignore
import { ethers } from 'hardhat'
import { MintableERC20 } from '../../types/contracts/MintableERC20'
import { deployMintableToken } from './deployMintableToken'
import { King } from '../../types/contracts/King'

export const deployKingVestingPool = async ({
  owner,
  token,
}: {
  owner?: SignerWithAddress
  token?: King | MintableERC20
} = {}) => {
  const [defaultOwner] = await ethers.getSigners()
  const targetOwner = owner ?? defaultOwner

  const targetToken =
    token ?? (await deployMintableToken({ owner: targetOwner }))[0]

  const VestingContractFactory = await ethers.getContractFactory(
    'KingVestingPool',
  )

  const vestingPool = await VestingContractFactory.connect(targetOwner).deploy(
    targetToken.address,
  )

  return [vestingPool, targetToken, targetOwner] as [
    KingVestingPool,
    MintableERC20,
    SignerWithAddress,
  ]
}
