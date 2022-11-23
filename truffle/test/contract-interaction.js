const MDT = artifacts.require('MDTToken');
const GMUpgradeable = artifacts.require('GMTokenUpgradeable');
const GM = artifacts.require('GMToken');
const XCN = artifacts.require('XCNToken');
const MDTExchange = artifacts.require('MDTTokenExchange');
const XCNExchange = artifacts.require('XCNTokenExchange');

const eth = web3.eth;
let env;

const setup = (_env, accounts) => {
    env = _env;

    return {
        roles: getRolesFromAccounts(env, accounts),
        contracts: {
            token: {
                GM: GM,
                GMUpgradeable: GMUpgradeable,
                MDT: MDT,
                XCN: XCN,
            },
            exchange: {
                MDTExchange: MDTExchange,
                XCNExchange: XCNExchange,
            }
        },
        contractInstances: {
            loadAll: loadAllContractInstances
        },
        transactions: transactions
    }
};

const getRolesFromAccounts = (env, accounts) => {
    const deployGMWithProxy = env.DEPLOY_GM_WITH_PROXY ? env.DEPLOY_GM_WITH_PROXY : false;
    return {
        mdtAdmin: accounts[1],
        gmAdmin: deployGMWithProxy ? accounts[0] : accounts[2],
        xcnAdmin: accounts[3],
        mdtExchangeAdmin: accounts[0],
        xcnExchangeAdmin: accounts[0],
        user: accounts[6],
        attacker: accounts[7]
    }
};

const loadAllContractInstances = async () => {
    const deployGMWithProxy = env.DEPLOY_GM_WITH_PROXY ? env.DEPLOY_GM_WITH_PROXY : false;

    mdtToken = await MDT.deployed();
    gmToken = deployGMWithProxy ? await GMUpgradeable.deployed() : await GM.deployed();
    xcnToken = await XCN.deployed();
    mdtExchangeContract = await MDTExchange.deployed();
    xcnExchangeContract = await XCNExchange.deployed();

    return {
        gmToken: gmToken,
        mdtToken: mdtToken,
        xcnToken: xcnToken,
        mdtExchangeContract: mdtExchangeContract,
        xcnExchangeContract: xcnExchangeContract
    }
};

const tokenTransfer = async (token, from, to, amount) => {
    await token.balanceOf(from);
    let recipientBalanceBefore = await token.balanceOf(to);
    let exchangeTx = await token.transfer(to, (Math.pow(10, 18) * amount).toString(), {from: from});
    // console.log(exchangeTx);
    await token.balanceOf(from);
    let recipientBalanceAfter = await token.balanceOf(to);
    // console.log(Number(senderBalanceBefore) - Number(senderBalanceAfter), amount, Number(recipientBalanceAfter) - Number(recipientBalanceBefore));
    // assert.equal(Number(senderBalanceBefore) - Number(senderBalanceAfter), Math.pow(10, 18) * amount, 'Sender should loss ' + amount); // gas fee consumed
    assert.equal(Number(recipientBalanceAfter) - Number(recipientBalanceBefore), Math.pow(10, 18) * amount, 'Recipient should gain ' + amount);
    return exchangeTx;
};

const gmTransfer = async (from, to, amount) => {
    return tokenTransfer(gmToken, from, to, amount);
};

const mdtTransfer = async (from, to, amount) => {
    return tokenTransfer(mdtToken, from, to, amount);
};

const xcnTransfer = async (from, to, amount) => {
    return tokenTransfer(xcnToken, from, to, amount);
};

const exchangeMdtForGm = async (sender, amount) => {
    let exchangeTx = await mdtToken.transferAndCall(mdtExchangeContract.address, (Math.pow(10, 18) * amount).toString(), 0x0, {from: sender});
    // console.log(exchangeTx);
    return exchangeTx;
};

const exchangeGmForXcn = async (sender, amount) => {
    let exchangeTx = await gmToken.transferAndCall(xcnExchangeContract.address, (Math.pow(10, 18) * amount).toString(), {from: sender});
    // console.log(exchangeTx);
    return exchangeTx;
};

const exchangeXcnForGm = async (sender, amount) => {
    let approveTx = await xcnToken.approve(xcnExchangeContract.address, (Math.pow(10, 18) * amount).toString(), {from: sender});
    // console.log(approveTx);
    let exchangeTx = await xcnExchangeContract.exchangeForGM((Math.pow(10, 18) * amount).toString(), {from: sender});
    // console.log(exchangeTx);

    return exchangeTx;
};

const checkBalance = async (address) => {
    let ethBalance = await eth.getBalance(address);
    let gmBalance = await gmToken.balanceOf(address);
    let mdtBalance = await mdtToken.balanceOf(address);
    let xcnBalance = await xcnToken.balanceOf(address);
    console.log(address, 'has',
        ethBalance.toString() !== '0' ? ethBalance.toString().slice(0, -18) : '0', 'ETH',
        gmBalance.toString() !== '0' ? gmBalance.toString().slice(0, -18) : '0', 'GM',
        mdtBalance.toString() !== '0' ? mdtBalance.toString().slice(0, -18) : '0', 'MDT',
        xcnBalance.toString() !== '0' ? xcnBalance.toString().slice(0, -18) : '0', 'XCN'
    );
    return {
        ETH: ethBalance,
        GM: gmBalance,
        MDT: mdtBalance,
        XCN: xcnBalance
    };
};

const tokenRecover = async (exchangeContract, token, amount, operator) => {
    let tx = await exchangeContract.recoverToken(token, (Math.pow(10, 18) * amount).toString(), { from: operator });
    return tx;
};

const transactions = {
    gmTransfer: gmTransfer,
    mdtTransfer: mdtTransfer,
    xcnTransfer: xcnTransfer,
    exchangeMdtForGm: exchangeMdtForGm,
    exchangeXcnForGm: exchangeXcnForGm,
    exchangeGmForXcn: exchangeGmForXcn,
    tokenRecover: tokenRecover,
    checkBalance: checkBalance
}

module.exports = {
    setup: setup
}