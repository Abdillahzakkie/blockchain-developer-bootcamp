const RAIDTOKEN = artifacts.require("RAIDTOKEN");
const Exchange = artifacts.require("Exchange");

module.exports = async (deployer, network, [admin, feeAccount]) => {
    await deployer.deploy(RAIDTOKEN);
    await deployer.deploy(Exchange, feeAccount);
    console.log(`Deployed contract: ${Exchange.address}`)
}