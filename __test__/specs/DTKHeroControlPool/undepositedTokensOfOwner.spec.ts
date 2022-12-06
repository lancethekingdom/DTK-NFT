import { expect } from 'chai'
import { ethers } from 'hardhat'
import { deployDTKHeroControlPool } from '../../utils/deployDTKHeroContolPool'

describe('UNIT TEST: DTK Hero Control Pool - undepositedTokensOfOwner', () => {
  it(`
  undepositedTokensOfOwner: should return the correct number of minted token
  `, async () => {
    const [owner, user] = await ethers.getSigners()
    const [dtkHeroControlPool, dtkHero] = await deployDTKHeroControlPool({
      owner,
    })

    // user mint 3 dtkHero NFT
    for (let i = 0; i < 6; i++) {
      await dtkHero.connect(user).mint()
    }

    const res = await dtkHeroControlPool.undepositedTokensOfOwner(user.address)
    expect(res.length).to.equal(6)
  })

  it(`
  undepositedTokensOfOwner: should return the correct number of minted token even some token has been burnt
  `, async () => {
    const [owner, user] = await ethers.getSigners()
    const [dtkHeroControlPool, dtkHero] = await deployDTKHeroControlPool({
      owner,
    })

    // user mint 6 dtkHero NFT
    for (let i = 0; i < 6; i++) {
      await dtkHero.connect(user).mint()
    }

    // burn token 1 & 3
    await dtkHero.connect(user).burn(1)
    await dtkHero.connect(user).burn(3)

    const res = await dtkHeroControlPool.undepositedTokensOfOwner(user.address)
    expect(res.length).to.equal(4)
  })
})
