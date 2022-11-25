import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
// @ts-ignore
import { ethers } from 'hardhat'
import { MintableERC721 } from '../../types'

export type DeployDTKHeroConfig = {
  owner?: SignerWithAddress
  authSigner?: SignerWithAddress
}

export const deployMintableERC721 = async ({
  owner,
  authSigner,
}: DeployDTKHeroConfig = {}) => {
  const [defaultOwner] = await ethers.getSigners()
  const TokenContractFactory = await ethers.getContractFactory('MintableERC721')
  const targetOwner = owner ?? defaultOwner
  const token = await TokenContractFactory.connect(targetOwner).deploy(
    authSigner?.address ?? targetOwner.address,
    3000,
    'http://test.com/',
    '',
  )
  return [token, targetOwner] as [MintableERC721, SignerWithAddress]
}
