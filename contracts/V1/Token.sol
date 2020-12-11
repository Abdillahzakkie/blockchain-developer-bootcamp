// SPDX-License-Identifier: MIT
pragma solidity 0.7.5;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

contract RAIDTOKEN is ERC20, Ownable {
    using SafeMath for uint;
    uint public totalMinted;

    constructor() ERC20("RAIDTOKEN", "RAID") {
        uint _amount = 10000 ether;
        totalMinted = _amount;
        super._mint(_msgSender(), _amount);
    }

    function mint(address _account, uint _amount) public onlyOwner {
        totalMinted = totalMinted.add(_amount);
        super._mint(_account, _amount);
    }
}