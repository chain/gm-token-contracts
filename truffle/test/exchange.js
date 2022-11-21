const truffleAssert = require("truffle-assertions");
const dotenv = require('dotenv');
const MDT = artifacts.require('MDTToken');
const GMUpgradeable = artifacts.require('GMTokenUpgradeable');
const GM = artifacts.require('GMToken');
const XCN = artifacts.require('XCNToken');
const MDTExchange = artifacts.require('MDTTokenExchange');
const XCNExchange = artifacts.require('XCNTokenExchange');

contract('Exchange', (accounts) => {
    const eth = web3.eth;

    dotenv.config('.env');
    const deployGMWithProxy = process.env.DEPLOY_GM_WITH_PROXY ? process.env.DEPLOY_GM_WITH_PROXY : false;

    let mdtAdmin = accounts[1];
    let gmAdmin = deployGMWithProxy ? accounts[0] : accounts[2];
    let xcnAdmin = accounts[3];

    let user = accounts[6];

    let mdtToken;
    let gmToken;
    let xcnToken;
    let mdtExchangeContract;
    let xcnExchangeContract;

    const tokenTransfer = async (token, from, to, amount) => {
        let senderBalanceBefore = await token.balanceOf(from);
        let recipientBalanceBefore = await token.balanceOf(to);
        let exchangeTx = await token.transfer(to, (Math.pow(10, 18) * amount).toString(), {from: from});
        // console.log(exchangeTx);
        let senderBalanceAfter = await token.balanceOf(from);
        let recipientBalanceAfter = await token.balanceOf(to);
        // console.log(Number(senderBalanceBefore) - Number(senderBalanceAfter), amount, Number(recipientBalanceAfter) - Number(recipientBalanceBefore));
        // assert.equal(Number(senderBalanceBefore) - Number(senderBalanceAfter), Math.pow(10, 18) * amount, 'Sender should loss ' + amount); // gas fee consumed
        assert.equal(Number(recipientBalanceAfter) - Number(recipientBalanceBefore), Math.pow(10, 18) * amount, 'Recipient should gain ' + amount);
        return exchangeTx;
    }

    const gmTransfer = async (from, to, amount) => {
        return tokenTransfer(gmToken, from, to, amount);
    }

    const mdtTransfer = async (from, to, amount) => {
        return tokenTransfer(mdtToken, from, to, amount);
    }

    const xcnTransfer = async (from, to, amount) => {
        return tokenTransfer(xcnToken, from, to, amount);
    }

    const exchangeMdtForGm = async (sender, amount) => {
        let exchangeTx = await mdtToken.transferAndCall(mdtExchangeContract.address, (Math.pow(10, 18) * amount).toString(), 0x0, {from: sender});
        // console.log(exchangeTx);
        return exchangeTx;
    }

    const exchangeGmForXcn = async (sender, amount) => {
        let exchangeTx = await gmToken.transferAndCall(xcnExchangeContract.address, (Math.pow(10, 18) * amount).toString(), {from: sender});
        // console.log(exchangeTx);
        return exchangeTx;
    }

    const exchangeXcnForGm = async (sender, amount) => {
        let approveTx = await xcnToken.approve(xcnExchangeContract.address, (Math.pow(10, 18) * amount).toString(), {from: sender});
        // console.log(approveTx);
        let exchangeTx = await xcnExchangeContract.exchangeForGM((Math.pow(10, 18) * amount).toString(), {from: sender});
        // console.log(exchangeTx);

        return exchangeTx;
    }

    const checkBalance = async (address) => {
        let ethBalance = await eth.getBalance(address);
        let gmBalance = await gmToken.balanceOf(address);
        let mdtBalance = await mdtToken.balanceOf(address);
        let xcnBalance = await xcnToken.balanceOf(address);
        console.log(address, 'has',
            ethBalance.toString() != '0' ? ethBalance.toString().slice(0, -18) : '0', 'ETH',
            gmBalance.toString() != '0' ? gmBalance.toString().slice(0, -18) : '0', 'GM',
            mdtBalance.toString() != '0' ? mdtBalance.toString().slice(0, -18) : '0', 'MDT',
            xcnBalance.toString() != '0' ? xcnBalance.toString().slice(0, -18) : '0', 'XCN'
        );
        return {
            ETH: ethBalance,
            GM: gmBalance,
            MDT: mdtBalance,
            XCN: xcnBalance
        };
    }

    beforeEach('Basic setup', async () => {
        mdtToken = await MDT.deployed();
        gmToken = deployGMWithProxy ? await GMUpgradeable.deployed() : await GM.deployed();
        xcnToken = await XCN.deployed();
        mdtExchangeContract = await MDTExchange.deployed();
        xcnExchangeContract = await XCNExchange.deployed();
    });

    it('GM should be able to transfer like other tokens', async () => {
        try {
            await gmTransfer(gmAdmin, user, 100);
            await gmTransfer(gmAdmin, mdtExchangeContract.address, 100);
            // await eth.sendTransaction({ from: exchangeAdmin, to: exchangeContract.address, value: toWei('1', 'ether')});
            await mdtTransfer(mdtAdmin, user, 100);
            await xcnTransfer(xcnAdmin, xcnExchangeContract.address, 100);
        } catch (ex) {
            assert.ok(false, "Token transfer transaction is reverted");
        }
    });

    it('Burning GM should be rewarded with equivalent XCN', async () => {
        let userBalancesBefore = await checkBalance(user);
        let contractBalancesBefore = await checkBalance(xcnExchangeContract.address);

        let amount = 10;
        let exchangeTx = await exchangeGmForXcn(user, amount);
        // console.log(exchangeTx);
        console.log(user, 'send', amount, 'GM to', xcnExchangeContract.address, 'to exchange XCN');
        let userBalancesAfter = await checkBalance(user);
        let contractBalancesAfter = await checkBalance(xcnExchangeContract.address);

        assert.equal(Number(userBalancesBefore.GM) - Number(userBalancesAfter.GM), Math.pow(10, 18) * amount, 'User should loss ' + amount + 'GM');

        assert.equal(Number(userBalancesAfter.XCN) - Number(userBalancesBefore.XCN), Math.pow(10, 18) * amount, 'User should earn ' + amount + 'XCN');

        assert.equal(Number(contractBalancesAfter.GM) - Number(contractBalancesBefore.GM), 0, 'Contract should not have any changes on GM balance');

        assert.equal(Number(contractBalancesBefore.XCN) - Number(contractBalancesAfter.XCN), Math.pow(10, 18) * amount, 'Contract should decrease ' + amount + 'XCN');
    });

    it('Sending GM to Exchange contract should be rewarded with equivalent newly-minted GM', async () => {
        let userBalancesBefore = await checkBalance(user);
        let contractBalancesBefore = await checkBalance(xcnExchangeContract.address);

        let amount = 5;
        let exchangeTx = await exchangeXcnForGm(user, amount);
        console.log(user, 'send', amount, 'XCN to', xcnExchangeContract.address, 'to exchange GM');
        let userBalancesAfter = await checkBalance(user);
        let contractBalancesAfter = await checkBalance(xcnExchangeContract.address);

        assert.equal(Number(userBalancesBefore.XCN) - Number(userBalancesAfter.XCN), Math.pow(10, 18) * amount, 'User should loss ' + amount + 'XCN');

        assert.equal(Number(userBalancesAfter.GM) - Number(userBalancesBefore.GM), Math.pow(10, 18) * amount, 'User should earn ' + amount + 'GM');

        assert.equal(Number(contractBalancesAfter.GM) - Number(contractBalancesBefore.GM), 0, 'Contract should not have any changes on GM balance');

        assert.equal(Number(contractBalancesAfter.XCN) - Number(contractBalancesBefore.XCN), Math.pow(10, 18) * amount, 'Contract should increase ' + amount + 'XCN');
    });

    it('Should not be able to burn GM if pre-deposited XCN is out of balance', async () => {
        let contractBalancesBefore = await checkBalance(xcnExchangeContract.address);

        let amount = 100;
        await truffleAssert.reverts(exchangeGmForXcn(user, amount),
            'ERC20: transfer amount exceeds balance'); // sometimes it reverts from ERC777
    });

    it('Should not be able to mint GM if user doesn\'t have sufficient XCN', async () => {
        let userBalancesBefore = await checkBalance(user);

        let amount = 10;
        await truffleAssert.reverts(exchangeXcnForGm(user, amount),
            'ERC20: transfer amount exceeds balance');
    });

    it('Should be able to subscribe event emission when exchanging XCN for GM', async () => {
        let userBalancesBefore = await checkBalance(user);
        let contractBalancesBefore = await checkBalance(xcnExchangeContract.address);

        let amount = 5;
        let exchangeTx = await exchangeXcnForGm(user, amount);
        truffleAssert.eventEmitted(exchangeTx, 'ExchangeForGM');

        let nestedTx = await truffleAssert.createTransactionResult(gmToken, exchangeTx.tx); //.logs[0].returnValues;
        truffleAssert.eventEmitted(nestedTx, 'TokenMinted');
        console.log(user, 'send', amount, 'XCN to', xcnExchangeContract.address, 'to exchange GM');

        let userBalancesAfter = await checkBalance(user);
        let contractBalancesAfter = await checkBalance(xcnExchangeContract.address);
    });

    it('Should be able to subscribe nested event emission when exchanging GM for XCN', async () => {
        let userBalancesBefore = await checkBalance(user);
        let contractBalancesBefore = await checkBalance(xcnExchangeContract.address);

        let amount = 10;
        let exchangeTx = await exchangeGmForXcn(user, amount);
        // console.log(exchangeTx);
        let nestedTx = await truffleAssert.createTransactionResult(gmToken, exchangeTx.tx);
        truffleAssert.eventEmitted(nestedTx, 'TokenBurnt', ev => {
            // console.log(ev);
            return ev.from === user;
        });
        console.log(user, 'send', amount, 'GM to', xcnExchangeContract.address, 'to exchange XCN');

        let userBalancesAfter = await checkBalance(user);
        let contractBalancesAfter = await checkBalance(xcnExchangeContract.address);
    });

    it('Should be able to swapping MDT for equivalent pre-deposited GM', async () => {
        let userBalancesBefore = await checkBalance(user);
        let contractBalancesBefore = await checkBalance(mdtExchangeContract.address);

        let amount = 10;
        let exchangeTx = await exchangeMdtForGm(user, amount);
        console.log(user, 'send', amount, 'MDT to', mdtExchangeContract.address, 'to exchange GM');
        let userBalancesAfter = await checkBalance(user);
        let contractBalancesAfter = await checkBalance(mdtExchangeContract.address);

        assert.equal(Number(userBalancesBefore.MDT) - Number(userBalancesAfter.MDT), Math.pow(10, 18) * amount, 'User should loss ' + amount + 'XCN');

        assert.equal(Number(userBalancesAfter.GM) - Number(userBalancesBefore.GM), Math.pow(10, 18) * amount, 'User should earn ' + amount + 'GM');

        assert.equal(Number(contractBalancesBefore.GM) - Number(contractBalancesAfter.GM), Math.pow(10, 18) * amount, 'Contract should not have any changes on GM balance');

        assert.equal(Number(contractBalancesAfter.MDT) - Number(contractBalancesBefore.MDT), Math.pow(10, 18) * amount, 'Contract should increase ' + amount + 'XCN');
    });

});