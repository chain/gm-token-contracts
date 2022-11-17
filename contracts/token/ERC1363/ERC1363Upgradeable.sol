// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/interfaces/IERC1363Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol";
import "erc-payable-token/contracts/token/ERC1363/IERC1363Receiver.sol";
import "erc-payable-token/contracts/token/ERC1363/IERC1363Spender.sol";

/**
 * @title ERC1363Upgradeable
 * @author Vittorio Minacori (https://github.com/vittominacori)
 * @dev Implementation of an ERC1363Upgradeable interface
 */
abstract contract ERC1363Upgradeable is
    ERC20Upgradeable,
    IERC1363Upgradeable,
    ERC165Upgradeable
{
    using AddressUpgradeable for address;

    /// @dev Reverts if address is 0x0 or this token address
    modifier validRecipient(address _recipient) {
        require(_recipient != address(0) && _recipient != address(this));
        _;
    }

    /**
     * @dev See {IERC165-supportsInterface}.
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC165Upgradeable, IERC165Upgradeable)
        returns (bool)
    {
        return
            interfaceId == type(IERC1363Upgradeable).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    /**
     * @dev Transfer token for a specified address.
     * @param to address The address to transfer to.
     * @param amount uint256 The amount to be transferred.
     */
    function transfer(address to, uint256 amount)
        public
        virtual
        override(ERC20Upgradeable, IERC20Upgradeable)
        validRecipient(to)
        returns (bool)
    {
        return super.transfer(to, amount);
    }

    /**
     * @dev Aprove the passed address to spend the specified amount of tokens on behalf of msg.sender.
     * @param spender address The address which will spend the funds.
     * @param amount uint256 The amount of tokens to be spent.
     */
    function approve(address spender, uint256 amount)
        public
        virtual
        override(ERC20Upgradeable, IERC20Upgradeable)
        validRecipient(spender)
        returns (bool)
    {
        return super.approve(spender, amount);
    }

    /**
     * @dev Transfer tokens from one address to another.
     * @param from address The address which you want to send tokens from.
     * @param to address The address which you want to transfer to.
     * @param amount uint256 the amout of tokens to be transfered.
     */
    function transferFrom(
        address from,
        address to,
        uint256 amount
    )
        public
        virtual
        override(ERC20Upgradeable, IERC20Upgradeable)
        validRecipient(to)
        returns (bool)
    {
        return super.transferFrom(from, to, amount);
    }

    /**
     * @dev Transfer tokens to a specified address and then execute a callback on `to`.
     * @param to The address to transfer to.
     * @param amount The amount to be transferred.
     * @return A boolean that indicates if the operation was successful.
     */
    function transferAndCall(address to, uint256 amount)
        public
        virtual
        override
        returns (bool)
    {
        return transferAndCall(to, amount, "");
    }

    /**
     * @dev Transfer tokens to a specified address and then execute a callback on `to`.
     * @param to The address to transfer to
     * @param amount The amount to be transferred
     * @param data Additional data with no specified format
     * @return A boolean that indicates if the operation was successful.
     */
    function transferAndCall(
        address to,
        uint256 amount,
        bytes memory data
    ) public virtual override returns (bool) {
        transfer(to, amount);
        require(
            _checkOnTransferReceived(_msgSender(), to, amount, data),
            "ERC1363Upgradeable: receiver returned wrong data"
        );
        return true;
    }

    /**
     * @dev Transfer tokens from one address to another and then execute a callback on `to`.
     * @param from The address which you want to send tokens from
     * @param to The address which you want to transfer to
     * @param amount The amount of tokens to be transferred
     * @return A boolean that indicates if the operation was successful.
     */
    function transferFromAndCall(
        address from,
        address to,
        uint256 amount
    ) public virtual override returns (bool) {
        return transferFromAndCall(from, to, amount, "");
    }

    /**
     * @dev Transfer tokens from one address to another and then execute a callback on `to`.
     * @param from The address which you want to send tokens from
     * @param to The address which you want to transfer to
     * @param amount The amount of tokens to be transferred
     * @param data Additional data with no specified format
     * @return A boolean that indicates if the operation was successful.
     */
    function transferFromAndCall(
        address from,
        address to,
        uint256 amount,
        bytes memory data
    ) public virtual override returns (bool) {
        transferFrom(from, to, amount);
        require(
            _checkOnTransferReceived(from, to, amount, data),
            "ERC1363Upgradeable: receiver returned wrong data"
        );
        return true;
    }

    /**
     * @dev Approve spender to transfer tokens and then execute a callback on `spender`.
     * @param spender The address allowed to transfer to
     * @param amount The amount allowed to be transferred
     * @return A boolean that indicates if the operation was successful.
     */
    function approveAndCall(address spender, uint256 amount)
        public
        virtual
        override
        returns (bool)
    {
        return approveAndCall(spender, amount, "");
    }

    /**
     * @dev Approve spender to transfer tokens and then execute a callback on `spender`.
     * @param spender The address allowed to transfer to.
     * @param amount The amount allowed to be transferred.
     * @param data Additional data with no specified format.
     * @return A boolean that indicates if the operation was successful.
     */
    function approveAndCall(
        address spender,
        uint256 amount,
        bytes memory data
    ) public virtual override returns (bool) {
        approve(spender, amount);
        require(
            _checkOnApprovalReceived(spender, amount, data),
            "ERC1363Upgradeable: spender returned wrong data"
        );
        return true;
    }

    /**
     * @dev Internal function to invoke {IERC1363Receiver-onTransferReceived} on a target address
     *  The call is not executed if the target address is not a contract
     * @param sender address Representing the previous owner of the given token amount
     * @param recipient address Target address that will receive the tokens
     * @param amount uint256 The amount mount of tokens to be transferred
     * @param data bytes Optional data to send along with the call
     * @return whether the call correctly returned the expected magic value
     */
    function _checkOnTransferReceived(
        address sender,
        address recipient,
        uint256 amount,
        bytes memory data
    ) internal virtual returns (bool) {
        if (!recipient.isContract()) {
            revert("ERC1363Upgradeable: transfer to non contract address");
        }

        try
            IERC1363Receiver(recipient).onTransferReceived(
                _msgSender(),
                sender,
                amount,
                data
            )
        returns (bytes4 retval) {
            return retval == IERC1363Receiver.onTransferReceived.selector;
        } catch (bytes memory reason) {
            if (reason.length == 0) {
                revert(
                    "ERC1363Upgradeable: transfer to non ERC1363Receiver implementer"
                );
            } else {
                /// @solidity memory-safe-assembly
                assembly {
                    revert(add(32, reason), mload(reason))
                }
            }
        }
    }

    /**
     * @dev Internal function to invoke {IERC1363Receiver-onApprovalReceived} on a target address
     *  The call is not executed if the target address is not a contract
     * @param spender address The address which will spend the funds
     * @param amount uint256 The amount of tokens to be spent
     * @param data bytes Optional data to send along with the call
     * @return whether the call correctly returned the expected magic value
     */
    function _checkOnApprovalReceived(
        address spender,
        uint256 amount,
        bytes memory data
    ) internal virtual returns (bool) {
        if (!spender.isContract()) {
            revert("ERC1363Upgradeable: approve a non contract address");
        }

        try
            IERC1363Spender(spender).onApprovalReceived(
                _msgSender(),
                amount,
                data
            )
        returns (bytes4 retval) {
            return retval == IERC1363Spender.onApprovalReceived.selector;
        } catch (bytes memory reason) {
            if (reason.length == 0) {
                revert(
                    "ERC1363Upgradeable: approve a non ERC1363Spender implementer"
                );
            } else {
                /// @solidity memory-safe-assembly
                assembly {
                    revert(add(32, reason), mload(reason))
                }
            }
        }
    }
}
