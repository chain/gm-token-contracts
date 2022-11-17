const { deployProxy } = require("@openzeppelin/truffle-upgrades");
// const MDT = artifacts.require('MDT');
const GM = artifacts.require('GMToken');
const XCN = artifacts.require('XCNToken');
const Swap = artifacts.require('XCNTokenExchange');

module.exports = async (deployer, network, accounts) => {
    let admin = accounts[0]; // default admin of all upgradeable contracts
    let mdtAdmin = accounts[1];
    // let gmAdmin = accounts[2];
    let xcnAdmin = accounts[3];
    let swapAdmin = accounts[4];

    let xcnInstance = await deployer.deploy(XCN, { from: xcnAdmin });
    console.log('XCN token deployed: ', xcnInstance.address);
    let xcnBalance = await xcnInstance.balanceOf(xcnAdmin);
    console.log('Admin', xcnAdmin, 'has', xcnBalance.toString().slice(0, -18), 'XCN');

    // let gmInstance = await deployer.deploy(GM, { from: gmAdmin });
    let gmInstance = await deployProxy(GM, [], { deployer });
    console.log('GM token deployed: ', gmInstance.address);
    let gmOwner = await gmInstance.owner();
    let gmBalance = await gmInstance.balanceOf(gmOwner);
    console.log('GM Owner', gmOwner, 'has', gmBalance.toString().slice(0, -18), 'GM');

    let swapInstance = await deployer.deploy(Swap, gmInstance.address, xcnInstance.address, { from: swapAdmin });
    console.log('Swap contract deployed: ', swapInstance.address);

    let authorizeTx = await gmInstance.grantMinterRole(swapInstance.address, { from: gmOwner });
    // console.log(authorizeTx);
}