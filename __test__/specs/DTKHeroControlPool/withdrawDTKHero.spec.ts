import { expect, assert } from 'chai'
import { ethers } from 'hardhat'
import { deployDTKHeroControlPool } from '../../utils/deployDTKHeroContolPool'

describe('UNIT TEST: DTK Hero Control Pool - withdrawDTKHero', () => {
  it(`
    withdrawDTKHero: should throw error 
    if token has not been deposited
  `, async () => {
    const [owner, authSigner, target] = await ethers.getSigners()
    const [dtkHeroControlPool, _dtkHero] = await deployDTKHeroControlPool({
      owner,
      authSigner,
    })

    const tokenId = 0
    const nonce = await dtkHeroControlPool
      .connect(authSigner)
      .currentNonce(target.address)

    const msgHash = ethers.utils.solidityKeccak256(
      ['string', 'address', 'address', 'uint256', 'uint256'],
      [
        'withdrawDTKHero(uint256,uint256,bytes)',
        dtkHeroControlPool.address,
        target.address,
        tokenId,
        nonce,
      ],
    )

    const authedSig = await authSigner.signMessage(
      ethers.utils.arrayify(msgHash),
    )

    return dtkHeroControlPool
      .connect(target)
      .withdrawDTKHero(tokenId, nonce, authedSig)
      .then(() => assert.fail())
      .catch((err: any) => {
        assert.include(err.message, 'Token has not been deposited yet')
      })
  })

  it(`
    withdrawDTKHero: should throw error 
    if withdrawer is not the depositor
  `, async () => {
    const [owner, authSigner, depositor, withdrawer] = await ethers.getSigners()
    const [dtkHeroControlPool, dtkHero] = await deployDTKHeroControlPool({
      owner,
      authSigner,
    })

    const playerId = 10253
    const tokenId = 0

    // depositor mint an dtkHero NFT and deposit into control pool
    await dtkHero.connect(depositor).mint()

    await dtkHero
      .connect(depositor)
      ['safeTransferFrom(address,address,uint256,bytes)'](
        depositor.address,
        dtkHeroControlPool.address,
        tokenId,
        ethers.utils.hexZeroPad(ethers.utils.hexlify(playerId), 32),
      )

    // grant minting coupon to withdrawer
    const nonce = await dtkHeroControlPool
      .connect(authSigner)
      .currentNonce(withdrawer.address)

    const msgHash = ethers.utils.solidityKeccak256(
      ['string', 'address', 'address', 'uint256', 'uint256'],
      [
        'withdrawDTKHero(uint256,uint256,bytes)',
        dtkHeroControlPool.address,
        withdrawer.address,
        tokenId,
        nonce,
      ],
    )
    const authedSig = await authSigner.signMessage(
      ethers.utils.arrayify(msgHash),
    )

    return dtkHeroControlPool
      .connect(withdrawer)
      .withdrawDTKHero(tokenId, nonce, authedSig)
      .then(() => assert.fail())
      .catch((err: any) => {
        assert.include(err.message, 'Unauthorized')
      })
  })

  it(`
    withdrawDTKHero: should throw error 
    if the withdrawer is using incorrect nonce
  `, async () => {
    const [owner, authSigner, playerWallet] = await ethers.getSigners()
    const [dtkHeroControlPool, dtkHero] = await deployDTKHeroControlPool({
      owner,
      authSigner,
    })

    const playerId = 10253
    const tokenId = 0

    // depositor mint an dtkHero NFT and deposit into control pool
    await dtkHero.connect(playerWallet).mint()

    await dtkHero
      .connect(playerWallet)
      ['safeTransferFrom(address,address,uint256,bytes)'](
        playerWallet.address,
        dtkHeroControlPool.address,
        tokenId,
        ethers.utils.hexZeroPad(ethers.utils.hexlify(playerId), 32),
      )

    // grant minting coupon to user with invalidNonce
    const invalidNonce = 100

    const msgHash = ethers.utils.solidityKeccak256(
      ['string', 'address', 'address', 'uint256', 'uint256'],
      [
        'withdrawDTKHero(uint256,uint256,bytes)',
        dtkHeroControlPool.address,
        playerWallet.address,
        tokenId,
        invalidNonce,
      ],
    )
    const authedSig = await authSigner.signMessage(
      ethers.utils.arrayify(msgHash),
    )

    return dtkHeroControlPool
      .connect(playerWallet)
      .withdrawDTKHero(tokenId, invalidNonce, authedSig)
      .then(() => assert.fail())
      .catch((err: any) => {
        assert.include(err.message, 'Invalid nonce')
      })
  })

  it(`
    withdrawDTKHero: should throw error 
    if the signature is incorrect
  `, async () => {
    const [owner, authSigner, playerWallet] = await ethers.getSigners()
    const [dtkHeroControlPool, dtkHero] = await deployDTKHeroControlPool({
      owner,
      authSigner,
    })

    const playerId = 10253
    const tokenId = 0

    // depositor mint an dtkHero NFT and deposit into control pool
    await dtkHero.connect(playerWallet).mint()

    await dtkHero
      .connect(playerWallet)
      ['safeTransferFrom(address,address,uint256,bytes)'](
        playerWallet.address,
        dtkHeroControlPool.address,
        tokenId,
        ethers.utils.hexZeroPad(ethers.utils.hexlify(playerId), 32),
      )

    // grant minting coupon to user
    const nonce = await dtkHeroControlPool
      .connect(authSigner)
      .currentNonce(playerWallet.address)

    // create incorrect signature
    const invalidNonce = 12331241
    const msgHash = ethers.utils.solidityKeccak256(
      ['string', 'address', 'address', 'uint256', 'uint256'],
      [
        'withdrawDTKHero(uint256,uint256,bytes)',
        dtkHeroControlPool.address,
        playerWallet.address,
        tokenId,
        invalidNonce,
      ],
    )
    const authedSig = await authSigner.signMessage(
      ethers.utils.arrayify(msgHash),
    )

    return dtkHeroControlPool
      .connect(playerWallet)
      .withdrawDTKHero(tokenId, nonce, authedSig)
      .then(() => assert.fail())
      .catch((err: any) => {
        assert.include(err.message, 'Invalid signature')
      })
  })

  it(`
    withdrawDTKHero: should transfer back the corresponding dtkhero to the depositer,
    and set the _depositedDTKHero address back to address(0)
    & reset the depositInfo
  `, async () => {
    const [owner, authSigner, playerWallet] = await ethers.getSigners()
    const [dtkHeroControlPool, dtkHero] = await deployDTKHeroControlPool({
      owner,
      authSigner,
    })

    const playerId = 10253
    const tokenId = 0

    // depositor mint an dtkHero NFT and deposit into control pool
    await dtkHero.connect(playerWallet).mint()

    await dtkHero
      .connect(playerWallet)
      ['safeTransferFrom(address,address,uint256,bytes)'](
        playerWallet.address,
        dtkHeroControlPool.address,
        tokenId,
        ethers.utils.hexZeroPad(ethers.utils.hexlify(playerId), 32),
      )

    // grant minting coupon to user
    const nonce = await dtkHeroControlPool
      .connect(authSigner)
      .currentNonce(playerWallet.address)

    // create incorrect signature
    const msgHash = ethers.utils.solidityKeccak256(
      ['string', 'address', 'address', 'uint256', 'uint256'],
      [
        'withdrawDTKHero(uint256,uint256,bytes)',
        dtkHeroControlPool.address,
        playerWallet.address,
        tokenId,
        nonce,
      ],
    )
    const authedSig = await authSigner.signMessage(
      ethers.utils.arrayify(msgHash),
    )

    const balanceOfControlPoolBefore = await dtkHero
      .connect(playerWallet)
      .balanceOf(dtkHeroControlPool.address)
    const balanceOfUserBefore = await dtkHero
      .connect(playerWallet)
      .balanceOf(playerWallet.address)
    const depositInfoBefore = await dtkHeroControlPool
      .connect(playerWallet)
      .depositInfoOfDtkHero(0)

    // withdraw the dtkhero
    await dtkHeroControlPool
      .connect(playerWallet)
      .withdrawDTKHero(tokenId, nonce, authedSig)

    const balanceOfControlPoolAfter = await dtkHero
      .connect(playerWallet)
      .balanceOf(dtkHeroControlPool.address)
    const balanceOfUserAfter = await dtkHero
      .connect(playerWallet)
      .balanceOf(playerWallet.address)

    const depositInfoAfter = await dtkHeroControlPool
      .connect(playerWallet)
      .depositInfoOfDtkHero(0)

    expect(balanceOfControlPoolBefore).to.equal(1)
    expect(balanceOfControlPoolAfter).to.equal(0)

    expect(balanceOfUserBefore).to.equal(0)
    expect(balanceOfUserAfter).to.equal(1)

    expect(depositInfoBefore.depositor).to.equal(playerWallet.address)
    expect(depositInfoAfter.depositor).to.equal(
      '0x0000000000000000000000000000000000000000',
    )
    expect(depositInfoBefore.playerId.toNumber()).to.equal(playerId)
    expect(depositInfoAfter.playerId.toNumber()).to.equal(0)

    expect(depositInfoBefore.hasPlayerId).to.be.true
    expect(depositInfoAfter.hasPlayerId).to.be.false
  })

  it(`
    withdrawDTKHero: should update the depositor sigNonce
  `, async () => {
    const [owner, authSigner, playerWallet] = await ethers.getSigners()
    const [dtkHeroControlPool, dtkHero] = await deployDTKHeroControlPool({
      owner,
      authSigner,
    })

    const playerId = 10253
    const tokenId = 0

    // depositor mint an dtkHero NFT and deposit into control pool
    await dtkHero.connect(playerWallet).mint()

    await dtkHero
      .connect(playerWallet)
      ['safeTransferFrom(address,address,uint256,bytes)'](
        playerWallet.address,
        dtkHeroControlPool.address,
        tokenId,
        ethers.utils.hexZeroPad(ethers.utils.hexlify(playerId), 32),
      )

    // grant minting coupon to user
    const nonceBefore = await dtkHeroControlPool
      .connect(authSigner)
      .currentNonce(playerWallet.address)

    // create incorrect signature
    const msgHash = ethers.utils.solidityKeccak256(
      ['string', 'address', 'address', 'uint256', 'uint256'],
      [
        'withdrawDTKHero(uint256,uint256,bytes)',
        dtkHeroControlPool.address,
        playerWallet.address,
        tokenId,
        nonceBefore,
      ],
    )
    const authedSig = await authSigner.signMessage(
      ethers.utils.arrayify(msgHash),
    )

    // withdraw the dtkhero
    await dtkHeroControlPool
      .connect(playerWallet)
      .withdrawDTKHero(tokenId, nonceBefore, authedSig)

    const nonceAfter = await dtkHeroControlPool
      .connect(authSigner)
      .currentNonce(playerWallet.address)

    expect(nonceAfter.toNumber()).to.be.greaterThan(nonceBefore.toNumber())
    expect(nonceAfter.toNumber()).to.equal(nonceBefore.toNumber() + 1)
  })
})
