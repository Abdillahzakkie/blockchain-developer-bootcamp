const { expect, assert } = require("chai");
const { expectEvent } = require('@openzeppelin/test-helpers');
const { ZERO_ADDRESS } = require("@openzeppelin/test-helpers/src/constants");

const Exchange = artifacts.require("Exchange");
const RAIDTOKEN = artifacts.require("RAIDTOKEN");

const toWei = _amount => web3.utils.toWei(_amount.toString(), "ether");
const fromWei = _amount => web3.utils.fromWei(_amount.toString(), "ether");

const errorMessage = {
    onlyOwner: "Ownable: caller is not the owner",
    amountExceedBalance: "amount exceeds balance",
    zeroDeposit: "deposit must be greater than zero",
}


contract("Exchange", async ([admin, feeAccount, user1, user2, user3]) => {
    beforeEach(async () => {
        this.token = await RAIDTOKEN.new({ from: admin });
        this.contract = await Exchange.new(feeAccount, { from: admin });

        // transfer 100 tokens to user1 and user2
        await this.token.transfer(user1, toWei(100), { from: admin });
        await this.token.transfer(user2, toWei(100), { from: admin });
    })

    describe('deployment', () => {
        it("should deploy exchange properly", async () => {
            assert.notEqual(this.contract.address, "");
            assert.notEqual(this.contract.address, null);
            assert.notEqual(this.contract.address, undefined);
            assert.notEqual(this.contract.address, ZERO_ADDRESS);
        })

        it("shoul set feeAccount to the deployer", async () => {
            const result = await this.contract.feeAccount();
            expect(result).to.equal(feeAccount);
        })

        it("should set feePercent to 10", async () => {
            const result = await this.contract.feePercent();
            expect(result.toString()).to.equal('10');
        })

    })

    describe('change feeAccount', async () => {
        it("should change feeAccount", async () => {
            await this.contract.changeFeeAccount(user1, { from: feeAccount });
            const result = await this.contract.feeAccount();
            expect(result).to.equal(user1);
        })

        it("should not fail if msg.sender isn't the feeAccount", async () => {
            try {
                await this.contract.changeFeeAccount(user1, { from: user1 });
            } catch (error) { 
                assert(error.message.includes(errorMessage.onlyOwner));
                return;
            }
            assert(false);
        })
    })

    describe('change feePercent', async () => {
        it("should change feePercent", async () => {
            await this.contract.changeFeePercent(5, { from: feeAccount });
            const result = await this.contract.feePercent();
            expect(result.toString()).to.equal('5');
        })

        it("should not fail if msg.sender isn't the admin", async () => {
            try {
                await this.contract.changeFeePercent(5, { from: user1 });
            } catch (error) { 
                assert(error.message.includes(errorMessage.onlyOwner));
                return;
            }
            assert(false);
        })
    })

    describe('fallback', () => {
        it("should not allow direct ether deposit", async () => {
            try {
                await this.contract.sendTransaction({
                    from: user1,
                    value: toWei(1)
                })
            } catch (error) {
                assert(error.message.includes("failed"));
                return;
            }
            assert(false);
        })
    })
    
    describe('deposit tokens', () => {
        const _amount = toWei(10);

        beforeEach(async () => {
            await this.token.approve(this.contract.address, _amount, { from: user1 });
        })

        it("should deposit tokens properly", async () => {
            await this.contract.depositToken(this.token.address, _amount, { from: user1 });
            const result = await this.contract.balanceOf(this.token.address, user1);
            expect(result.toString()).to.equal(_amount);
        })

        it("should emit Deposit event", async () => {
            const reciept = await this.contract.depositToken(this.token.address, _amount, { from: user1 });
            expectEvent(reciept, 'Deposit', { 
                token: this.token.address, 
                balance: _amount,
                user: user1, 
                amount: _amount 
            })
        })

        it("should not deposit zero token", async () => {
            try {
                await this.contract.depositToken(this.token.address, toWei(0), { from: user1 });
            } catch (error) {
                assert(error.message.includes(errorMessage.zeroDeposit));
                return;
            }
            assert(false);
        })

        it("should fail if approved amount is less than the deposited amount", async () => {
            try {
                await this.token.approve(this.contract.address, toWei(5), { from: user1 });
                await this.contract.depositToken(this.token.address, _amount, { from: user1 });
            } catch (error) {
                assert(error.message.includes("ERC20: transfer amount exceeds allowance"));
                return;
            }
            assert(false);
        })
        
        it("should reject ether deposit", async () => {
            try {
                await this.contract.depositToken(ZERO_ADDRESS, _amount, { from: user1 });
            } catch (error) {
                assert(error.message.includes("ether deposit are not allowed on this method"));
                return;
            }
            assert(false);
        })
    })

    describe('withdraw tokens', () => {
        beforeEach(async () => {
            await this.token.approve(this.contract.address, toWei(10), { from: user1 });
            await this.contract.depositToken(this.token.address, toWei(10), { from: user1 });
        })

        it("should withdraw tokens from contract", async () => {
            await this.contract.withdrawToken(this.token.address, toWei(5), { from: user1 });
            const result = await this.token.balanceOf(user1);
            expect(result.toString()).to.equal(toWei(94.5));
        })

        it("should deduct amount properly", async () => {
            await this.contract.withdrawToken(this.token.address, toWei(5), { from: user1 });
            const result = await this.contract.balanceOf(this.token.address, user1);
            expect(result.toString()).to.equal(toWei(5));
        })

        it("should deposit trading fee to feeAccount", async () => {
            await this.contract.withdrawToken(this.token.address, toWei(5), { from: user1 });
            const result = await this.contract.balanceOf(this.token.address, feeAccount);
            expect(result.toString()).to.equal(toWei(0.5));
        })

        it("should emit withdrawal event", async () => {
            const reciept = await this.contract.withdrawToken(this.token.address, toWei(5), { from: user1 });
            expectEvent(reciept, 'Withdrawal', {
                token: this.token.address,
                user: user1,
                amount: toWei(5) 
            })
        })

        it("should fail if withdrawal amount exceed balance", async () => {
            try {
                await this.contract.withdrawToken(this.token.address, toWei(15), { from: user1 });
            } catch (error) {
                assert(error.message.includes(errorMessage.amountExceedBalance));
                return;
            }
            assert(false);
        })
    })
    
    describe('deposit Ether', () => {
        it("should deposit ether properly", async () => {
            await this.contract.depositEther({ from: user1, value: toWei(1) });
            const result = await this.contract.balanceOf(ZERO_ADDRESS, user1);
            expect(result.toString()).to.equal(toWei(1));
        })

        it("should emit deposit event", async () => {
            const reciept = await this.contract.depositEther({ from: user1, value: toWei(1) });
            expectEvent(reciept, 'Deposit', { 
                token: ZERO_ADDRESS, 
                user: user1, 
                balance: toWei(1),
                amount: toWei(1) 
            })
        })

        it("should not deposit zero ether", async () => {
            try {
                await this.contract.depositEther({ from: user1, value: toWei(0) });
            } catch (error) {
                assert(error.message.includes(errorMessage.zeroDeposit));
                return;
            }
            assert(false);
        })

    })
    
    describe('withdraw Ether', () => {
        beforeEach(async () => {
            await this.contract.depositEther({ from: user1, value: toWei(2) });
        })

        it("should withdraw ether properly", async () => {
            await this.contract.withdrawEther(toWei(1), { from: user1 });
            const result = await this.contract.balanceOf(ZERO_ADDRESS, user1);
            expect(result.toString()).to.equal(toWei(1));
        })

        it("should deposit trading fee to feeAccount", async () => {
            await this.contract.withdrawEther(toWei(1), { from: user1 });
            const result = await this.contract.balanceOf(ZERO_ADDRESS, feeAccount);
            expect(result.toString()).to.equal(toWei(0.1));
        })

        it("should emit withdrawal event", async () => {
            const reciept = await this.contract.withdrawEther(toWei(1), { from: user1 });
            expectEvent(reciept, 'Withdrawal', {
                token: ZERO_ADDRESS,
                user: user1,
                balance: toWei(1),
                amount: toWei(1) 
            })
        })

        it("should fail if amount exceed balance", async () => {
            try {
                await this.contract.withdrawEther(toWei(10), { from: user1 });
            } catch (error) {
                assert(error.message.includes(errorMessage.amountExceedBalance));
                return;
            }
            assert(false);
        })

    })
    
    describe('make trade', () => {
        let reciept;
        let _tokenGet, _amountGet, _tokenGive, _amountGive;

        beforeEach(async () => {
            [_tokenGet, _amountGet, _tokenGive, _amountGive] = [ZERO_ADDRESS, toWei(1), this.token.address, toWei(1)];
            reciept = await this.contract.makeOrder(_tokenGet, _amountGet, _tokenGive, _amountGive, { from: user1 });
        })

        it("should update orderCount", async () => {
            const result = await this.contract.orderCount();
            expect(result.toString()).to.equal('1');
        })

        it("should track order", async () => {
            const result = await this.contract.orders(1);
            const { user, tokenGet, amountGet, tokenGive, amountGive } = result;
            expect(user).to.equal(user1);
            expect(tokenGet).to.equal(_tokenGet);
            expect(amountGet.toString()).to.equal(_amountGet);
            expect(tokenGive).to.equal(_tokenGive);
            expect(amountGive.toString()).to.equal(_amountGive);
        })

        it("should emit Order event", async () => {
            expectEvent(reciept, 'Order', {
                id: '1',
                user: user1,
                tokenGet: _tokenGet, 
                amountGet: _amountGet, 
                tokenGive: _tokenGive, 
                amountGive: _amountGive 
            })
        })
    })

    describe('cancel order', () => {
        let _tokenGet, _amountGet, _tokenGive, _amountGive;

        beforeEach(async () => {
            [_tokenGet, _amountGet, _tokenGive, _amountGive] = [ZERO_ADDRESS, toWei(1), this.token.address, toWei(1)];
            await this.contract.makeOrder(_tokenGet, _amountGet, _tokenGive, _amountGive, { from: user1 });
        })

        it("should cancel order", async () => {
            await this.contract.cancelOrder('1', { from: user1 });
            const result = await this.contract.cancelledOrders(1);
            expect(result).to.equal(true);
        })

        it("should fail if order has already been cancelled", async () => {
            try {
                await this.contract.cancelOrder('1', { from: user1 });
                await this.contract.cancelOrder('1', { from: user1 });
            } catch (error) {
                assert(error.message.includes("order has already been cancelled"));
                return;
            }
            assert(false);
        })

        it("should fail if msg.sender is not the owner", async () => {
            try {
                await this.contract.cancelOrder('1', { from: admin });
            } catch (error) {
                assert(error.message.includes(errorMessage.onlyOwner));
                return;
            }
            assert(false);
        })
    })
    
    
})