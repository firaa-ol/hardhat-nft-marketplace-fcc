const { ethers, network, getNamedAccounts } = require("hardhat");
const { moveBlocks } = require("../utils/move-blocks");

const TOKEN_ID = 0;

async function buy() {
    const buyer = (await getNamedAccounts()).buyer;
    const nftMarketplace = await ethers.getContract("NftMarketplace", buyer);
    const basicNft = await ethers.getContract("BasicNft");

    const tx = await nftMarketplace.buyItem(basicNft.address, TOKEN_ID, {
        value: ethers.utils.parseEther("3"),
    });
    await tx.wait(1);
    console.log("Bought NFT Listing..");
    if (network.config.chainId == "31337") {
        await moveBlocks(2, (sleepAmount = 1000));
    }
}

buy()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
