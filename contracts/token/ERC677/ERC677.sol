// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IERC677 is IERC20 {
    function transferAndCall(
        address _to,
        uint256 _value,
        bytes memory _data
    ) external returns (bool success);

    event ERC677Transfer(
        address indexed _from,
        address indexed _to,
        uint256 _value,
        bytes _data
    );
}
