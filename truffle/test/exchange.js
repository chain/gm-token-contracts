const truffleAssert = require("truffle-assertions");
const MDT = artifacts.require('MDTToken');
const GMUpgradeable = artifacts.require('GMTokenUpgradeable');
const GM = artifacts.require('GMToken');
const XCN = artifacts.require('XCNToken');
const Exchange = artifacts.require('XCNTokenExchange');

contract('Exchange', (accounts) => {
    const eth = web3.eth;

    let gmAdmin = accounts[2];
    let xcnAdmin = accounts[3];

    let user = accounts[6];

    let mdtToken;
    let gmToken;
    let xcnToken;
    let exchangeContract;

    const xcnTransfer = async (from, to, amount) => {
        let exchangeTx = await xcnToken.transfer(to, (Math.pow(10, 18) * amount).toString(), {from: from});
        // console.log(exchangeTx);
        return exchangeTx;
    }

    const gmTransfer = async (from, to, amount) => {
        let exchangeTx = await gmToken.transfer(to, (Math.pow(10, 18) * amount).toString(), {from: from});
        // console.log(exchangeTx);
        return exchangeTx;
    }

    const exchangeGmForXcn = async (sender, amount) => {
        let exchangeTx = await gmToken.transferAndCall(exchangeContract.address, (Math.pow(10, 18) * amount).toString(), {from: sender});
        // console.log(exchangeTx);
        return exchangeTx;
    }

    const exchangeXcnForGm = async (sender, amount) => {
        let approveTx = await xcnToken.approve(exchangeContract.address, (Math.pow(10, 18) * amount).toString(), {from: sender});
        // console.log(approveTx);
        let exchangeTx = await exchangeContract.exchangeForGM((Math.pow(10, 18) * amount).toString(), {from: sender});
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
        gmToken = await GM.deployed();
        xcnToken = await XCN.deployed();
        exchangeContract = await Exchange.deployed();
    });

    it('GM should be able to transfer like other tokens', async () => {
        try {
            await gmTransfer(gmAdmin, user, 100);
            // await eth.sendTransaction({ from: exchangeAdmin, to: exchangeContract.address, value: toWei('1', 'ether')});
            await xcnTransfer(xcnAdmin, exchangeContract.address, 100);
        } catch (ex) {
            assert.ok(false, "Token transfer transaction is reverted");
        }

        let gmBalance = await gmToken.balanceOf(user);
        assert.ok(gmBalance.toString() === (Math.pow(10, 18) * 100).toString(), 'Balance is exactly the same as what user is transfered');
    });

    it('Burning GM should be rewarded with equivalent XCN', async () => {
        let userBalancesBefore = await checkBalance(user);
        let contractBalancesBefore = await checkBalance(exchangeContract.address);

        let amount = 10;
        let exchangeTx = await exchangeGmForXcn(user, amount);
        // console.log(exchangeTx);
        console.log(user, 'send', amount, 'GM to', exchangeContract.address, 'to exchange XCN');
        let userBalancesAfter = await checkBalance(user);
        let contractBalancesAfter = await checkBalance(exchangeContract.address);

        assert.equal(Number(userBalancesBefore.GM) - Number(userBalancesAfter.GM), Math.pow(10, 18) * amount, 'User should loss ' + amount + 'GM');

        assert.equal(Number(userBalancesAfter.XCN) - Number(userBalancesBefore.XCN), Math.pow(10, 18) * amount, 'User should earn ' + amount + 'XCN');

        assert.equal(Number(contractBalancesAfter.GM) - Number(contractBalancesBefore.GM), 0, 'Contract should not have any changes on GM balance');

        assert.equal(Number(contractBalancesBefore.XCN) - Number(contractBalancesAfter.XCN), Math.pow(10, 18) * amount, 'Contract should decrease ' + amount + 'XCN');
    });

    it('Sending GM to Exchange contract should be rewarded with equivalent newly-minted GM', async () => {
        let userBalancesBefore = await checkBalance(user);
        let contractBalancesBefore = await checkBalance(exchangeContract.address);

        let amount = 5;
        let exchangeTx = await exchangeXcnForGm(user, amount);
        console.log(user, 'send', amount, 'XCN to', exchangeContract.address, 'to exchange GM');
        let userBalancesAfter = await checkBalance(user);
        let contractBalancesAfter = await checkBalance(exchangeContract.address);

        assert.equal(Number(userBalancesBefore.XCN) - Number(userBalancesAfter.XCN), Math.pow(10, 18) * amount, 'User should loss ' + amount + 'XCN');

        assert.equal(Number(userBalancesAfter.GM) - Number(userBalancesBefore.GM), Math.pow(10, 18) * amount, 'User should earn ' + amount + 'GM');

        assert.equal(Number(contractBalancesAfter.GM) - Number(contractBalancesBefore.GM), 0, 'Contract should not have any changes on GM balance');

        assert.equal(Number(contractBalancesAfter.XCN) - Number(contractBalancesBefore.XCN), Math.pow(10, 18) * amount, 'Contract should increase ' + amount + 'XCN');
    });

    it('Should not be able to burn GM if pre-deposited XCN is out of balance', async () => {
        let contractBalancesBefore = await checkBalance(exchangeContract.address);

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
        let contractBalancesBefore = await checkBalance(exchangeContract.address);

        let amount = 5;
        let exchangeTx = await exchangeXcnForGm(user, amount);
        truffleAssert.eventEmitted(exchangeTx, 'ExchangeForGM');

        let nestedTx = await truffleAssert.createTransactionResult(gmToken, exchangeTx.tx); //.logs[0].returnValues;
        truffleAssert.eventEmitted(nestedTx, 'TokenMinted');
        console.log(user, 'send', amount, 'XCN to', exchangeContract.address, 'to exchange GM');

        let userBalancesAfter = await checkBalance(user);
        let contractBalancesAfter = await checkBalance(exchangeContract.address);
    });

    it('Should be able to subscribe nested event emission when exchanging GM for XCN', async () => {
        let userBalancesBefore = await checkBalance(user);
        let contractBalancesBefore = await checkBalance(exchangeContract.address);

        let amount = 10;
        let exchangeTx = await exchangeGmForXcn(user, amount);
        // console.log(exchangeTx);
        let nestedTx = await truffleAssert.createTransactionResult(gmToken, exchangeTx.tx);
        truffleAssert.eventEmitted(nestedTx, 'TokenBurnt', ev => {
            // console.log(ev);
            return ev.from === user;
        });
        console.log(user, 'send', amount, 'GM to', exchangeContract.address, 'to exchange XCN');

        let userBalancesAfter = await checkBalance(user);
        let contractBalancesAfter = await checkBalance(exchangeContract.address);
    });

});