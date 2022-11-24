// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/interfaces/IERC1363Receiver.sol";
import "../../interfaces/Mintable.sol";

contract XCNTokenExchange is Initializable, IERC1363Receiver, ERC165Upgradeable, OwnableUpgradeable, ReentrancyGuardUpgradeable, PausableUpgradeable {
    using SafeERC20Upgradeable for IERC20Upgradeable;

    Mintable public gmToken;
    IERC20Upgradeable public xcnToken;

    bool private _xcnOutflowEnabled;

    event GMTokenReceived(
        address indexed operator,
        address indexed from,
        uint256 value,
        bytes data
    );
    event ExchangeForGM(address sender, uint256 amount);
    event XCNOutflowToggled(bool enabled);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(Mintable _gmToken, IERC20Upgradeable _xcnToken, bool xcnOutflowEnabled_) initializer public {
        __ERC165_init();
        __Ownable_init();
        __ReentrancyGuard_init();
        __Pausable_init();

        require(
            address(_gmToken) != address(0),
            "XCNTokenExchange: gmToken is zero address"
        );
        require(
            address(_xcnToken) != address(0),
            "XCNTokenExchange: xcnToken is zero address"
        );

        gmToken = _gmToken;
        xcnToken = _xcnToken;
        _xcnOutflowEnabled = xcnOutflowEnabled_;
    }

    function toggleXcnOutflow(bool enabled) public onlyOwner {
        _xcnOutflowEnabled = enabled;

        emit XCNOutflowToggled(enabled);
    }

    /**
     * @dev Returns whether it is enabled to exchange GM for XCN
     */
    function xcnOutflowEnabled() public view returns (bool) {
        return _xcnOutflowEnabled;
    }

    function onTransferReceived(
        address operator,
        address from,
        uint256 value,
        bytes calldata data
    ) external override returns (bytes4) {
        require(_xcnOutflowEnabled, "XCNTokenExchange: It's disabled to exchange GM for XCN");
        require(msg.sender == address(gmToken), "XCNTokenExchange: Only accept GM token");
        _gmTokenReceived(operator, from, value, data);
        return IERC1363Receiver.onTransferReceived.selector;
    }

    function _gmTokenReceived(address operator, address from, uint256 value, bytes memory data) internal whenNotPaused nonReentrant {
        gmToken.burn(value);
        xcnToken.safeTransfer(from, value);

        emit GMTokenReceived(operator, from, value, data);
    }

    function exchangeForGM(uint256 amount) external whenNotPaused nonReentrant {
        xcnToken.safeTransferFrom(msg.sender, address(this), amount);
        gmToken.mint(address(msg.sender), amount);

        emit ExchangeForGM(msg.sender, amount);
    }

    /**
     * @notice It allows the owner to recover tokens sent to the contract by mistake, and withdraw XCN if outflow is disabled
     * @param _token: token address
     * @param _amount: token amount
     * @dev Callable by owner
     */
    function recoverToken(IERC20Upgradeable _token, uint256 _amount) external onlyOwner {
        _token.safeTransfer(owner(), _amount);
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

    /**
     * @dev See {IERC165-supportsInterface}.
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC165Upgradeable)
        returns (bool)
    {
        return
            interfaceId == type(IERC1363Receiver).interfaceId ||
            super.supportsInterface(interfaceId);
    }
}
