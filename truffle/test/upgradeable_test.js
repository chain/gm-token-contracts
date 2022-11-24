const truffleAssert = require('truffle-assertions');
const { upgradeProxy } = require("@openzeppelin/truffle-upgrades");
const { setup } = require('./contract-interaction');
const MDTExchangeV2 = artifacts.require('MDTTokenExchangeV2');
const XCNExchangeV2 = artifacts.require('XCNTokenExchangeV2');

contract('Test cases for upgradeable contracts', (accounts) => {
    const env = {
        DEPLOY_GM_WITH_PROXY: true
    }; // dummy env that ensures only upgradeable contracts tested in this file
    const environment = setup(env, accounts);

    const mdtAdmin = environment.roles.mdtAdmin;
    const gmAdmin = environment.roles.gmAdmin;
    const xcnAdmin = environment.roles.xcnAdmin;
    const user = environment.roles.user;

    const gmTransfer = environment.transactions.gmTransfer;
    const mdtTransfer = environment.transactions.mdtTransfer;
    const xcnTransfer = environment.transactions.xcnTransfer;
    const exchangeMdtForGm = environment.transactions.exchangeMdtForGm;
    const exchangeGmForXcn = environment.transactions.exchangeGmForXcn;
    const exchangeXcnForGm = environment.transactions.exchangeXcnForGm;
    const checkBalance = environment.transactions.checkBalance;

    const rate = 2; // pre-defined in V2 token exchange contract

    let contractInstances;
    let mdtExchangeContract2;


    beforeEach('Basic setup', async () => {
        contractInstances = await environment.contractInstances.loadAll();
    });

    it('Transfer tokens for further testing should not be reverted', async () => {
        try {
            await gmTransfer(gmAdmin, contractInstances.mdtExchangeContract.address, 100);
            await xcnTransfer(xcnAdmin, contractInstances.xcnExchangeContract.address, 100);
            await gmTransfer(gmAdmin, user, 100);
            await mdtTransfer(mdtAdmin, user, 100);
            await xcnTransfer(xcnAdmin, user, 100);
        } catch (ex) {
            assert.ok(false, 'Token transfer transaction is reverted');
        }
    });

    it('Should be able to swapping MDT for equivalent pre-deposited GM', async () => {
        let userBalancesBefore = await checkBalance(user);
        let contractBalancesBefore = await checkBalance(contractInstances.mdtExchangeContract.address);

        let amount = 10;
        await exchangeMdtForGm(user, amount);
        console.log(user, 'send', amount, 'MDT to', contractInstances.mdtExchangeContract.address, 'to exchange GM');
        let userBalancesAfter = await checkBalance(user);
        let contractBalancesAfter = await checkBalance(contractInstances.mdtExchangeContract.address);

        assert.equal(Number(userBalancesBefore.MDT) - Number(userBalancesAfter.MDT), Math.pow(10, 18) * amount, 'User should loss ' + amount + ' XCN');

        assert.equal(Number(userBalancesAfter.GM) - Number(userBalancesBefore.GM), Math.pow(10, 18) * amount, 'User should earn ' + amount + ' GM');
    });

    it('Should be able to upgrade MDT exchange contract', async () => {
        try {
            mdtExchangeContract2 = await upgradeProxy(contractInstances.mdtExchangeContract, MDTExchangeV2);
            console.log('Proxy', contractInstances.mdtExchangeContract.address, 'has upgraded its implementation');
        } catch (ex) {
            assert.ok(false, 'The transaction upgrades implementation is reverted');
        }
    });

    it('Should be able to swapping MDT for pre-deposited GM in rate pre-defined after upgraded to new implementation', async () => {
        let userBalancesBefore = await checkBalance(user);
        let contractBalancesBefore = await checkBalance(contractInstances.mdtExchangeContract.address);

        let amount = 10;
        await exchangeMdtForGm(user, amount);
        console.log(user, 'send', amount, 'MDT to', contractInstances.mdtExchangeContract.address, 'to exchange GM');
        let userBalancesAfter = await checkBalance(user);
        let contractBalancesAfter = await checkBalance(contractInstances.mdtExchangeContract.address);

        assert.equal(Number(userBalancesBefore.MDT) - Number(userBalancesAfter.MDT), Math.pow(10, 18) * amount, 'User should loss ' + amount + ' XCN');

        assert.equal(Number(userBalancesAfter.GM) - Number(userBalancesBefore.GM), Math.pow(10, 18) * amount * rate, 'User should earn ' + amount * rate + ' GM');
    });

});