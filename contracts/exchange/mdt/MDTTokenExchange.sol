// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/interfaces/IERC1363.sol";
import "@openzeppelin/contracts/interfaces/IERC1363Receiver.sol";
import "../../token/ERC677/IERC677Receiver.sol";
import "../../token/ERC677/ERC677.sol";

contract MDTTokenExchange is
    IERC1363Receiver,
    IERC677Receiver,
    ERC165,
    ReentrancyGuard,
    Ownable
{
    using ERC165Checker for address;

    IERC1363 public gmToken;
    IERC677 public mdtToken;

    bool private _mdtOutflowEnabled;

    event GMTokensReceived(
        address indexed operator,
        address indexed from,
        uint256 value,
        bytes data
    );
    event MDTTokenReceived(
        address from,
        uint256 value,
        bytes data
    );
    event MDTOutflowToggled(bool enabled);

    constructor(
        IERC1363 _gmToken,
        IERC677 _mdtToken
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
            _gmToken.supportsInterface(type(IERC1363).interfaceId)
        );
        gmToken = _gmToken;
        mdtToken = _mdtToken;
        _mdtOutflowEnabled = false;
    }

    function toggleMdtOutflow(bool enabled) public onlyOwner {
        _mdtOutflowEnabled = enabled;

        emit MDTOutflowToggled(enabled);
    }

    /**
     * @dev Returns whether it is enabled to exchange GM for MDT
     */
    function mdtOutflowEnabled() public view returns (bool) {
        return _mdtOutflowEnabled;
    }

    function onTransferReceived(
        address spender,
        address sender,
        uint256 amount,
        bytes calldata data
    ) external override returns (bytes4) {
        require(
            msg.sender == address(gmToken),
            "ERC1363Payable: gmToken is not message sender"
        );

        _gmTokenReceived(spender, sender, amount, data);

        return IERC1363Receiver.onTransferReceived.selector;
    }

    function _gmTokenReceived(address spender, address sender, uint256 amount, bytes memory data) internal {
        require(_mdtOutflowEnabled, "MDTTokenExchange: It's disabled to exchange GM for MDT");

        emit GMTokensReceived(spender, sender, amount, data);
    }

    function onTokenTransfer(
        address sender,
        uint amount,
        bytes calldata data
    ) external override returns (bool success) {
        require(msg.sender == address(mdtToken), "MDTTokenExchange: Only accept MDT token");

        _mdtTokenReceived(sender, amount, data);

        return true;
    }

    function _mdtTokenReceived(address from, uint256 amount, bytes memory data) internal {
        gmToken.transfer(address(from), amount);

        emit MDTTokenReceived(from, amount, data);
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
