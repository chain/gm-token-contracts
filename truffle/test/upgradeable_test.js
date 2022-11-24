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
            await upgradeProxy(contractInstances.mdtExchangeContract, MDTExchangeV2);
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

    it('Burning GM should be exchanged for equivalent XCN', async () => {
        let userBalancesBefore = await checkBalance(user);
        let contractBalancesBefore = await checkBalance(contractInstances.xcnExchangeContract.address);

        let amount = 10;
        await exchangeGmForXcn(user, amount);
        console.log(user, 'send', amount, 'GM to', contractInstances.xcnExchangeContract.address, 'to exchange XCN');
        let userBalancesAfter = await checkBalance(user);
        let contractBalancesAfter = await checkBalance(contractInstances.xcnExchangeContract.address);

        assert.equal(Number(userBalancesBefore.GM) - Number(userBalancesAfter.GM), Math.pow(10, 18) * amount, 'User should loss ' + amount + ' GM');

        assert.equal(Number(userBalancesAfter.XCN) - Number(userBalancesBefore.XCN), Math.pow(10, 18) * amount, 'User should earn ' + amount + ' XCN');

        assert.equal(Number(contractBalancesAfter.GM) - Number(contractBalancesBefore.GM), 0, 'Contract should not have any changes on GM balance');
    });

    it('Depositing XCN to Exchange contract should mint equivalent amount of GM', async () => {
        let userBalancesBefore = await checkBalance(user);
        let contractBalancesBefore = await checkBalance(contractInstances.xcnExchangeContract.address);

        let amount = 5;
        await exchangeXcnForGm(user, amount);
        console.log(user, 'send', amount, 'XCN to', contractInstances.xcnExchangeContract.address, 'to exchange GM');
        let userBalancesAfter = await checkBalance(user);
        let contractBalancesAfter = await checkBalance(contractInstances.xcnExchangeContract.address);

        assert.equal(Number(userBalancesBefore.XCN) - Number(userBalancesAfter.XCN), Math.pow(10, 18) * amount, 'User should loss ' + amount + ' XCN');

        assert.equal(Number(userBalancesAfter.GM) - Number(userBalancesBefore.GM), Math.pow(10, 18) * amount, 'User should earn ' + amount + ' GM');

        assert.equal(Number(contractBalancesAfter.GM) - Number(contractBalancesBefore.GM), 0, 'Contract should not have any changes on GM balance');
    });

    it('Should be able to upgrade XCN exchange contract', async () => {
        try {
            await upgradeProxy(contractInstances.xcnExchangeContract, XCNExchangeV2);
            console.log('Proxy', contractInstances.xcnExchangeContract.address, 'has upgraded its implementation');
        } catch (ex) {
            assert.ok(false, 'The transaction upgrades implementation is reverted');
        }
    });

    it('Burning GM should be exchanged for equivalent XCN', async () => {

        let amount = 10;
        await truffleAssert.reverts(exchangeGmForXcn(user, amount),
            'XCNTokenExchangeV2: GM cannot be used for exchanging anymore');
    });

    it('Depositing XCN to Exchange contract should mint equivalent amount of GM', async () => {
        let userBalancesBefore = await checkBalance(user);
        let contractBalancesBefore = await checkBalance(contractInstances.xcnExchangeContract.address);

        let amount = 5;
        await exchangeXcnForGm(user, amount);
        console.log(user, 'send', amount, 'XCN to', contractInstances.xcnExchangeContract.address, 'to exchange GM');
        let userBalancesAfter = await checkBalance(user);
        let contractBalancesAfter = await checkBalance(contractInstances.xcnExchangeContract.address);

        assert.equal(Number(userBalancesBefore.XCN) - Number(userBalancesAfter.XCN), Math.pow(10, 18) * amount, 'User should loss ' + amount + ' XCN');

        assert.equal(Number(userBalancesAfter.GM) - Number(userBalancesBefore.GM), Math.pow(10, 18) * amount * rate, 'User should earn ' + amount * rate + ' GM');

        assert.equal(Number(contractBalancesAfter.GM) - Number(contractBalancesBefore.GM), 0, 'Contract should not have any changes on GM balance');
    });

});