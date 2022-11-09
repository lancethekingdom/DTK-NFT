import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
// @ts-ignore
import { ethers } from 'hardhat'
import {
  DTKHeroControlPool,
  MintableERC721,
} from '../../types/contracts'
import { deployMintableERC721 } from './deployMintableERC721'

export type DeployDTKHeroConfig = {
  owner?: SignerWithAddress
  dtkHero?: MintableERC721
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
  const targetDtkHero = dtkHero ?? (await deployMintableERC721({ owner }))[0]

  const controlPool = await DTKHeroControlPoolContractFactory.connect(
    targetOwner,
  ).deploy(targetDtkHero.address)

  return [controlPool, targetDtkHero, targetOwner] as [
    DTKHeroControlPool,
    MintableERC721,
    SignerWithAddress,
  ]
}
