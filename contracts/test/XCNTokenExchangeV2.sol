// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "../exchange/xcn/XCNTokenExchange.sol";

contract XCNTokenExchangeV2 is XCNTokenExchange {

    using SafeERC20Upgradeable for IERC20Upgradeable;

    function rate() public pure returns (uint256) {
        return 2;
    }

    function onTransferReceived(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure override returns (bytes4) {
        revert("XCNTokenExchangeV2: GM cannot be used for exchanging anymore");
    }

    function exchangeForGM(uint256 amount) external override whenNotPaused nonReentrant {
        xcnToken.safeTransferFrom(msg.sender, address(this), amount);
        gmToken.mint(address(msg.sender), amount * rate());

        emit ExchangeForGM(msg.sender, amount * rate());
    }
}
