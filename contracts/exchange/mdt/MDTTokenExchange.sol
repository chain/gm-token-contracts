// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/interfaces/IERC1363.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "../../token/ERC677/IERC677Receiver.sol";
import "../../token/ERC677/IERC677.sol";

contract MDTTokenExchange is
    Initializable,
    IERC677Receiver,
    ReentrancyGuardUpgradeable,
    OwnableUpgradeable,
    PausableUpgradeable
{

    IERC1363 public gmToken;
    IERC677 public mdtToken;

    event MDTTokenReceived(
        address indexed from,
        uint256 value,
        bytes data
    );

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize (
        IERC1363 _gmToken,
        IERC677 _mdtToken
    ) initializer public {
        __Ownable_init();
        __ReentrancyGuard_init();
        __Pausable_init();

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

    function _mdtTokenReceived(address from, uint256 amount, bytes memory data) internal whenNotPaused nonReentrant {
        gmToken.transfer(from, amount);

        emit MDTTokenReceived(from, amount, data);
    }

    /**
     * @notice It allows the owner to recover tokens sent to the contract by mistake
     * @param _token: token address
     * @param _amount: token amount
     * @dev Callable by owner
     */
    function recoverToken(IERC20 _token, uint256 _amount) external onlyOwner {
        require(_token.transfer(owner(), _amount), "MDTTokenExchange: The transfer transaction is reverted");
    }

    /**
     * @notice called by the admin to pause, triggers stopped state
     * @dev Callable by admin or operator
     */
    function pause() external whenNotPaused onlyOwner {
        _pause();

        emit Paused(msg.sender);
    }

    /**
     * @notice called by the admin to unpause, returns to normal state
     * Reset genesis state. Once paused, the rounds would need to be kickstarted by genesis
     */
    function unpause() external whenPaused onlyOwner {
        _unpause();

        emit Unpaused(msg.sender);
    }
}
