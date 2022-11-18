// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract XCNToken is ERC20 {
    constructor() ERC20("Chain", "XCN") {
        _mint(msg.sender, 10 ** 18 * 10 ** 9);
    }
}