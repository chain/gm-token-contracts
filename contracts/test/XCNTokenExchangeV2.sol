// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "../exchange/xcn/XCNTokenExchange.sol";

contract XCNTokenExchangeV2 is XCNTokenExchange {

    uint256 rate;

    function initialize(
        Mintable _gmToken,
        IERC20Upgradeable _xcnToken,
        bool xcnOutflowEnabled_
    ) override initializer public {
        rate = 2;
    }

    function _gmTokenReceived(address operator, address from, uint256 value, bytes memory data) internal override whenNotPaused nonReentrant {
        gmToken.burn(value);
        xcnToken.safeTransfer(from, value / rate);

        emit GMTokenReceived(operator, from, value, data);
    }

    function exchangeForGM(uint256 amount) external override whenNotPaused nonReentrant {
        xcnToken.safeTransferFrom(msg.sender, address(this), amount);
        gmToken.mint(address(msg.sender), amount * rate);

        emit ExchangeForGM(msg.sender, amount * rate);
    }
}
