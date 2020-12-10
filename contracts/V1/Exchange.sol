// SPDX-License-Identifier: MIT
pragma solidity 0.7.5;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Exchange is Ownable {
    using SafeMath for uint;
    address payable public feeAccount; // account that receives the exchange fees
    uint public feePercent; // percent fee per successful trade
    address private ETHER; // store Ether in a blank address
    uint public orderCount; // store ordder counts

    mapping(address => mapping(address => uint)) public tokens;
    mapping(uint => _Order) public orders;

    // Events
    event Deposit(address indexed token, address indexed user, uint indexed balance, uint amount);
    event Withdrawal(address indexed token, address indexed user, uint indexed balance, uint amount);
    event Order(uint id, uint timestamp, address tokenGet, uint amountGet, address tokenGive, uint amountGive);


    // Struct
    struct _Order {
        uint id;
        uint timstamp;
        address tokenGet;
        uint amountGet;
        address tokenGive;
        uint amountGive;
    }

    constructor(address payable _feeAccount) {
        feeAccount = _feeAccount;
        feePercent = 10;
        ETHER = address(0);
        orderCount = 0;
    }

    function changeFeeAccount(address payable _newOwner) public {
        require(_msgSender() == feeAccount, "Ownable: caller is not the owner");
        feeAccount = _newOwner;
    }

    function changeFeePercent(uint _feePercent) public {
        require(_msgSender() == feeAccount, "Ownable: caller is not the owner");
        feePercent = _feePercent;
    }

    fallback() payable external {
        require(msg.value == 0, "failed");
    }

    function makeOrder(address _tokenGet, uint _amountGet, address _tokenGive, uint _amountGive) public {
        orderCount = orderCount.add(1);
        orders[orderCount] = _Order(
            orderCount,
            block.timestamp,
            _tokenGet,
            _amountGet,
            _tokenGive,
            _amountGive
        );
        emit Order(orderCount, block.timestamp, _tokenGet, _amountGet, _tokenGive, _amountGive);
    }

    function depositToken(address _token, uint _amount) public {
        require(_amount > 0, "deposit must be greater than zero");
        require(_token != address(0), "ether deposit are not allowed on this method");
        IERC20(_token).transferFrom(_msgSender(), address(this), _amount);
        tokens[_token][_msgSender()] = tokens[_token][_msgSender()].add(_amount);
        emit Deposit(_token, _msgSender(), tokens[_token][_msgSender()], _amount);
    }

    function withdrawToken(address _token, uint _amount) public {
        require(tokens[_token][_msgSender()] >= _amount, "amount exceeds balance");
        uint _taxAmount = _amount.mul(feePercent).div(100);
        tokens[_token][_msgSender()] = tokens[_token][_msgSender()].sub(_amount);

        tokens[_token][feeAccount] = tokens[_token][feeAccount].add(_taxAmount);

        IERC20(_token).transfer(_msgSender(), _amount.sub(_taxAmount));

        emit Withdrawal(_token, _msgSender(), tokens[_token][_msgSender()], _amount);
    }

    function depositEther() public payable {
        require(msg.value > 0, "deposit must be greater than zero");
        uint _amount = msg.value;
        tokens[ETHER][_msgSender()] = tokens[ETHER][_msgSender()].add(_amount);
        emit Deposit(ETHER, _msgSender(), tokens[ETHER][_msgSender()], _amount);
    }

    function withdrawEther(uint _amount) public {
        require(tokens[ETHER][_msgSender()] >= _amount, "amount exceeds balance");
        uint _taxAmount = _amount.mul(feePercent).div(100);
        tokens[ETHER][_msgSender()] = tokens[ETHER][_msgSender()].sub(_amount);

        tokens[ETHER][feeAccount] = tokens[ETHER][feeAccount].add(_taxAmount);
        payable(_msgSender()).transfer(_amount.sub(_taxAmount));
        
        emit Withdrawal(ETHER, _msgSender(), tokens[ETHER][_msgSender()], _amount);
    }
}