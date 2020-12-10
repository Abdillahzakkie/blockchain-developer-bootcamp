const { assert, expect } = require("chai");
const { ZERO_ADDRESS } = require("@openzeppelin/test-helpers/src/constants");
const RAIDTOKEN = artifacts.require("RAIDTOKEN");

const toWei = (_amount) => web3.utils.toWei(_amount.toString(), "ether");

contract("RAIDTOKEN", async ([admin]) => {
    beforeEach(async () => {
        this.token = await RAIDTOKEN.new({ from: admin });
    })

    describe('deployment', () => {
        it("should deploy token properly", async () => {
            assert.notEqual(this.token.address, "");
            assert.notEqual(this.token.address, null);
            assert.notEqual(this.token.address, undefined);
            assert.notEqual(this.token.address, ZERO_ADDRESS);
        })
    })

    describe('should mint and set initial supply properly', async () => {
        it("should set initial supply to 10000 tokens", async () => {
            const result = await this.token.totalSupply();
            expect(result.toString()).to.equal(toWei(10000));
        })

        it("should mint 10000 tokens ot the deployer's wallet", async () => {
            const result = await this.token.balanceOf(admin);
            expect(result.toString()).to.equal(toWei(10000));
        })
    })
    
})