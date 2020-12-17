const { web3 } = require("@openzeppelin/test-helpers/src/setup");
const { ZERO_ADDRESS } = require("@openzeppelin/test-helpers/src/constants");

const Token = artifacts.require("RAIDTOKEN");
const Exchange = artifacts.require("Exchange");

module.exports = async callback => {
    try {
        const [admin, user1, user2, user3] = await web3.eth.getAccounts();
        const toWei = _amount => web3.utils.toWei(_amount.toString(), "ether");
        const fromWei = _amount => web3.utils.fromWei(_amount.toString(), "ether");

        // Fetch deployed token address
        const token = await Token.deployed();

        // Fetch deployed exchange address
        const exchange = await Exchange.deployed();

        // Give some tokens to user1 and user2
        await token.transfer(user1, toWei(1000), { from: admin });
        await token.transfer(user2, toWei(1000), { from: admin });

        // User1 deposit tokens
        let _amount = toWei(1);
        await exchange.depositEther({ from: user1, value: _amount });
        console.log(`Deposit ${fromWei(_amount)} Ether from ${user1}`);

        // User2 approves tokens
        _amount = toWei(100);
        await token.approve(exchange.address, _amount, { from: user2 });

        // User2 deposits tokens
        await exchange.depositToken(token.address, _amount, { from: user2 });
        console.log(`Deposit ${fromWei(_amount)} RAID from ${user1}`);

        // User1 makes order to get tokens
        let result, orderId;
        result = await exchange.makeOrder(token.address, toWei(100), ZERO_ADDRESS, toWei(1), {from: user1 });
        console.log(`Made order from ${user1}`);

        orderId = result.logs[0].args.id;
        await exchange.cancelOrder(orderId, { from: user1 });
        console.log(`Cancelled order from ${user1}`);


        // SEED FLLED ORDERS
        result = await exchange.makeOrder(token.address, toWei(100), ZERO_ADDRESS, toWei(1), {from: user1 });
        console.log(`Made order from ${user1}`);

        orderId = result.logs[0].args.id;
        await exchange.fillOrder(orderId, { from: user2 });
        console.log(`Filled order from ${user2}`);


        // User1 makes 10 trades
        for(let i = 1; i < 10; ++i) {
            result = await exchange.makeOrder(token.address, toWei(10 * i), ZERO_ADDRESS, toWei(.01), {
                from: user1
            });
            console.log(`Make order from ${user1}`)
        }

        // User2 makes 10 trades
        for(let i = 1; i < 10; ++i) {
            result = await exchange.makeOrder(ZERO_ADDRESS, toWei(0.01), token.address,  toWei(10 * i), {
                from: user2
            });
            console.log(`Make order from ${user2}`)
        }

    } catch (error) { console.error(error) }
    callback();
}