// SPDX-License-Identifier: MIT
pragma solidity 0.7.5;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract RAIDTOKEN is ERC20 {
    constructor() ERC20("RAIDTOKEN", "RAID") {
        super._mint(_msgSender(), 10000 ether);
    }

}