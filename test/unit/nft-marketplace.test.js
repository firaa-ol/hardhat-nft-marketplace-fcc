const { getNamedAccounts, deployments, ethers } = require("hardhat");
const { assert, expect } = require("chai");

describe("Nft Marketplace Tests", () => {
    let seller, buyer, nftMarketplace, basicNft, floorPrice, nonOwnerConnectedNftMarketPlace;

    beforeEach(async () => {
        seller = (await getNamedAccounts()).seller;
        buyer = (await getNamedAccounts()).buyer;
        await deployments.fixture(["all"]);
        nftMarketplace = await ethers.getContract("NftMarketplace", seller);
        basicNft = await ethers.getContract("BasicNft", seller);
        // mint two basic nfts
        await basicNft.mintNft();
        await basicNft.mintNft();
        // approve the first basicNft to the nftmarketplace contract
        await basicNft.approve(nftMarketplace.address, 0);
        floorPrice = ethers.utils.parseEther("1");

        const nonOwner = await ethers.getSigner(buyer);
        nonOwnerConnectedNftMarketPlace = await nftMarketplace.connect(nonOwner);
    });

    describe("List Item", () => {
        it("reverts when price is zero", async () => {
            await expect(nftMarketplace.listItem(basicNft.address, 0, 0)).to.be.revertedWith(
                "NftMarketplace__PriceMustBeAboveZero"
            );
        });

        it("reverts when listing unapproved token", async () => {
            await expect(
                nftMarketplace.listItem(basicNft.address, 1, floorPrice)
            ).to.be.revertedWith("NftMarketplace__NotApprovedForMarketPlace");
        });

        it("reverts when listing by non-owner", async () => {
            await expect(
                nonOwnerConnectedNftMarketPlace.listItem(basicNft.address, 0, floorPrice)
            ).to.be.revertedWith("NftMarketplace__NotOwner");
        });

        it("reverts when listing already listed item", async () => {
            await nftMarketplace.listItem(basicNft.address, 0, floorPrice);

            await expect(nftMarketplace.listItem(basicNft.address, 0, 0)).to.be.revertedWith(
                "NftMarketplace__AlreadyListed"
            );
        });

        it("emits event when successfuly listing a token", async () => {
            await expect(nftMarketplace.listItem(basicNft.address, 0, floorPrice)).to.emit(
                nftMarketplace,
                "ItemListed"
            );
        });

        it("stores the listing", async () => {
            await nftMarketplace.listItem(basicNft.address, 0, floorPrice);
            const listing = await nftMarketplace.getListing(basicNft.address, 0);
            assert.equal(listing.seller, seller);
            assert.equal(listing.price, floorPrice.toString());
        });
    });

    describe("Buy Item", () => {
        let buyerNftMarketplace;
        beforeEach(async () => {
            // list the first token
            await nftMarketplace.listItem(basicNft.address, 0, floorPrice);
            // approve the second but not list
            await basicNft.approve(nftMarketplace.address, 1);
            const buyerSigner = await ethers.getSigner(buyer);
            buyerNftMarketplace = nftMarketplace.connect(buyerSigner);
        });

        it("reverts when buying unlisted item", async () => {
            await expect(buyerNftMarketplace.buyItem(basicNft.address, 1)).to.be.revertedWith(
                "NftMarketplace__NotListed"
            );
        });

        it("reverts when bidding price is below asking price", async () => {
            await expect(
                buyerNftMarketplace.buyItem(basicNft.address, 0, {
                    value: ethers.utils.parseEther("0.5"),
                })
            ).to.be.revertedWith("NftMarketplace__PriceNotMet");
        });

        it("assigns the proceeds to the seller", async () => {
            const biddingPrice = ethers.utils.parseEther("1.5");
            await buyerNftMarketplace.buyItem(basicNft.address, 0, {
                value: biddingPrice,
            });
            const sellerProceeds = await buyerNftMarketplace.getProceeds(seller);
            assert.equal(sellerProceeds.toString(), biddingPrice.toString());
        });

        it("removes the listing after it is bought", async () => {
            const biddingPrice = ethers.utils.parseEther("1.5");
            await buyerNftMarketplace.buyItem(basicNft.address, 0, {
                value: biddingPrice,
            });

            const listing = await nftMarketplace.getListing(basicNft.address, 0);
            assert.equal(listing.seller, "0x0000000000000000000000000000000000000000");
            assert.equal(listing.price.toString(), "0");
        });

        it("emits event after a listing is bought", async () => {
            await expect(
                buyerNftMarketplace.buyItem(basicNft.address, 0, {
                    value: ethers.utils.parseEther("1"),
                })
            ).to.emit(buyerNftMarketplace, "ItemBought");
        });

        it("transfers the token to the buyer", async () => {
            await buyerNftMarketplace.buyItem(basicNft.address, 0, {
                value: ethers.utils.parseEther("1"),
            });

            const newOwner = await basicNft.ownerOf(0);
            assert.equal(newOwner, buyer);
        });
    });

    describe("Cancel Listing", () => {
        beforeEach(async () => {
            await nftMarketplace.listItem(basicNft.address, 0, floorPrice);
        });

        it("removes the listing", async () => {
            await nftMarketplace.cancelListing(basicNft.address, 0);

            const listing = await nftMarketplace.getListing(basicNft.address, 0);
            assert.equal(listing.seller, "0x0000000000000000000000000000000000000000");
            assert.equal(listing.price.toString(), "0");
        });

        it("emits event after cancelling a listing", async () => {
            await expect(nftMarketplace.cancelListing(basicNft.address, 0)).to.emit(
                nftMarketplace,
                "ItemCancelled"
            );
        });

        it("reverts when cancelling unlisted item", async () => {
            await expect(nftMarketplace.cancelListing(basicNft.address, 1)).to.be.revertedWith(
                "NftMarketplace__NotListed"
            );
        });

        it("reverts when non-owner cancels a listing", async () => {
            await expect(
                nonOwnerConnectedNftMarketPlace.cancelListing(basicNft.address, 0)
            ).to.be.revertedWith("NftMarketplace__NotOwner");
        });
    });

    describe("Update Listing", () => {
        let newPrice;
        beforeEach(async () => {
            await nftMarketplace.listItem(basicNft.address, 0, floorPrice);
            newPrice = ethers.utils.parseEther("2.5");
        });

        it("updates the price of the listing", async () => {
            await nftMarketplace.updateListing(basicNft.address, 0, newPrice);
            const listing = await nftMarketplace.getListing(basicNft.address, 0);
            assert.equal(listing.price.toString(), newPrice.toString());
        });

        it("emits event when listing is updated", async () => {
            await expect(nftMarketplace.updateListing(basicNft.address, 0, newPrice)).to.emit(
                nftMarketplace,
                "ItemListed"
            );
        });

        it("reverts when new price is zero", async () => {
            await expect(nftMarketplace.updateListing(basicNft.address, 0, 0)).to.be.revertedWith(
                "NftMarketplace__PriceMustBeAboveZero"
            );
        });

        it("reverts when updating unlisted item", async () => {
            await expect(
                nftMarketplace.updateListing(basicNft.address, 1, newPrice)
            ).to.be.revertedWith("NftMarketplace__NotListed");
        });

        it("reverts when non-owner updates a listing", async () => {
            await expect(
                nonOwnerConnectedNftMarketPlace.updateListing(basicNft.address, 0, newPrice)
            ).to.be.revertedWith("NftMarketplace__NotOwner");
        });
    });

    describe("Withdraw Proceeds", () => {
        let sellerBalanceBeforeWithdrawing;
        beforeEach(async () => {
            await nftMarketplace.listItem(basicNft.address, 0, floorPrice);
            await nonOwnerConnectedNftMarketPlace.buyItem(basicNft.address, 0, {
                value: floorPrice,
            });
            sellerBalanceBeforeWithdrawing = await ethers.provider.getBalance(seller);
        });

        it("reverts when proceeds is zero", async () => {
            await expect(nonOwnerConnectedNftMarketPlace.withdrawProceeds()).to.be.revertedWith(
                "NftMarketplace__NoProceeds"
            );
        });

        it("transfers the proceeds to the seller", async () => {
            await nftMarketplace.withdrawProceeds();
            const sellerBalanceAfterWithdrawing = await ethers.provider.getBalance(seller);
            // the gas fees will be the difference
            assert(
                sellerBalanceBeforeWithdrawing.add(floorPrice).gt(sellerBalanceAfterWithdrawing)
            );
        });

        it("sets proceeds for the seller to zero", async () => {
            await nftMarketplace.withdrawProceeds();
            const proceeds = await nftMarketplace.getProceeds(seller);
            assert.equal(proceeds.toString(), "0");
        });
    });
});
