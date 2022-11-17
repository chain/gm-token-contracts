// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface Mintable {
    /**
     * @dev Emitted when `value` tokens are minted to an account (`to`).
     *
     * Note that `value` may be zero.
     */
    event TokenMinted(address indexed to, uint256 value);

    /**
     * @dev Emitted when `value` tokens are burnt from an account (`from`).
     *
     * Note that `value` may be zero.
     */
    event TokenBurnt(address indexed from, uint256 value);

    function burn(uint256 amount) external;
    function mint(address to, uint256 amount) external;
}
