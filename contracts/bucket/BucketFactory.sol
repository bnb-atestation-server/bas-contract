// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {BucketManager} from "./BucketManager.sol";
import { Strings } from "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/access/Ownable.sol";


interface IBucketRegistry {
   function addBucketManager(address bucketManager) external;
}
contract BucketFactory is Initializable{
    event CreateBucketManager(address indexed creator, address bucketManger);

    modifier onlyOwner() {
        require(msg.sender == admin,  "Only Owner can call this function");
        _;
    }

    address public  bucketRegistry;
    address public  schemaRegistry;
    address public  tokenHub;
    address public  cross_chain;
    address public  bucket_hub;
    address public  permission_hub;
    address public  sp_address_testnet;
    address public  greenfield_executor;

    string public version;
    address public admin;
    
    // constructor () Ownable(){
    //     _disableInitializers();
    // }


    function initialize(
        address _bucketRegistry,
        address _schemaRegistry,
        address _tokenHub,
        address _cross_chain,
        address _bucket_hub,
        address _permission_hub,
        address _sp_address_testnet,
        address _greenfield_executor
    ) public initializer{
        bucketRegistry = _bucketRegistry;
        schemaRegistry = _schemaRegistry;
        tokenHub = _tokenHub;
        cross_chain = _cross_chain;
        bucket_hub = _bucket_hub;
        permission_hub = _permission_hub;
        sp_address_testnet = _sp_address_testnet;
        greenfield_executor = _greenfield_executor;

        admin = msg.sender;
    }

    function deploy(
        uint256 transferOutAmount,
        bytes32 _salt
    ) public payable
      returns(address)
    {   
        address managerAddr = getManagerAddress(_salt);
        IBucketRegistry(bucketRegistry).addBucketManager(managerAddr);
        
        BucketManager bucketManager =  new BucketManager{salt:_salt}
        (
            msg.sender,
            bucketRegistry,
            schemaRegistry,
            tokenHub,
            cross_chain,
            bucket_hub,
            permission_hub,
            sp_address_testnet,
            greenfield_executor,
            version
        );
        emit CreateBucketManager(msg.sender, address(bucketManager));
        bucketManager.topUpBNB{value:msg.value}(transferOutAmount);
        return address(bucketManager);
    }

    function _getBytecodeHash() internal view returns (bytes32) {
        bytes memory bytecode = type(BucketManager).creationCode;
        return keccak256(abi.encodePacked(bytecode, abi.encode(
            msg.sender,
            bucketRegistry,
            schemaRegistry,
            tokenHub,
            cross_chain,
            bucket_hub,
            permission_hub,
            sp_address_testnet,
            greenfield_executor,
            version)));
    }

    function getManagerAddress(bytes32 _salt) public view returns (address) {
    bytes32 addrHash = keccak256(abi.encodePacked(
        bytes1(0xff), // 这里可以写 hex'ff'  不能写 "0xff"
        address(this), // 这里是调用create2的合约，在本文中就是当前的Factory合约
        _salt, // 盐值
        _getBytecodeHash() // 这里可以提前进行 keccak256 后写到这里，写法是 bytes32(0xABC...) 或 hex'ABC...'，不能写 "0xABC..."
    ));
    // 将最后 20 个字节的哈希值转换为地址
    return address(uint160(uint(addrHash)));    
    }

    function setCallbackGasLimit(uint256 _callbackGasLimit) external onlyOwner() {
        callbackGasLimit = _callbackGasLimit;
    }

    function setFailureHandleStrategy(uint8 _failureHandleStrategy) external onlyOwner() {
        failureHandlerStrategy = _failureHandleStrategy;
    }
}