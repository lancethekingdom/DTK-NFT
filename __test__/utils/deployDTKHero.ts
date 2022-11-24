import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
// @ts-ignore
import { ethers } from 'hardhat'
import { DTKHero } from '../../types'

export type DeployDTKHeroConfig = {
  owner?: SignerWithAddress
  authSigner?: SignerWithAddress
}

export const deployDTKHero = async ({
  owner,
  authSigner,
}: DeployDTKHeroConfig = {}) => {
  const [defaultOwner] = await ethers.getSigners()
  const TokenContractFactory = await ethers.getContractFactory('DTKHero')
  const targetOwner = owner ?? defaultOwner
  const token = await TokenContractFactory.connect(targetOwner).deploy(
    authSigner?.address ?? targetOwner.address,
    3000,
    'http://localhost:5000/',
    '',
  )
  return [token, targetOwner] as [DTKHero, SignerWithAddress]
}
