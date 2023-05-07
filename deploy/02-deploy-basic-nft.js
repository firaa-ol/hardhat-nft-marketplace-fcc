const { network } = require("hardhat");
const { developmentChains } = require("../helper-hardhat-config");
const { verify } = require("../utils/verify");

module.exports = async ({ deployments, getNamedAccounts }) => {
    const { deploy, log } = deployments;
    const seller = (await getNamedAccounts()).seller;

    const basicNft = await deploy("BasicNft", {
        from: seller,
        args: [],
        blockConfirmations: network.config.blockConfirmations || "1",
        log: true,
    });

    if (!developmentChains.includes(network.name)) {
        log("verifying..");
        await verify(basicNft.address, []);
    }
};

module.exports.tags = ["all", "basicNft"];
