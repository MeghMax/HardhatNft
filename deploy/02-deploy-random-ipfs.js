const { network, ethers } = require("hardhat")
const { developmentChains, networkConfig } = require("../helper-hardhat-config")
const { verify } = require("../utils/verify")
const { storeImages, storeTokenUriMetaData } = require("../utils/uploadToPinata")
require("dotenv").config()

const imagesLocation = "./images/RandomNft"

const metaDataTemplate = {
    name: "",
    description: "",
    image: "",
    attributes: [
        {
            trait_type: "Cuteness",
            value: 100,
        },
    ],
}

const FUND_AMOUNT = ethers.utils.parseUnits("10")

module.exports = async function ({ getNamedAccounts, deployments }) {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId
    let tokenUris = [
        "ipfs://QmZpwPc48ngDXBBYEDAMuhECDemnAHK59hRZXYGc8oiKxv",
        "ipfs://QmTLCfKcFuc7MmuPxtD2mE7kk9xGRQVGAGwpspQ5syBf8B",
        "ipfs://QmVWaPxzpuzij2pXVQRUFUE1iYjiayK3sWpBU7vk4N29U3",
    ]
    //get the ipfs hashes of our images
    if (process.env.UPLOAD_TO_PINATA == "true") {
        tokenUris = await handleTokenUris()
    }

    let vrfCoordinatorV2Address, subscriptionId
    if (developmentChains.includes(network.name)) {
        const vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
        vrfCoordinatorV2Address = vrfCoordinatorV2Mock.address
        const tx = await vrfCoordinatorV2Mock.createSubscription()
        const txRecipt = await tx.wait(1)
        subscriptionId = txRecipt.events[0].args.subId
        await vrfCoordinatorV2Mock.fundSubscription(subscriptionId, FUND_AMOUNT)
    } else {
        vrfCoordinatorV2Address = networkConfig[chainId].vrfCoordinatorV2
        subscriptionId = networkConfig[chainId].subscriptionId
    }

    log("---------------------------")

    const args = [
        vrfCoordinatorV2Address,
        subscriptionId,
        networkConfig[chainId].gasLane,
        networkConfig[chainId].callbackGasLimit,
        tokenUris,
        networkConfig[chainId].mintFee,
    ]
    const randomIpfsNft = await deploy("RandomIpfsNft", {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    })
    log("--------------------")
    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        log("Verifying...")
        await verify(randomIpfsNft.address, args)
    }
}

async function handleTokenUris() {
    tokenUris = []
    //store the image in ipfs
    //store the metadata in ipfs
    const { responses: imageUploadResponses, files } = await storeImages(imagesLocation)
    for (imageUploadResponseIndex in imageUploadResponses) {
        //create metadata
        //upload metadata
        let tokenUriMetaData = { ...metaDataTemplate }

        //pug.png shibainu.pnpg st.bernard.png
        tokenUriMetaData.name = files[imageUploadResponseIndex].replace("png", "")
        tokenUriMetaData.description = `An adorable ${tokenUriMetaData.name} pup!`
        tokenUriMetaData.image = `ipfs://${imageUploadResponses[imageUploadResponseIndex].IpfsHash}`
        console.log(`Uploading ${tokenUriMetaData.name}...`)

        //store the json to pinata/ipfs
        const metaDataUploadResponse = await storeTokenUriMetaData(tokenUriMetaData)
        tokenUris.push(`ipfs://${metaDataUploadResponse.IpfsHash}`)
    }
    console.log("Token URIs are uploaded! They are:")
    console.log(tokenUris)
    return tokenUris
}

module.exports.tags = ["all", "randomipfs", "main"]
