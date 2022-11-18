const { deployProxy } = require("@openzeppelin/truffle-upgrades");
const MDT = artifacts.require('MDTToken');
const GM = artifacts.require('GMToken');
const GMUpgradeable = artifacts.require('GMTokenUpgradeable');
const XCN = artifacts.require('XCNToken');
const Exchange = artifacts.require('XCNTokenExchange');

module.exports = (deployer, network, accounts) => {
    let admin = accounts[0]; // default admin of all upgradeable contracts
    let mdtAdmin = accounts[1];
    let gmAdmin = accounts[2];
    let xcnAdmin = accounts[3];
    let mdtExchangeAdmin = accounts[4];
    let xcnExchangeAdmin = accounts[5];

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

    let deployMdtContract = () => {
        return deployer.deploy(MDT, { from: mdtAdmin })
            .then(mdtInstance => {
                console.log('MDT token deployed: ', mdtInstance.address);
                return mdtInstance.balanceOf(mdtAdmin)
                    .then(mdtBalance => console.log('Admin', mdtAdmin, 'has', mdtBalance.toString().slice(0, -18), 'MDT'))
                    .then(() => Promise.resolve(mdtInstance));
            });
    };

    let deployXcnContract = () => {
        return deployer.deploy(XCN, { from: xcnAdmin })
            .then(xcnInstance => {
                console.log('XCN token deployed: ', xcnInstance.address);
                return xcnInstance.balanceOf(xcnAdmin)
                    .then(xcnBalance => console.log('Admin', xcnAdmin, 'has', xcnBalance.toString().slice(0, -18), 'XCN'))
                    .then(() => Promise.resolve(xcnInstance));
            });
    };

    let deployExchangeContract = (gmInstance, xcnInstance) => {
        return deployProxy(Exchange, [ gmInstance.address, xcnInstance.address, true ], { deployer })
            .then(exchangeInstance => {
                console.log('Exchange contract deployed: ', exchangeInstance.address);
                return gmInstance.grantMinterRole(exchangeInstance.address, { from: gmAdmin })
                    .then(authorizeTx => authorizeTx.tx)
                    .then(console.log) // authorizeTx
                    .then(() => Promise.resolve(exchangeInstance));
            });
    }

    deployGmContract()
        .then(gmInstance => deployXcnContract()
            .then(xcnInstance => deployExchangeContract(gmInstance, xcnInstance)))
        .then(() => deployMdtContract());
}