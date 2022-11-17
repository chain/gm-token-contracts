const truffleAssert = require("truffle-assertions");
// const MDT = artifacts.require('MDT');
const GM = artifacts.require('GMToken');
const XCN = artifacts.require('XCNToken');
const Swap = artifacts.require('XCNTokenExchange');

contract('Swap', (accounts) => {
    const eth = web3.eth;
    const {toWei} = web3.utils;

    let gmAdmin; // = accounts[2];
    let xcnAdmin = accounts[3];
    let swapAdmin = accounts[4];

    let user = accounts[5];

    let mdtToken;
    let gmToken;
    let xcnToken;
    let swapContract;

    const xcnTransfer = async (from, to, amount) => {
        let swapTx = await xcnToken.transfer(to, (Math.pow(10, 18) * amount).toString(), {from: from});
        // console.log(swapTx);
        return swapTx;
    }

    const gmTransfer = async (from, to, amount) => {
        let swapTx = await gmToken.transfer(to, (Math.pow(10, 18) * amount).toString(), {from: from});
        // console.log(swapTx);
        return swapTx;
    }

    const swapGmForXcn = async (sender, amount) => {
        let swapTx = await gmToken.transferAndCall(swapContract.address, (Math.pow(10, 18) * amount).toString(), {from: sender});
        // console.log(swapTx);
        return swapTx;
    }

    const swapXcnForGm = async (sender, amount) => {
        let approveTx = await xcnToken.approve(swapContract.address, (Math.pow(10, 18) * amount).toString(), {from: sender});
        // console.log(approveTx);
        let swapTx = await swapContract.swapForGm((Math.pow(10, 18) * amount).toString(), {from: sender});
        // console.log(swapTx);

        return swapTx;
    }

    const checkBalance = async (address) => {
        let ethBalance = await eth.getBalance(address);
        let gmBalance = await gmToken.balanceOf(address);
        let xcnBalance = await xcnToken.balanceOf(address);
        console.log(address, 'has',
            ethBalance.toString() != '0' ? ethBalance.toString().slice(0, -18) : '0', 'ETH',
            gmBalance.toString() != '0' ? gmBalance.toString().slice(0, -18) : '0', 'GM',
            xcnBalance.toString() != '0' ? xcnBalance.toString().slice(0, -18) : '0', 'XCN'
        );
        return [ethBalance, gmBalance, xcnBalance];
    }

    beforeEach('Basic setup', async () => {
        // mdtToken = await MDT.deployed();
        gmToken = await GM.deployed();
        gmAdmin = await gmToken.owner();
        xcnToken = await XCN.deployed();
        swapContract = await Swap.deployed();
    });

    it('GM should be able to transfer like other tokens', async () => {
        try {
            await gmTransfer(gmAdmin, user, 100);
            // await eth.sendTransaction({ from: swapAdmin, to: swapContract.address, value: toWei('1', 'ether')});
            await xcnTransfer(xcnAdmin, swapContract.address, 100);
        } catch (ex) {
            assert.ok(false, "Token transfer transaction is reverted");
        }

        let gmBalance = await gmToken.balanceOf(user);
        assert.ok(gmBalance.toString() === (Math.pow(10, 18) * 100).toString(), 'Balance is exactly the same as what user is transfered');
    });

    it('Burning GM should be rewarded with equivalent XCN', async () => {
        let userBalancesBefore = await checkBalance(user);
        let contractBalancesBefore = await checkBalance(swapContract.address);

        let amount = 10;
        let swapTx = await swapGmForXcn(user, amount);
        // console.log(swapTx);
        console.log(user, 'send', amount, 'GM to', swapContract.address, 'to swap XCN');
        let userBalancesAfter = await checkBalance(user);
        let contractBalancesAfter = await checkBalance(swapContract.address);

        assert.equal(Number(userBalancesBefore[1]) - Number(userBalancesAfter[1]), Math.pow(10, 18) * amount, 'User should loss ' + amount + 'GM');

        assert.equal(Number(userBalancesAfter[2]) - Number(userBalancesBefore[2]), Math.pow(10, 18) * amount, 'User should earn ' + amount + 'XCN');

        assert.equal(Number(contractBalancesAfter[1]) - Number(contractBalancesBefore[1]), 0, 'Contract should not have any changes on GM balance');

        assert.equal(Number(contractBalancesBefore[2]) - Number(contractBalancesAfter[2]), Math.pow(10, 18) * amount, 'Contract should decrease ' + amount + 'XCN');
    });

    it('Sending GM to Swap contract should be rewarded with equivalent newly-minted GM', async () => {
        let userBalancesBefore = await checkBalance(user);
        let contractBalancesBefore = await checkBalance(swapContract.address);

        let amount = 5;
        let swapTx = await swapXcnForGm(user, amount);
        console.log(user, 'send', amount, 'XCN to', swapContract.address, 'to swap GM');
        let userBalancesAfter = await checkBalance(user);
        let contractBalancesAfter = await checkBalance(swapContract.address);

        assert.equal(Number(userBalancesBefore[2]) - Number(userBalancesAfter[2]), Math.pow(10, 18) * amount, 'User should loss ' + amount + 'XCN');

        assert.equal(Number(userBalancesAfter[1]) - Number(userBalancesBefore[1]), Math.pow(10, 18) * amount, 'User should earn ' + amount + 'GM');

        assert.equal(Number(contractBalancesAfter[1]) - Number(contractBalancesBefore[1]), 0, 'Contract should not have any changes on GM balance');

        assert.equal(Number(contractBalancesAfter[2]) - Number(contractBalancesBefore[2]), Math.pow(10, 18) * amount, 'Contract should increase ' + amount + 'XCN');
    });

    it('Should not be able to burn GM if pre-deposited XCN is out of balance', async () => {
        let contractBalancesBefore = await checkBalance(swapContract.address);

        let amount = 100;
        await truffleAssert.reverts(swapGmForXcn(user, amount),
            'ERC20: transfer amount exceeds balance'); // sometimes it reverts from ERC777
    });

    it('Should not be able to mint GM if user doesn\'t have sufficient XCN', async () => {
        let userBalancesBefore = await checkBalance(user);

        let amount = 10;
        await truffleAssert.reverts(swapXcnForGm(user, amount),
            'ERC20: transfer amount exceeds balance');
    });

    it('Should be able to subscribe event emission when swapping XCN for GM', async () => {
        let userBalancesBefore = await checkBalance(user);
        let contractBalancesBefore = await checkBalance(swapContract.address);

        let amount = 5;
        let swapTx = await swapXcnForGm(user, amount);
        truffleAssert.eventEmitted(swapTx, 'SwapForGm');
        console.log(user, 'send', amount, 'XCN to', swapContract.address, 'to swap GM');

        let userBalancesAfter = await checkBalance(user);
        let contractBalancesAfter = await checkBalance(swapContract.address);
    });

});