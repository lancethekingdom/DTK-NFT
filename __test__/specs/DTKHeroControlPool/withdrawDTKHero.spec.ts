import { SafeMath } from '../../utils/safeMath'
import { deployDTKHero } from '../../utils/deployDTKHero'
import { expect, assert } from 'chai'
import { ethers } from 'hardhat'
import { deployDTKHeroControlPool } from '../../utils/deployDTKHeroContolPool'

describe('UNIT TEST: DTK Hero Control Pool - withdrawDTKHero', () => {
  it('withdrawDTKHero: should transfer back the corresponding dtkhero to the depositer, and set the _depositedDTKHero address back to address(0)', async () => {
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

    const balanceOfControlPoolBefore = await dtkHero
      .connect(user)
      .balanceOf(dtkHeroControlPool.address)
    const balanceOfUserBefore = await dtkHero
      .connect(user)
      .balanceOf(user.address)
    const depositerAddressBefore = await dtkHeroControlPool
      .connect(user)
      .depositedDtkHeroOwner(0)

    await dtkHeroControlPool.connect(user).withdrawDTKHero(0)

    const balanceOfControlPoolAfter = await dtkHero
      .connect(user)
      .balanceOf(dtkHeroControlPool.address)
    const balanceOfUserAfter = await dtkHero
      .connect(user)
      .balanceOf(user.address)

    const depositerAddressAfter = await dtkHeroControlPool
      .connect(user)
      .depositedDtkHeroOwner(0)

    expect(balanceOfControlPoolBefore).to.equal(1)
    expect(balanceOfControlPoolAfter).to.equal(0)

    expect(balanceOfUserBefore).to.equal(0)
    expect(balanceOfUserAfter).to.equal(1)

    expect(depositerAddressBefore).to.equal(user.address)
    expect(depositerAddressAfter).to.equal(
      '0x0000000000000000000000000000000000000000',
    )
  })

  it('withdrawDTKHero: should throw error if tokenId has not been deposited', async () => {
    const [owner, authSigner, target] = await ethers.getSigners()
    const [dtkHeroControlPool, dtkHero] = await deployDTKHeroControlPool({
      owner,
    })

    return dtkHeroControlPool.connect(target)
      .withdrawDTKHero(0)
      .then(() => assert.fail())
      .catch((err: any) => {
        assert.include(err.message, 'TokenId has not been deposited yet')
      })
  })
  it('withdrawDTKHero: should throw error if tokenId has not been deposited', async () => {
    const [owner, user, random] = await ethers.getSigners()
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

    return dtkHeroControlPool.connect(random)
      .withdrawDTKHero(0)
      .then(() => assert.fail())
      .catch((err: any) => {
        assert.include(err.message, 'Unauthorized')
      })
  })
})
