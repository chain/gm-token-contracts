// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./IERC677.sol";
import "./IERC677Receiver.sol";

abstract contract ERC677 is ERC20, IERC677 {

    /**
    * @dev Transfer token to a contract address with additional data if the recipient is a contact.
    * @param _to address The address to transfer to.
    * @param _value uint256 The amount to be transferred.
    * @param _data bytes The extra data to be passed to the receiving contract.
    */
    function transferAndCall(address _to, uint256 _value, bytes calldata _data) public returns (bool success) {
        require(super.transfer(_to, _value));
        emit ERC677Transfer(msg.sender, _to, _value, _data);
        if (isContract(_to)) {
            contractFallback(_to, _value, _data);
        }
        return true;
    }

    // PRIVATE

    function contractFallback(address _to, uint256 _value, bytes calldata _data) private {
        IERC677Receiver receiver = IERC677Receiver(_to);
        require(receiver.onTokenTransfer(msg.sender, _value, _data));
    }

    // assemble the given address bytecode. If bytecode exists then the _addr is a contract.
    function isContract(address _addr) private view returns (bool hasCode) {
        uint length;
        assembly { length := extcodesize(_addr) }
        return length > 0;
    }
}