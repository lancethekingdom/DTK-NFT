import { DTKHeroControlPool } from './../../types/contracts/DTKHeroControlPool'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
// @ts-ignore
import { ethers } from 'hardhat'
import { DTKHero } from '../../types'
import { deployDTKHero } from './deployDTKHero'

export type DeployDTKHeroConfig = {
  owner?: SignerWithAddress
  dtkHero?: DTKHero
}

export const deployDTKHeroControlPool = async ({
  owner,
  dtkHero,
}: DeployDTKHeroConfig) => {
  const [defaultOwner] = await ethers.getSigners()
  const DTKHeroControlPoolContractFactory = await ethers.getContractFactory(
    'DTKHeroControlPool',
  )
  const targetOwner = owner ?? defaultOwner
  const targetDtkHero = dtkHero ?? (await deployDTKHero({ owner }))[0]
  
  const controlPool = await DTKHeroControlPoolContractFactory.connect(
    targetOwner,
  ).deploy(targetDtkHero.address)

  return [controlPool, targetDtkHero, targetOwner] as [DTKHeroControlPool, DTKHero, SignerWithAddress]
}
