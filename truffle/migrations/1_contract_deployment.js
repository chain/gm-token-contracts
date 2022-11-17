const { deployProxy } = require("@openzeppelin/truffle-upgrades");
// const MDT = artifacts.require('MDT');
const GM = artifacts.require('GMToken');
const GMUpgradeable = artifacts.require('GMTokenUpgradeable');
const XCN = artifacts.require('XCNToken');
const Swap = artifacts.require('XCNTokenExchange');

module.exports = (deployer, network, accounts) => {
    let admin = accounts[0]; // default admin of all upgradeable contracts
    let mdtAdmin = accounts[1];
    let gmAdmin = accounts[2];
    let xcnAdmin = accounts[3];
    let swapAdmin = accounts[4];

    let deployXcnContract = () => {
        return deployer.deploy(XCN, { from: xcnAdmin })
            .then(xcnInstance => {
                console.log('XCN token deployed: ', xcnInstance.address);
                return xcnInstance.balanceOf(xcnAdmin)
                    .then(xcnBalance => console.log('Admin', xcnAdmin, 'has', xcnBalance.toString().slice(0, -18), 'XCN'))
                    .then(() => Promise.resolve(xcnInstance));
            });
    };

    let deployGmContract = () => {
        return deployer.deploy(GM, { from: gmAdmin })
            // deployProxy(GMUpgradeable, [], { deployer })
            .then(gmInstance => {
                console.log('GM token deployed: ', gmInstance.address);
                return gmInstance.owner()
                    .then(gmOwner => {
                        gmAdmin = gmOwner;
                        return gmInstance.balanceOf(gmOwner)
                            .then(gmBalance => console.log('GM Owner', gmOwner, 'has', gmBalance.toString().slice(0, -18), 'GM'))
                    }).then(() => Promise.resolve(gmInstance));
            });
    };

    let deploySwapContract = (gmInstance, xcnInstance) => {
        return deployer.deploy(Swap, gmInstance.address, xcnInstance.address, { from: swapAdmin })
            .then(swapInstance => {
                console.log('Swap contract deployed: ', swapInstance.address);
                return gmInstance.grantMinterRole(swapInstance.address, { from: gmAdmin })
                    .then(authorizeTx => authorizeTx.tx)
                    .then(console.log) // authorizeTx
                    .then(() => Promise.resolve(swapInstance));
            });
    }

    deployGmContract()
        .then(gmInstance => deployXcnContract()
            .then(xcnInstance => deploySwapContract(gmInstance, xcnInstance)));
}