import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
// @ts-ignore
import { ethers } from 'hardhat'
import { MintableERC20 } from '../../types/contracts/MintableERC20'

export const deployMintableToken = async ({
  owner,
}: {
  owner?: SignerWithAddress
} = {}) => {
  const [defaultOwner] = await ethers.getSigners()
  const TokenContractFactory = await ethers.getContractFactory('MintableERC20')
  const targetOwner = owner ?? defaultOwner
  const token = await TokenContractFactory.connect(targetOwner).deploy()
  return [token, targetOwner] as [MintableERC20, SignerWithAddress]
}
