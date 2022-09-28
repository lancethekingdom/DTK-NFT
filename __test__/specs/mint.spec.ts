import { expect, assert } from 'chai'
import { deployMintableToken } from '../utils/deployMintableToken'
import { UnitParser } from '../utils/UnitParser'

describe.skip('UNIT TEST: Mintable - test', () => {
  it('testing gas fee of mint function', async () => {
    const [token, owner] = await deployMintableToken()


    for (let i = 0; i < 1000; i++) {
      await token.connect(owner).mint(owner.address, UnitParser.toEther(i))
    }
  })
})
