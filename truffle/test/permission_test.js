const truffleAssert = require('truffle-assertions');
const dotenv = require('dotenv');
const { setup } = require('./contract-interaction');

contract('Test cases to see whether permission checking works during token exchange', (accounts) => {
    dotenv.config('.env');
    const environment = setup(process.env, accounts);

    const mdtAdmin = environment.roles.mdtAdmin;
    const gmAdmin = environment.roles.gmAdmin;
    const xcnAdmin = environment.roles.xcnAdmin;
    const user = environment.roles.user;
    const mdtExchangeAdmin = environment.roles.mdtExchangeAdmin;
    const xcnExchangeAdmin = environment.roles.xcnExchangeAdmin;

    const gmTransfer = environment.transactions.gmTransfer;
    const mdtTransfer = environment.transactions.mdtTransfer;
    const xcnTransfer = environment.transactions.xcnTransfer;
    const exchangeMdtForGm = environment.transactions.exchangeMdtForGm;
    const exchangeGmForXcn = environment.transactions.exchangeGmForXcn;
    const exchangeXcnForGm = environment.transactions.exchangeXcnForGm;
    const pause = environment.transactions.pause;
    const unpause = environment.transactions.unpause;
    const recoverToken = environment.transactions.tokenRecover;
    const checkBalance = environment.transactions.checkBalance;

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

    it('The unexpected token transferred to MDT exchange contract by accident cannot be withdrawn by the sender', async () => {
        await checkBalance(user);
        await checkBalance(contractInstances.mdtExchangeContract.address);

        let amount = 10;
        await xcnTransfer(user, contractInstances.mdtExchangeContract.address, amount);
        console.log(user, 'send', amount, 'XCN to', contractInstances.mdtExchangeContract.address);

        await checkBalance(user);
        await checkBalance(contractInstances.mdtExchangeContract.address);

        await truffleAssert.reverts(recoverToken(contractInstances.mdtExchangeContract, contractInstances.xcnToken.address, amount, user),
            'Ownable: caller is not the owner');
    });

    it('The unexpected token transferred to MDT exchange contract just now should be able to recover from owner', async () => {
        let ownerBalancesBefore = await checkBalance(mdtExchangeAdmin);

        let amount = 10;

        try {
            await recoverToken(contractInstances.mdtExchangeContract, contractInstances.xcnToken.address, amount, mdtExchangeAdmin);
        } catch (ex) {
            console.error(ex);
            assert.ok(false, 'Token recover transaction is reverted');
        }

        let ownerBalancesAfter = await checkBalance(mdtExchangeAdmin);

        assert.equal(Number(ownerBalancesAfter.XCN) - Number(ownerBalancesBefore.XCN), Math.pow(10, 18) * amount, 'Owner should recover ' + amount + ' XCN');
    });

    it('The unexpected token transferred to XCN exchange contract by accident cannot be withdrawn by the sender', async () => {
        await checkBalance(user);
        await checkBalance(contractInstances.xcnExchangeContract.address);

        let amount = 10;
        await mdtTransfer(user, contractInstances.xcnExchangeContract.address, amount);
        console.log(user, 'send', amount, 'MDT to', contractInstances.xcnExchangeContract.address);

        await checkBalance(user);
        await checkBalance(contractInstances.xcnExchangeContract.address);

        await truffleAssert.reverts(recoverToken(contractInstances.xcnExchangeContract, contractInstances.mdtToken.address, amount, user),
            'Ownable: caller is not the owner');
    });

    it('The unexpected token transferred to XCN exchange contract just now should be able to recover from owner', async () => {
        let ownerBalancesBefore = await checkBalance(xcnExchangeAdmin);

        let amount = 10;

        try {
            await recoverToken(contractInstances.xcnExchangeContract, contractInstances.mdtToken.address, amount, xcnExchangeAdmin);
        } catch (ex) {
            console.error(ex);
            assert.ok(false, 'Token recover transaction is reverted');
        }

        let ownerBalancesAfter = await checkBalance(xcnExchangeAdmin);

        assert.equal(Number(ownerBalancesAfter.MDT) - Number(ownerBalancesBefore.MDT), Math.pow(10, 18) * amount, 'Owner should recover ' + amount + ' MDT');
    });

    it('Other account cannot pause the MDT exchange contract', async () => {
        await truffleAssert.reverts(pause(contractInstances.mdtExchangeContract, user),
            'Ownable: caller is not the owner');
    });

    it('The owner should be able to pause the MDT exchange contract', async () => {
        try {
            await pause(contractInstances.mdtExchangeContract, mdtExchangeAdmin);
        } catch (ex) {
            console.error(ex);
            assert.ok(false, 'Pause transaction is reverted');
        }
    });

    it('MDT exchange should not work any more during the paused state', async () => {
        let amount = 10;
        await truffleAssert.reverts(exchangeMdtForGm(user, amount),
            'Pausable: paused');
    });

    it('MDT exchange should work as usual after recover from paused state by unpause() called', async () => {
        await unpause(contractInstances.mdtExchangeContract, mdtExchangeAdmin);

        let userBalancesBefore = await checkBalance(user);

        let amount = 10;
        try {
            await exchangeMdtForGm(user, amount);
            console.log(user, 'send', amount, 'MDT to', contractInstances.mdtExchangeContract.address, 'to exchange GM');
        } catch (ex) {
            console.error(ex);
            assert.ok(false, 'Token recover transaction is reverted');
        }

        let userBalancesAfter = await checkBalance(user);
        assert.equal(Number(userBalancesAfter.GM) - Number(userBalancesBefore.GM), Math.pow(10, 18) * amount, 'User should earn ' + amount + ' GM');
    });

    it('Other account cannot pause the XCN exchange contract', async () => {
        await truffleAssert.reverts(pause(contractInstances.xcnExchangeContract, user),
            'Ownable: caller is not the owner');
    });

    it('The owner should be able to pause the XCN exchange contract', async () => {
        try {
            await pause(contractInstances.xcnExchangeContract, xcnExchangeAdmin);
        } catch (ex) {
            console.error(ex);
            assert.ok(false, 'Pause transaction is reverted');
        }
    });

    it('XCN exchange should not work any more during the paused state', async () => {
        let amount = 10;
        await truffleAssert.reverts(exchangeXcnForGm(user, amount),
            'Pausable: paused');

        await truffleAssert.reverts(exchangeGmForXcn(user, amount),
            'Pausable: paused');
    });

    it('XCN exchange should work as usual after recover from paused state by unpause() called', async () => {
        await unpause(contractInstances.xcnExchangeContract, xcnExchangeAdmin);

        // XCN exchange for GM
        let userBalancesBefore = await checkBalance(user);

        let amount = 10;
        try {
            await exchangeXcnForGm(user, amount);
            console.log(user, 'send', amount, 'XCN to', contractInstances.xcnExchangeContract.address, 'to exchange GM');
        } catch (ex) {
            console.error(ex);
            assert.ok(false, 'Token recover transaction is reverted');
        }

        let userBalancesAfter = await checkBalance(user);
        assert.equal(Number(userBalancesAfter.GM) - Number(userBalancesBefore.GM), Math.pow(10, 18) * amount, 'User should earn ' + amount + ' GM');

        // GM exchange for XCN
        userBalancesBefore = userBalancesAfter;
        try {
            await exchangeGmForXcn(user, amount);
            console.log(user, 'send', amount, 'GM to', contractInstances.xcnExchangeContract.address, 'to exchange XCN');
        } catch (ex) {
            console.error(ex);
            assert.ok(false, 'Token recover transaction is reverted');
        }

        userBalancesAfter = await checkBalance(user);
        assert.equal(Number(userBalancesAfter.XCN) - Number(userBalancesBefore.XCN), Math.pow(10, 18) * amount, 'User should earn ' + amount + ' XCN');
    });
});