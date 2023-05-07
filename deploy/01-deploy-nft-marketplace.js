const { network } = require("hardhat");
const { developmentChains } = require("../helper-hardhat-config");
const { verify } = require("../utils/verify");

module.exports = async ({ deployments, getNamedAccounts }) => {
    const { deploy, log } = deployments;
    const { seller } = await getNamedAccounts();

    const nftMarketplace = await deploy("NftMarketplace", {
        from: seller,
        args: [],
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    });

    if (!developmentChains.includes(network.name)) {
        log("verifying..");
        await verify(nftMarketplace.address, []);
    }
};

module.exports.tags = ["all", "nftMarketplace"];
