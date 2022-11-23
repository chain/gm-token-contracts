const truffleAssert = require('truffle-assertions');
const dotenv = require('dotenv');
const { setup } = require('./contract-interaction');

contract('Test cases for token & token exchange contract interactions', (accounts) => {
    dotenv.config('.env');
    const environment = setup(process.env, accounts);

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

    let contractInstances;

    beforeEach('Basic setup', async () => {
        contractInstances = await environment.contractInstances.loadAll();
    });

    it('GM should be able to transfer like other tokens', async () => {
        try {
            await gmTransfer(gmAdmin, user, 100);
            await gmTransfer(gmAdmin, contractInstances.mdtExchangeContract.address, 100);
            // await eth.sendTransaction({ from: exchangeAdmin, to: exchangeContract.address, value: toWei('1', 'ether')});
            await mdtTransfer(mdtAdmin, user, 200);
            await xcnTransfer(xcnAdmin, contractInstances.xcnExchangeContract.address, 100);
        } catch (ex) {
            console.error(ex);
            assert.ok(false, "Token transfer transaction is reverted");
        }
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

        assert.equal(Number(contractBalancesBefore.XCN) - Number(contractBalancesAfter.XCN), Math.pow(10, 18) * amount, 'Contract should decrease ' + amount + ' XCN');
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

        assert.equal(Number(contractBalancesAfter.XCN) - Number(contractBalancesBefore.XCN), Math.pow(10, 18) * amount, 'Contract should increase ' + amount + ' XCN');
    });

    it('Should not be able to burn GM if pre-deposited XCN is out of balance', async () => {
        await checkBalance(contractInstances.xcnExchangeContract.address);

        let amount = 100;
        await truffleAssert.reverts(exchangeGmForXcn(user, amount),
            'ERC20: transfer amount exceeds balance'); // sometimes it reverts from ERC777
    });

    it('Should not be able to mint GM if user doesn\'t have sufficient XCN', async () => {
        await checkBalance(user);

        let amount = 10;
        await truffleAssert.reverts(exchangeXcnForGm(user, amount),
            'ERC20: transfer amount exceeds balance');
    });

    it('Should be able to subscribe event emission when exchanging XCN for GM', async () => {
        await checkBalance(user);
        await checkBalance(contractInstances.xcnExchangeContract.address);

        let amount = 5;
        let exchangeTx = await exchangeXcnForGm(user, amount);
        truffleAssert.eventEmitted(exchangeTx, 'ExchangeForGM');

        let nestedTx = await truffleAssert.createTransactionResult(contractInstances.gmToken, exchangeTx.tx); //.logs[0].returnValues;
        truffleAssert.eventEmitted(nestedTx, 'TokenMinted');
        console.log(user, 'send', amount, 'XCN to', contractInstances.xcnExchangeContract.address, 'to exchange GM');

        await checkBalance(user);
        await checkBalance(contractInstances.xcnExchangeContract.address);
    });

    it('Should be able to subscribe nested event emission when exchanging GM for XCN', async () => {
        await checkBalance(user);
        await checkBalance(contractInstances.xcnExchangeContract.address);

        let amount = 10;
        let exchangeTx = await exchangeGmForXcn(user, amount);
        // console.log(exchangeTx);
        let nestedTokenTx = await truffleAssert.createTransactionResult(contractInstances.gmToken, exchangeTx.tx);
        truffleAssert.eventEmitted(nestedTokenTx, 'TokenBurnt', ev => {
            // console.log(ev);
            return ev.from === user;
        });
        let nestedExchangeTx = await truffleAssert.createTransactionResult(contractInstances.xcnExchangeContract, exchangeTx.tx);
        truffleAssert.eventEmitted(nestedExchangeTx, 'GMTokenReceived', ev => {
            // console.log(ev);
            return ev.from === user;
        });
        console.log(user, 'send', amount, 'GM to', contractInstances.xcnExchangeContract.address, 'to exchange XCN');

        await checkBalance(user);
        await checkBalance(contractInstances.xcnExchangeContract.address);
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

        assert.equal(Number(contractBalancesBefore.GM) - Number(contractBalancesAfter.GM), Math.pow(10, 18) * amount, 'Contract should not have any changes on GM balance');

        assert.equal(Number(contractBalancesAfter.MDT) - Number(contractBalancesBefore.MDT), Math.pow(10, 18) * amount, 'Contract should increase ' + amount + ' XCN');
    });

    it('Should not be able to exchange for GM if the contract is out of balance', async () => {
        await checkBalance(contractInstances.mdtExchangeContract.address);

        let amount = 100;
        await truffleAssert.reverts(exchangeMdtForGm(user, amount),
            'ERC20: transfer amount exceeds balance');
    });

    it('Should be able to subscribe nested event emission when exchanging MDT for GM', async () => {
        await checkBalance(user);
        await checkBalance(contractInstances.mdtExchangeContract.address);

        let amount = 10;
        let exchangeTx = await exchangeMdtForGm(user, amount);
        // console.log(exchangeTx);
        let nestedTx = await truffleAssert.createTransactionResult(contractInstances.mdtExchangeContract, exchangeTx.tx);
        // console.log(nestedTx);
        truffleAssert.eventEmitted(nestedTx, 'MDTTokenReceived', ev => {
            // console.log(ev);
            return ev.from === user;
        });
        console.log(user, 'send', amount, 'MDT to', contractInstances.mdtExchangeContract.address, 'to exchange GM');

        await checkBalance(user);
        await checkBalance(contractInstances.mdtExchangeContract.address);
    });

});