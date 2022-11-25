import { SafeMath } from './../utils/safeMath'
import { deployDTKHero } from '../utils/deployDTKHero'
import { expect, assert } from 'chai'
import { ethers } from 'hardhat'

describe.skip('UNIT TEST: DTK Hero - mint', () => {
  it('should throw error if contract is paused', async () => {
    const [owner, authSigner, target] = await ethers.getSigners()
    const [DTKHero] = await deployDTKHero({ owner, authSigner })

    const msgHash = ethers.utils.solidityKeccak256(
      ['string', 'address', 'address', 'uint256'],
      ['mint(uint256,uint256,bytes)', DTKHero.address, target.address, 0],
    )

    const authedSig = await authSigner.signMessage(
      ethers.utils.arrayify(msgHash),
    )

    await DTKHero.connect(owner).pause()

    const paused = await DTKHero.paused()

    expect(paused).to.be.true

    return DTKHero.connect(target)
      .mint(0, authedSig)
      .then(() => assert.fail())
      .catch((err: any) => {
        assert.include(err.message, 'Pausable: paused')
      })
  })

  it('should mint one nft to the target address and increment the nft contract totalsupply', async () => {
    const [owner, authSigner, target] = await ethers.getSigners()
    const [DTKHero] = await deployDTKHero({ owner, authSigner })

    const msgHash = ethers.utils.solidityKeccak256(
      ['string', 'address', 'address', 'uint256'],
      ['mint(uint256,uint256,bytes)', DTKHero.address, target.address, 0],
    )

    const authedSig = await authSigner.signMessage(
      ethers.utils.arrayify(msgHash),
    )

    const balanceBefore = (await DTKHero.balanceOf(target.address)).toNumber()
    const totalSupplyBefore = (await DTKHero.totalSupply()).toNumber()
    const tokenBalanceBefore = await DTKHero.tokensOfOwner(target.address)

    await DTKHero.connect(target).mint(0, authedSig)

    const balanceAfter = (await DTKHero.balanceOf(target.address)).toNumber()

    const totalSupplyAfter = (await DTKHero.totalSupply()).toNumber()

    // const depositStatusBefore = await DTKHero.tokenDepositStatus(0)
    // const depositMsgHash = ethers.utils.solidityKeccak256(
    //   ['string', 'address', 'address', 'uint256', 'uint256'],
    //   ['deposit(uint256,uint256,bytes)', DTKHero.address, target.address, 0, 1],
    // )

    // const depositAuthedSig = await authSigner.signMessage(
    //   ethers.utils.arrayify(depositMsgHash),
    // )

    // const trx = await DTKHero.connect(target).deposit(0, 1, depositAuthedSig)
    // await trx.wait()

    // const depositStatusAfter = await DTKHero.tokenDepositStatus(0)

    // const balanceFromReturn = await DTKHero.tokenDepositStatus(tokenBalanceAfter[0].tokenId)

    //   console.log('depositStatusBefore: ',depositStatusBefore);
    //   console.log('depositStatusAfter: ',depositStatusAfter);
    //   console.log('balanceFromReturn: ',balanceFromReturn);

    const tokenBalanceAfter = await DTKHero.tokensOfOwner(target.address)
    expect(balanceAfter).to.be.equal(balanceBefore + 1)
    expect(totalSupplyAfter).to.be.equal(SafeMath.add(totalSupplyBefore, 1))
    expect(tokenBalanceAfter.length).to.be.equal(tokenBalanceBefore.length + 1)
  })
})
