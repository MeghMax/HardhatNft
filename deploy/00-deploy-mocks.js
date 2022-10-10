const { network } = require("hardhat")
const { developmentChains } = require("../helper-hardhat-config")
const BASE_FEE = ethers.utils.parseEther("0.25") //0.25 is the premium, it costs 0.25 LINK
const GAS_PRICE_LINK = 1e9

const DECIMALS = "18"
const INITIAL_PRICE = ethers.utils.parseUnits("2000", "ether")

module.exports = async function ({ getNamedAccounts, deployments }) {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()

    if (developmentChains.includes(network.name)) {
        log("Local Network Detected! Deploying mocks")
        await deploy("VRFCoordinatorV2Mock", {
            from: deployer,
            log: true,
            args: [BASE_FEE, GAS_PRICE_LINK],
        })

        await deploy("MockV3Aggregator", {
            from: deployer,
            log: true,
            args: [DECIMALS, INITIAL_PRICE],
        })

        log("Mocks Deployed!")
        log("----------------------------------")
    }
}
module.exports.tags = ["all", "mocks"]
