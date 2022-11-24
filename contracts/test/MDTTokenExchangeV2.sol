// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "../exchange/mdt/MDTTokenExchange.sol";

contract MDTTokenExchangeV2 is MDTTokenExchange {

    using SafeERC20Upgradeable for IERC20Upgradeable;

    function rate() public pure returns (uint256) {
        return 2;
    }

    function onTokenTransfer(
        address sender,
        uint amount,
        bytes calldata data
    ) external override returns (bool success) {
        require(msg.sender == address(mdtToken), "MDTTokenExchangeV2: Only accept MDT token");

        _mdtTokenReceivedV2(sender, amount, data);

        return true;
    }

    function _mdtTokenReceivedV2(address from, uint256 amount, bytes memory data) internal whenNotPaused nonReentrant {
        gmToken.safeTransfer(from, amount * rate());

        emit MDTTokenReceived(from, amount, data);
    }
}
