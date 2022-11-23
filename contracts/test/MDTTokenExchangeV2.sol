// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "../exchange/mdt/MDTTokenExchange.sol";

contract MDTTokenExchangeV2 is MDTTokenExchange {

    uint256 rate;

    function initialize (
        IERC20Upgradeable _gmToken,
        IERC677 _mdtToken
    ) override initializer public {
        rate = 2;
    }

    function _mdtTokenReceived(address from, uint256 amount, bytes memory data) internal whenNotPaused nonReentrant {
        gmToken.safeTransfer(from, amount * rate);

        emit MDTTokenReceived(from, amount, data);
    }
}
