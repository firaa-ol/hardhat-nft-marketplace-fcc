const { ethers } = require("hardhat");

const networkConfig = {
    5: {
        name: "goerli",
    },
    31337: {
        name: "hardhat",
    },
    11155111: {
        name: "sepolia",
    },
};

const developmentChains = ["hardhat", "localhost"];

module.exports = { networkConfig, developmentChains };
