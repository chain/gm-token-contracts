const dotenv = require('dotenv');
const { deployProxy } = require("@openzeppelin/truffle-upgrades");
const MDT = artifacts.require('MDTToken');
const GM = artifacts.require('GMToken');
const GMUpgradeable = artifacts.require('GMTokenUpgradeable');
const XCN = artifacts.require('XCNToken');
const MDTExchange = artifacts.require('MDTTokenExchange');
const XCNExchange = artifacts.require('XCNTokenExchange');

module.exports = (deployer, network, accounts) => {
    dotenv.config('.env');
    const deployGMWithProxy = process.env.DEPLOY_GM_WITH_PROXY ? process.env.DEPLOY_GM_WITH_PROXY : false;

    let admin = accounts[0]; // default admin of all upgradeable contracts
    let mdtAdmin = accounts[1];
    let gmAdmin = deployGMWithProxy ? admin : accounts[2];
    let xcnAdmin = accounts[3];
    let mdtExchangeAdmin = accounts[0]; // non-upgradeable contract should be accounts[4];
    let xcnExchangeAdmin = accounts[0]; // non-upgradeable contract should be accounts[5];

    let deployGmContract = () => {
        let contractOwner = accounts[2];
        return deployer.deploy(GM, {from: contractOwner})
            .then(gmInstance => {
                console.log('GM token deployed: ', gmInstance.address);
                return gmInstance.balanceOf(contractOwner)
                    .then(gmBalance => console.log('GM Owner', contractOwner, 'has', gmBalance.toString().slice(0, -18), 'GM'))
                    .then(() => Promise.resolve(gmInstance));
            });
    };

    let deployUpgradeableGmContract = () => {
        let contractOwner = accounts[0];
        return deployProxy(GMUpgradeable, [], { deployer })
            .then(gmInstance => {
                console.log('Upgradeable GM token deployed: ', gmInstance.address);
                return gmInstance.balanceOf(contractOwner)
                    .then(gmBalance => console.log('GM Owner', contractOwner, 'has', gmBalance.toString().slice(0, -18), 'GM'))
                    .then(() => Promise.resolve(gmInstance));
            });
    };

    let chooseGmInstance = (gmInstance, upgradeableGmInstance) => {
        return deployGMWithProxy ? upgradeableGmInstance : gmInstance;
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

    let deployMDTExchangeContract = (gmInstance, mdtInstance) => {
        return deployProxy(MDTExchange, [ gmInstance.address, mdtInstance.address ], { deployer })
            .then(exchangeInstance => {
                console.log('MDT Exchange contract deployed: ', exchangeInstance.address);
                return Promise.resolve(exchangeInstance);
            });
    };

    let deployXCNExchangeContract = (gmInstance, xcnInstance) => {
        return deployProxy(XCNExchange, [ gmInstance.address, xcnInstance.address, true ], { deployer })
            .then(exchangeInstance => {
                console.log('XCN Exchange contract deployed: ', exchangeInstance.address);
                return gmInstance.grantMinterRole(exchangeInstance.address, { from: gmAdmin })
                    .then(authorizeTx => authorizeTx.tx)
                    // .then(console.log) // authorizeTx
                    .then(() => Promise.resolve(exchangeInstance));
            });
    };

    deployGmContract()
        .then(gmInstance => deployUpgradeableGmContract()
            .then(upgradeableGmInstance => chooseGmInstance(gmInstance, upgradeableGmInstance))
            .then(gmInstance => deployXcnContract()
                .then(xcnInstance => deployXCNExchangeContract(gmInstance, xcnInstance))
                .then(() => deployMdtContract())
                .then(mdtInstance => deployMDTExchangeContract(gmInstance, mdtInstance))
            )
        );
}