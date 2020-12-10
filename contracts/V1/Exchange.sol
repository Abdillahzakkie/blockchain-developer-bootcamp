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

    mapping(address => mapping(address => uint)) private tokens;
    mapping(uint => _Order) public orders;
    mapping(uint => bool) public cancelledOrders;

    // Events
    event Deposit(address indexed token, address indexed user, uint indexed balance, uint amount);
    event Withdrawal(address indexed token, address indexed user, uint indexed balance, uint amount);
    event Order(uint id, uint timestamp, address user, address tokenGet, uint amountGet, address tokenGive, uint amountGive);
    event Cancel(uint id, uint timestamp, address user, address tokenGet, uint amountGet, address tokenGive, uint amountGive);
    event Trade(uint id, uint timestamp, address from, address tokenGet, uint amountGet, address to, address tokenGive, uint amountGive);


    // Struct
    struct _Order {
        uint id;
        uint timstamp;
        address user;
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

    function depositToken(address _token, uint _amount) public {
        require(_amount > 0, "deposit must be greater than zero");
        require(_token != address(0), "ether deposit are not allowed on this method");
        IERC20(_token).transferFrom(_msgSender(), address(this), _amount);
        tokens[_token][_msgSender()] = tokens[_token][_msgSender()].add(_amount);
        emit Deposit(_token, _msgSender(), tokens[_token][_msgSender()], _amount);
    }

    function withdrawToken(address _token, uint _amount) public {
        require(tokens[_token][_msgSender()] >= _amount, "amount exceeds balance");
        tokens[_token][_msgSender()] = tokens[_token][_msgSender()].sub(_amount);

        tokens[_token][feeAccount] = tokens[_token][feeAccount];
        IERC20(_token).transfer(_msgSender(), _amount);
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
        tokens[ETHER][_msgSender()] = tokens[ETHER][_msgSender()].sub(_amount);

        payable(_msgSender()).transfer(_amount);
        emit Withdrawal(ETHER, _msgSender(), tokens[ETHER][_msgSender()], _amount);
    }

    function balanceOf(address _token, address _account) external view returns(uint) {
        return tokens[_token][_account];
    }

    function makeOrder(address _tokenGet, uint _amountGet, address _tokenGive, uint _amountGive) public {
        orderCount = orderCount.add(1);
        orders[orderCount] = _Order(
            orderCount,
            block.timestamp,
            _msgSender(),
            _tokenGet,
            _amountGet,
            _tokenGive,
            _amountGive
        );
        emit Order(orderCount, block.timestamp, _msgSender(), _tokenGet, _amountGet, _tokenGive, _amountGive);
    }

    function cancelOrder(uint _id) public {
        require(_msgSender() == orders[_id].user, "Ownable: caller is not the owner");
        require(!cancelledOrders[_id], "order has already been cancelled");
        cancelledOrders[_id] = true;
        emit Cancel(
            _id, 
            block.timestamp, 
            _msgSender(), 
            orders[_id].tokenGet, 
            orders[_id].amountGet, 
            orders[_id].tokenGive, 
            orders[_id].amountGive
        );
    }

    function fillOrder(uint _id) public payable {
        _Order memory _order = orders[_id];
        _trade(
            _order.user,
            _order.tokenGet,
            _order.amountGet,
            _order.tokenGive,
            _order.amountGive
        );
        emit Trade(
            _id, 
            block.timestamp, 
            _order.user, 
            _order.tokenGet, 
            _order.amountGet, 
            _msgSender(), 
            _order.tokenGive, 
            _order.amountGive
        );
    }

    function _trade( 
        address _user, 
        address _tokenGet, 
        uint _amountGet, 
        address _tokenGive, 
        uint _amountGive
    ) private {
        uint _feeAmount = _amountGive.mul(feePercent).div(100);
        // Execute trade 
        tokens[_tokenGet][_msgSender()] = tokens[_tokenGet][_msgSender()].sub(_amountGet);
        tokens[_tokenGet][_user] = tokens[_tokenGet][_user].add(_amountGet);

        tokens[_tokenGive][_user] = tokens[_tokenGet][_user].sub(_amountGive);
        tokens[_tokenGive][_msgSender()] = tokens[_tokenGive][_msgSender()].add(_amountGive.sub(_feeAmount));

        tokens[_tokenGive][feeAccount] = tokens[_tokenGive][feeAccount].add(_feeAmount);
    }
}