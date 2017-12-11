const GETToken = artifacts.require(`./GETToken.sol`)

module.exports = (deployer) => {
  const tokenName = "GETToken";
  const tokenSymbol = "GET";
  const decimalUints = 18;
  const icoStartTime = web3.eth.getBlock(web3.eth.blockNumber).timestamp;
  const icoLastingDate = 28;
  const icoTotalSupplyLimit = 1000000000 * 10 ** 18;
  const icoTokensPerEther = 10000;
  deployer.deploy(GETToken, tokenName, tokenSymbol, decimalUints, icoStartTime, icoLastingDate, icoTotalSupplyLimit, icoTokensPerEther)
}
