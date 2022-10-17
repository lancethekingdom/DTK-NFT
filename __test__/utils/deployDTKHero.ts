import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
// @ts-ignore
import { ethers } from 'hardhat'
import { DTKHero } from '../../types'

export type DeployDTKHeroConfig = {
  owner?: SignerWithAddress
}

export const deployDTKHero = async (
  { owner }: DeployDTKHeroConfig = { owner: undefined },
) => {
  const [defaultOwner] = await ethers.getSigners()
  const TokenContractFactory = await ethers.getContractFactory('DTKHero')
  const targetOwner = owner ?? defaultOwner
  const token = await TokenContractFactory.connect(targetOwner).deploy(
    targetOwner.address,
    3000,
  )
  return [token, targetOwner] as [DTKHero, SignerWithAddress]
}
