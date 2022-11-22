import { deployMintableERC721 } from '../../utils/deployMintableERC721'
import { expect, assert } from 'chai'
import { ethers } from 'hardhat'
import { deployDTKHeroControlPool } from '../../utils/deployDTKHeroContolPool'

describe('UNIT TEST: DTK Hero Control Pool - onERC721Received', () => {
  it(`
    onERC721Received: should save the operator adddress to _depositedDtkHero
    if bytes data is not provided, then hasPlaterId is false
  `, async () => {
    const [owner, user] = await ethers.getSigners()
    const [dtkHeroControlPool, dtkHero] = await deployDTKHeroControlPool({
      owner,
    })

    // user mint an dtkHero NFT
    await dtkHero.connect(user).mint()

    await dtkHero
      .connect(user)
      ['safeTransferFrom(address,address,uint256)'](
        user.address,
        dtkHeroControlPool.address,
        0,
      )

    const balanceControlPool = await dtkHero
      .connect(user)
      .balanceOf(dtkHeroControlPool.address)

    const depositInfo = await dtkHeroControlPool
      .connect(user)
      .depositInfoOfDtkHero(0)

    expect(balanceControlPool).to.equal(1)
    expect(depositInfo.depositor).to.equal(user.address)
    expect(depositInfo.hasPlayerId).to.be.false
  })

  it(`
    onERC721Received: should save the operator adddress to _depositedDtkHero
    if bytes data is not provided, then hasPlaterId is false
  `, async () => {
    const [owner, user] = await ethers.getSigners()
    const [dtkHeroControlPool, dtkHero] = await deployDTKHeroControlPool({
      owner,
    })

    // user mint an dtkHero NFT
    await dtkHero.connect(user).mint()

    const playerId = 10253
    await dtkHero
      .connect(user)
      ['safeTransferFrom(address,address,uint256,bytes)'](
        user.address,
        dtkHeroControlPool.address,
        0,
        ethers.utils.hexZeroPad(ethers.utils.hexlify(playerId), 32),
      )

    const balanceControlPool = await dtkHero
      .connect(user)
      .balanceOf(dtkHeroControlPool.address)

    const depositInfo = await dtkHeroControlPool
      .connect(user)
      .depositInfoOfDtkHero(0)

    expect(balanceControlPool).to.equal(1)
    expect(depositInfo.depositor).to.equal(user.address)
    expect(depositInfo.playerId.toNumber()).to.equal(playerId)
  })

  it(`
    onERC721Received: should not save the operator adddress to _depositedDtkHero 
    if the erc721 is not dtkHero contract
  `, async () => {
    const [owner, user] = await ethers.getSigners()
    const [dtkHeroControlPool, _dtkHero] = await deployDTKHeroControlPool({
      owner,
    })
    const [anotherERC721] = await deployMintableERC721({ owner })

    // user mint an dtkHero NFT
    await anotherERC721.connect(user).mint()

    const playerId = 10253
    await anotherERC721
      .connect(user)
      ['safeTransferFrom(address,address,uint256,bytes)'](
        user.address,
        dtkHeroControlPool.address,
        0,
        ethers.utils.hexZeroPad(ethers.utils.hexlify(playerId), 32),
      )

    const balanceControlPool = await anotherERC721
      .connect(user)
      .balanceOf(dtkHeroControlPool.address)

    const depositInfo = await dtkHeroControlPool
      .connect(user)
      .depositInfoOfDtkHero(0)

    expect(balanceControlPool).to.equal(1)
    expect(depositInfo.depositor).to.equal(
      '0x0000000000000000000000000000000000000000',
    )
    expect(depositInfo.hasPlayerId).to.be.false
  })
})
