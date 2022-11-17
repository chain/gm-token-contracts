// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface Mintable {
    function burn(uint256 amount) external;
    function mint(address to, uint256 amount) external;
}
