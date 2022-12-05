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
    const tokenId = 0

    await dtkHero
      .connect(user)
      ['safeTransferFrom(address,address,uint256)'](
        user.address,
        dtkHeroControlPool.address,
        tokenId,
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
    if incorrect bytes data is not provided, then hasPlayerId is ture 
    while playerId.toNumber() will throw overflow error if the bytes too large to convert
  `, async () => {
    const [owner, user] = await ethers.getSigners()
    const [dtkHeroControlPool, dtkHero] = await deployDTKHeroControlPool({
      owner,
    })

    // user mint an dtkHero NFT
    await dtkHero.connect(user).mint()
    const tokenId = 0

    await dtkHero
      .connect(user)
      ['safeTransferFrom(address,address,uint256,bytes)'](
        user.address,
        dtkHeroControlPool.address,
        tokenId,
        ethers.utils.toUtf8Bytes('testing123456'),
      )

    const depositInfo = await dtkHeroControlPool
      .connect(user)
      .depositInfoOfDtkHero(0)

    expect(() => depositInfo.playerId.toNumber()).to.throw(
      `overflow [ See: https://links.ethers.org/v5-errors-NUMERIC_FAULT-overflow ] (fault="overflow", operation="toNumber", value="9221864413855250217124190500150", code=NUMERIC_FAULT, version=bignumber/5.7.0)`,
    )
  })

  it(`
  onERC721Received: should safetransferfrom function throw error if the bytes is invalid
`, async () => {
    const [owner, user] = await ethers.getSigners()
    const [dtkHeroControlPool, dtkHero] = await deployDTKHeroControlPool({
      owner,
    })

    // user mint an dtkHero NFT
    await dtkHero.connect(user).mint()
    const tokenId = 0

    const msgHash = ethers.utils.solidityKeccak256(['string'], ['test'])

    const authedSig = await owner.signMessage(ethers.utils.arrayify(msgHash))

    let errMsg: string = ''
    try {
      await dtkHero
        .connect(user)
        ['safeTransferFrom(address,address,uint256,bytes)'](
          user.address,
          dtkHeroControlPool.address,
          tokenId,
          authedSig,
        )
    } catch (err) {
      errMsg = (err as any).message
    }

    expect(errMsg).to.equal(
      `VM Exception while processing transaction: reverted with panic code 0x11 (Arithmetic operation underflowed or overflowed outside of an unchecked block)`,
    )
  })

  it(`
    onERC721Received: should save the operator adddress to _depositedDtkHero
    if correct playerId bytes data is provided, save to blockchain 
  `, async () => {
    const [owner, user] = await ethers.getSigners()
    const [dtkHeroControlPool, dtkHero] = await deployDTKHeroControlPool({
      owner,
    })

    // user mint an dtkHero NFT
    await dtkHero.connect(user).mint()
    const tokenId = 0

    const playerId = 10253
    await dtkHero
      .connect(user)
      ['safeTransferFrom(address,address,uint256,bytes)'](
        user.address,
        dtkHeroControlPool.address,
        tokenId,
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
    expect(depositInfo.hasPlayerId).to.be.true
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
    const tokenId = 0

    const playerId = 10253
    await anotherERC721
      .connect(user)
      ['safeTransferFrom(address,address,uint256,bytes)'](
        user.address,
        dtkHeroControlPool.address,
        tokenId,
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
