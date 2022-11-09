import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network } = hre as any
  const { deploy } = deployments

  const { deployer } = await getNamedAccounts()

  const dtkHeroRes = await deploy('DTKHero', {
    from: deployer,
    args: [deployer, 3000],
    log: true,
    autoMine: true, // speed up deployment on local network (ganache, hardhat), no effect on live networks
  })

  console.log(
    `DTK Hero has been deployed to ${network.name} at ${dtkHeroRes.address} with ${dtkHeroRes.gasEstimates} gas`,
  )

  const dtkHeroContrlPoolRes = await deploy('DTKHeroControlPool', {
    from: deployer,
    args: [dtkHeroRes.address],
    log: true,
    autoMine: true, // speed up deployment on local network (ganache, hardhat), no effect on live networks
  })

  console.log(
    `DTK Hero Control Pool has been deployed to ${network.name} at ${dtkHeroContrlPoolRes.address} with ${dtkHeroContrlPoolRes.gasEstimates} gas`,
  )
}

func.tags = ['development']

export default func
