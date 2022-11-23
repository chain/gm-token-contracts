const truffleAssert = require('truffle-assertions');
const { setup } = require('./contract-interaction');

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

});