import { deployKingToken } from '../../utils/deployKingToken'
import { expect, assert } from 'chai'
import { ethers } from 'hardhat'
import Chance from 'chance'

describe('UNIT TEST: King Token - burn & burnFrom', () => {
  it('burn: should throw error if contract is paused', async () => {
    const [owner, target] = await ethers.getSigners()
    const [token] = await deployKingToken({ owner })

    await token.connect(owner).pause()

    const paused = await token.paused()

    expect(paused).to.be.true

    return token
      .connect(owner)
      .burn(0)
      .then(() => assert.fail())
      .catch((err: any) => {
        assert.include(err.message, 'Pausable: paused')
      })
  })

  it('burnFrom: should throw error if contract is paused', async () => {
    const [owner, target] = await ethers.getSigners()
    const [token] = await deployKingToken({ owner })

    await token.connect(owner).pause()

    const paused = await token.paused()

    expect(paused).to.be.true

    return token
      .connect(owner)
      .burnFrom(target.address, 0)
      .then(() => assert.fail())
      .catch((err: any) => {
        assert.include(err.message, 'Pausable: paused')
      })
  })
})
