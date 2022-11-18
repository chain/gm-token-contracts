// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/interfaces/IERC1363.sol";
import "./token/ERC1363/ERC1363.sol";
import "./interfaces/Mintable.sol";

contract GMToken is ERC1363, Mintable, Pausable, Ownable, AccessControl {
    uint256 public constant INITIAL_SUPPLY = 100000000 * 10**uint256(18);
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    string private _name = "Geometric Token";
    string private _symbol = "GM";

    /**
     * @dev Emitted when the token name is changed to (`newName`)
     * and the token symbol is changed to (`newSymbol`).
     *
     * Note that `value` may be zero.
     */
    event TokenInformationUpdated(string newName, string newSymbol);

    /**
     * @dev Sets INITIAL_SUPPLY initials tokens, grant the DEFAULT_ADMIN_ROLE,
     * PAUSER_ROLE and MINTER_ROLE to the caller.
     */
    constructor() ERC20("", "") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);

        _mint(msg.sender, INITIAL_SUPPLY);
    }

    /**
     * @dev grant the MINTER_ROLE after minter contract is deployed
     *
     * Requirements:
     *
     * - the caller must have the `DEFAULT_ADMIN_ROLE`.
     */
    function grantMinterRole(address minter) external override onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(MINTER_ROLE, minter);
    }

    /**
     * @dev Triggers stopped state.
     *
     * Requirements:
     *
     * - The contract must not be paused.
     * - The caller must have the `PAUSER_ROLE`.
     */
    function pause() public onlyRole(PAUSER_ROLE) {
        _pause();
    }

    /**
     * @dev Returns to normal state.
     *
     * Requirements:
     *
     * - The contract must be paused.
     * - The caller must have the `PAUSER_ROLE`.
     */
    function unpause() public onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    /**
     * @dev Destroys `amount` tokens from _msgSender(), reducing the
     * total supply.
     *
     * Emits a {Transfer} event with `to` set to the zero address.
     *
     * Requirements:
     *
     * - the caller must have the `MINTER_ROLE`.
     */
    function burn(uint256 amount) public override onlyRole(MINTER_ROLE) {
        _burn(_msgSender(), amount);
        emit TokenBurnt(tx.origin, amount);
    }

    /** @dev Creates `amount` tokens and assigns them to `account`, increasing
     * the total supply.
     *
     * Emits a {Transfer} event with `from` set to the zero address.
     *
     * Requirements:
     *
     * - `account` cannot be the zero address.
     * - the caller must have the `MINTER_ROLE`.
     */
    function mint(address to, uint256 amount)
        public
        override
        onlyRole(MINTER_ROLE)
        validRecipient(to)
    {
        // check if amount + totalSupply < MAX_SUPPLY
        _mint(to, amount);
        emit TokenMinted(to, amount);
    }

    /**
     * @dev Owner can update token information here.
     *
     * It is often useful to conceal the actual token association, until
     * the token operations, like central issuance or reissuance have been completed.
     *
     * This function allows the token owner to rename the token after the operations
     * have been completed and then point the audience to use the token contract.
     */
    function setTokenInformation(string calldata name_, string calldata symbol_)
        public
        onlyOwner
    {
        _name = name_;
        _symbol = symbol_;

        emit TokenInformationUpdated(_name, _symbol);
    }

    /**
     * @dev Returns the name of the token.
     */
    function name() public view override returns (string memory) {
        return _name;
    }

    /**
     * @dev Returns the symbol of the token, usually a shorter version of the name.
     */
    function symbol() public view override returns (string memory) {
        return _symbol;
    }

    /**
     * @notice It allows the owner to recover tokens sent to the contract by mistake
     * @param _token: token address
     * @param _amount: token amount
     * @dev Callable by owner
     */
    function recoverToken(address _token, uint256 _amount) external onlyOwner {
        require(IERC20(_token).transfer(owner(), _amount) == true);
    }

    /**
     * @dev See {IERC165-supportsInterface}.
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC1363, AccessControl)
        returns (bool)
    {
        return
            interfaceId == type(IERC1363).interfaceId ||
            super.supportsInterface(interfaceId);
    }
}
