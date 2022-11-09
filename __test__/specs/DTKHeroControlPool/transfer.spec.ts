import { deployDTKHero } from '../../utils/deployDTKHero'
import { expect } from 'chai'
import { ethers } from 'hardhat'
import { deployDTKHeroControlPool } from '../../utils/deployDTKHeroContolPool'

describe('UNIT TEST: DTK Hero Control Pool - transfer', () => {
  it('transfer: should transfer corresponding erc721 to the target address', async () => {
    const [owner, user] = await ethers.getSigners()
    const [dtkHeroControlPool, _dtkHero] = await deployDTKHeroControlPool({
      owner,
    })
    const [anotherERC721] = await deployDTKHero({ owner })

    // user mint an dtkHero NFT
    await anotherERC721.connect(user).mint()

    await anotherERC721
      .connect(user)
      ['safeTransferFrom(address,address,uint256)'](
        user.address,
        dtkHeroControlPool.address,
        0,
      )

    const balanceOfControlPoolBefore = await anotherERC721
      .connect(user)
      .balanceOf(dtkHeroControlPool.address)
    const balanceOfUserBefore = await anotherERC721
      .connect(user)
      .balanceOf(user.address)

    await dtkHeroControlPool
      .connect(owner)
      .transfer(anotherERC721.address, user.address, 0)

    const balanceOfControlPoolAfter = await anotherERC721
      .connect(user)
      .balanceOf(dtkHeroControlPool.address)
    const balanceOfUserAfter = await anotherERC721
      .connect(user)
      .balanceOf(user.address)

    expect(balanceOfControlPoolBefore).to.equal(1)
    expect(balanceOfControlPoolAfter).to.equal(0)

    expect(balanceOfUserBefore).to.equal(0)
    expect(balanceOfUserAfter).to.equal(1)
  })

  it('transfer: should transfer corresponding dtkhero to the target address, and reset the depositor address back to address(0)', async () => {
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

    await dtkHeroControlPool
      .connect(owner)
      .transfer(dtkHero.address, user.address, 0)

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
})
