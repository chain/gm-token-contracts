// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-upgradeable/interfaces/IERC1363Upgradeable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "erc-payable-token/contracts/token/ERC1363/IERC1363Receiver.sol";
import "./token/ERC677/IERC677Receiver.sol";
import "./token/ERC677/ERC677.sol";

contract GMTokenExchange is
IERC1363Receiver,
IERC677Receiver,
ERC165,
ReentrancyGuard,
Ownable
{
    using ERC165Checker for address;

    IERC1363Upgradeable public gmToken;
    IERC677 public mdtToken;
    IERC20 public xcnToken;

    constructor(
        IERC1363Upgradeable _gmToken,
        IERC677 _mdtToken,
        IERC20 _xcnToken
    ) {
        require(
            address(_gmToken) != address(0),
            "GMTokenExchange: gmToken is zero address"
        );
        require(
            address(_mdtToken) != address(0),
            "GMTokenExchange: mdtToken is zero address"
        );
        require(
            address(_xcnToken) != address(0),
            "GMTokenExchange: xcnToken is zero address"
        );
        require(
            _gmToken.supportsInterface(type(IERC1363Upgradeable).interfaceId)
        );
        gmToken = _gmToken;
        mdtToken = _mdtToken;
        xcnToken = _xcnToken;
    }

    function onTransferReceived(
        address,
        address,
        uint256,
        bytes calldata
    ) external view override returns (bytes4) {
        require(
            msg.sender == address(gmToken),
            "ERC1363Payable: gmToken is not message sender"
        );

        return IERC1363Receiver.onTransferReceived.selector;
    }

    function onTokenTransfer(
        address,
        uint,
        bytes calldata
    ) external pure override returns (bool success) {
        return true;
    }

    /**
     * @notice It allows the owner to recover tokens sent to the contract by mistake
     * @param _token: token address
     * @param _amount: token amount
     * @dev Callable by owner
     */
    function recoverToken(IERC20 _token, uint256 _amount) external onlyOwner {
        require(_token.transfer(owner(), _amount) == true);
    }

    /**
     * @dev See {IERC165-supportsInterface}.
     */
    function supportsInterface(bytes4 interfaceId)
    public
    view
    virtual
    override(ERC165)
    returns (bool)
    {
        return
        interfaceId == type(IERC1363Receiver).interfaceId ||
        super.supportsInterface(interfaceId);
    }
}
