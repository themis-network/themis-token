const GETToken = artifacts.require("GETToken");
const assertJump = require("zeppelin-solidity/test/helpers/assertJump.js");

const tokenName = "GETToken";
const tokenSymbol = "GET";
const decimalUints = 18;
const icoStartTime = web3.eth.getBlock(web3.eth.blockNumber).timestamp;
const icoLastingDate = 28;
const icoTotalSupplyLimit = 1000000000 * 10 ** 18;
const icoTokensPerEther = 10000;

const timeController = (() => {

    const addSeconds = (seconds) => new Promise((resolve, reject) =>
        web3.currentProvider.sendAsync({
            jsonrpc: "2.0",
            method: "evm_increaseTime",
            params: [seconds],
            id: new Date().getTime()
        }, (error, result) => error ? reject(error) : resolve(result.result)));

    const addDays = (days) => addSeconds(days * 24 * 60 * 60);

    const currentTimestamp = () => web3.eth.getBlock(web3.eth.blockNumber).timestamp;

    return {
        addSeconds,
        addDays,
        currentTimestamp
    };
})();

async function advanceToBlock(number) {
    await timeController.addDays(number);
}

contract("GETToken ico", function(accounts) {
    beforeEach(async function () {
        this.GetTokenSale = await GETToken.new(tokenName, tokenSymbol, decimalUints, icoStartTime, icoLastingDate, icoTotalSupplyLimit, icoTokensPerEther);
    });

    it("should right initialized", async function () {
        const actualTokenName = await this.GetTokenSale.name();
        assert.equal(actualTokenName, tokenName, "wrong token name");

        const actualSymbol = await this.GetTokenSale.symbol();
        assert.equal(actualSymbol, tokenSymbol, "wrong symbol");

        const actualDecinalUints = await this.GetTokenSale.decimals();
        assert.equal(actualDecinalUints, decimalUints, "wrong decimals");
    });

    it("should allow to pause by owner", async function () {
        await this.GetTokenSale.pause();
        const paused = await this.GetTokenSale.paused();
        assert.equal(paused, true);
    });

    it("should allow to unpause by owner", async function () {
        await this.GetTokenSale.pause();
        await this.GetTokenSale.unpause();
        const paused = await this.GetTokenSale.paused();
        assert.equal(paused, false);
    });

    it("should not allow to pause by not owner", async function() {
        try {
            await this.GetTokenSale.pause({from: accounts[1]});
        } catch (error) {
            return assertJump(error);
        }

        assert.fail("should throw before");
    });

    it("should not allow to unpause by not owner", async function() {
        try {
            await this.GetTokenSale.unpause({from: accounts[1]});
        } catch (error) {
            return assertJump(error);
        }

        assert.fail("should return before");
    });

    it("should send tokens to purchaser", async function() {

        const sendEther = 10;

        await this.GetTokenSale.sendTransaction({value: web3.toWei(sendEther, "ether"), from: accounts[1]});

        const tokenBalance = await this.GetTokenSale.balanceOf(accounts[1]);
        const sellTokens = sendEther * icoTokensPerEther * 10 ** 18;
        assert.equal(tokenBalance.valueOf(), sellTokens);
    });

    it("should allow to mint by owner(can mint)", async function() {
        const oriTokens = await this.GetTokenSale.balanceOf(accounts[1]).valueOf();

        const success = await this.GetTokenSale.mint(accounts[1], 10 * 10 ** 18);
        assert(success, true, "mint tokens failed");

        const nowTokens = await this.GetTokenSale.balanceOf(accounts[1]).valueOf();
        assert(nowTokens - oriTokens, 10 * 10 ** 18, "wrong mint token amount");
    });
    
    it("should not allow to mint by not owner(can mint)", async function () {
        try {
            await this.GetTokenSale.mint(accounts[2], 10 * 10 ** 18, {from: accounts[1]});
        } catch (error) {
            return assertJump(error);
        }

        assert.fail("should return before");
    });

    it("should not allow to mint by anyone(when finish mint)", async function () {
        const finishMint = await this.GetTokenSale.finishMinting();
        assert(finishMint, true, "finish minting failed");

        try {
            await this.GetTokenSale.mint(accounts[1], 10 * 10 ** 18);
        } catch (error) {
            return assertJump(error);
        }

        assert.fail("should return before");
    });

    it("should normal transfer tokens from account 0 to 1", async function () {
        const sendEther = 10;
        await this.GetTokenSale.sendTransaction({value: web3.toWei(sendEther, "ether"), from: accounts[0]});
        await this.GetTokenSale.sendTransaction({value: web3.toWei(sendEther, "ether"), from: accounts[1]});
        await this.GetTokenSale.transfer(accounts[1], sendEther * icoTokensPerEther * 10 ** 18, {from: accounts[0]});

        const tokens = await this.GetTokenSale.balanceOf(accounts[1]).valueOf();
        assert.equal(tokens, 20 * icoTokensPerEther *  10 ** 18, "transfer token wrong");
    });

    it("should allow to transfer from account 0 to 1(when approve)", async function() {
        const sendEther = 10;
        await this.GetTokenSale.sendTransaction({value: web3.toWei(sendEther, "ether"), from: accounts[0]});
        const beforeTokens0 = await this.GetTokenSale.balanceOf(accounts[0]).valueOf();
        const beforeTokens1 = await this.GetTokenSale.balanceOf(accounts[1]).valueOf();

        await this.GetTokenSale.approve(accounts[1], sendEther * icoTokensPerEther * 10 ** 18, {from: accounts[0]});
        const allowTokens = await this.GetTokenSale.allowance(accounts[0], accounts[1]);
        assert.equal(allowTokens, sendEther * icoTokensPerEther * 10 ** 18, "approve wrong");

        await this.GetTokenSale.transferFrom(accounts[0], accounts[1], sendEther * icoTokensPerEther * 10 ** 18, {from: accounts[1]});

        const afterTokens0 = await this.GetTokenSale.balanceOf(accounts[0]).valueOf();
        const afterTokens1 = await this.GetTokenSale.balanceOf(accounts[1]).valueOf();
        const transferTokens0 = beforeTokens0 - afterTokens0;
        const transferTokens1 = afterTokens1 - beforeTokens1;
        assert.equal(transferTokens0, sendEther * icoTokensPerEther * 10 ** 18, "account0: transfer from account 0 to 1 wrong");
        assert.equal(transferTokens1, sendEther * icoTokensPerEther * 10 ** 18, "account1: transfer from account 0 to 1 wrong");
    });
    
    it("should not allow to transfer from account 0 to 1(when not approve)", async function () {
        const sendEther = 10;
        await this.GetTokenSale.sendTransaction({value: web3.toWei(sendEther, "ether"), from: accounts[0]});
        try {
            await this.GetTokenSale.transferFrom(accounts[0], accounts[1], sendEther * 10 ** 18);
        } catch (error) {
            return assertJump(error);
        }

        assert.fail("should return before");
    })

    it("should not allow to purchase tokens when ico is over", async function () {
        const sendEther = 10;

        advanceToBlock(icoLastingDate+1);
        try {
            await this.GetTokenSale.sendTransaction({value: web3.toWei(sendEther, "ether"), from: accounts[1]});
        } catch (error) {
            return assertJump(error);
        }

        assert.fail("should return before");
    });

    it("should allow to change ownership by owner", async function () {
        await this.GetTokenSale.transferOwnership(accounts[1]);
        await this.GetTokenSale.pause({from: accounts[1]});
        const paused = await this.GetTokenSale.paused();
        assert.equal(paused, true);
    });
});