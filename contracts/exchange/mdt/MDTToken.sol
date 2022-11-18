// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "../../token/ERC677/ERC677.sol";

contract MDTToken is ERC677 {
    constructor() ERC20("Measurable Data Token", "MDT") {
        _mint(msg.sender, 10 ** 18 * 10 ** 9);
    }
}
