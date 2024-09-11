// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;
// import "@bnb-chain/greenfield-contracts/contracts/interface/IBucketHub.sol";
import "@bnb-chain/greenfield-contracts/contracts/interface/ITokenHub.sol";
// import "@bnb-chain/greenfield-contracts-sdk/BaseApp.sol";

import "@bnb-chain/greenfield-contracts/contracts/interface/ICrossChain.sol";

import "@bnb-chain/greenfield-contracts/contracts/interface/IGreenfieldExecutor.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

import "./Utils.sol";
// 引入 OpenZeppelin 的 Strings 库


import {SchemaRecord} from "../ISchemaRegistry.sol";

struct CreateBucketSynPackage {
    address creator;
    string name;
    BucketVisibilityType visibility;
    address paymentAddress;
    address primarySpAddress;
    uint64 primarySpApprovalExpiredHeight;
    uint32 globalVirtualGroupFamilyId;
    bytes primarySpSignature;
    uint64 chargedReadQuota;
    bytes extraData; // abi.encode of ExtraData
}

enum BucketVisibilityType {
    Unspecified,
    PublicRead,
    Private,
    Inherit // If the bucket Visibility is inherit, it's finally set to private.
}

struct ExtraData {
    address appAddress;
    address refundAddress;
    FailureHandleStrategy failureHandleStrategy;
    bytes callbackData;
}

enum FailureHandleStrategy {
    BlockOnFail, // If a package fails, the subsequent SYN packages will be blocked until the failed ACK packages are handled in the order they were received.
    CacheOnFail, // When a package fails, it is cached for later handling. New SYN packages will continue to be handled normally.
    SkipOnFail // Failed ACK packages are ignored and will not affect subsequent SYN packages.
}

interface IBucketHub {
    function createBucket(
        CreateBucketSynPackage memory createPackage,
        uint256 callbackGasLimit,
        ExtraData memory extraData
    ) external payable returns (bool);
}

interface IPermissionHub {
     function createPolicy(
        bytes calldata _data,
        ExtraData memory _extraData
    ) external payable returns (bool);
}
interface ISchemaRegistry {
    function getSchema(bytes32 uid) external view returns (SchemaRecord memory);
}

interface IBucketRegistry{
    function existBucketName(string memory bucketName) external view returns (bool);
    function setBucketName(string memory bucketName) external;
    function updateController(address preController, address newController) external;
}

contract BucketManager is Ownable {
    enum Status { NoStart, Success, Failed, Pending}

    address public  bucketRegistry;
    address public  schemaRegistry;
    address public  tokenHub;
    address public  cross_chain;
    address public  bucket_hub;
    address public  permission_hub;
    address public  sp_address_testnet;
    address public  greenfield_executor;
    string  public  version; 


    event CreateBucket(string bucketName ,uint32 status);
    event CreatePolicy(string bucketName, bytes _msgData, uint32 status);
    
	//schemaID => name
	mapping (bytes32 => mapping(string => Status)) public schemaBuckets;
    
    string[] public bucketNames;
    mapping (bytes32 => string[]) public nameOfSchemaId;
    Status public basBucket;
    mapping(bytes32 => Status) policies;


    function _getName(string memory name, bytes32 schemaId) public view returns (string memory){
        if (schemaId == bytes32(0)) {
            return string(abi.encodePacked("bas-", Strings.toHexString(address(this))));
        }
        require(bytes(name).length < 18, "length of name should < 18");
        return string(abi.encodePacked("bas-", name,"-",toHexString(bytes20(schemaId))));
    }

    constructor (
        address _controller,
        address _bucketRegistry,
        address _schemaRegistry,
        address _tokenHub,
        address _cross_chain,
        address _bucket_hub,
        address _permission_hub,
        address _sp_address_testnet,
        address _greenfield_executor,

        uint256 _callbackGasLimit,
        uint8 _failureHandlerStrategy,
        uint32[] memory actions,
        string memory _version
    ) {
        bucketRegistry = _bucketRegistry;
        schemaRegistry = _schemaRegistry;
        tokenHub = _tokenHub;
        cross_chain = _cross_chain;
        bucket_hub = _bucket_hub;
        permission_hub = _permission_hub;
        sp_address_testnet = _sp_address_testnet;
        greenfield_executor = _greenfield_executor;
        version = _version;

        IBucketRegistry(bucketRegistry).updateController(owner(),_controller);
        _transferOwnership(_controller);
    }
    


    function createSchemaBucket(
		string memory name,
		bytes32 schemaId, 
        uint256 _callbackGasLimit,
        FailureHandleStrategy _failureHandleStrategy
	) external payable onlyOwner returns (string memory) {
         // Verify if the schema exists
        require(bytes(name).length != 0, "Invalid Name: Name should not be empty");
		require(schemaBuckets[schemaId][name] != Status.Pending && schemaBuckets[schemaId][name] != Status.Success ,"The bucket of the given schema and name has exsited");

        (uint256 relayFee, uint256 ackRelayFee) = ICrossChain(cross_chain).getRelayFees();
        require(msg.value == relayFee + ackRelayFee, "msg.value not enough");
       
        string memory bucketName = _getName(name,schemaId);
        require(!IBucketRegistry(bucketRegistry).existBucketName(bucketName), "The name of bucket for schema has existed");
		SchemaRecord memory schema = ISchemaRegistry(schemaRegistry).getSchema(schemaId);
		require(schema.uid != bytes32(0),"Invalid schemaId");
        
        // Create the bucket
        bytes memory _callbackData = abi.encode(name, schemaId);
	    _createBucket(bucketName ,_callbackData,_callbackGasLimit,_failureHandleStrategy);
        schemaBuckets[schemaId][name] = Status.Pending;
        return bucketName;
	}


    function createUserBucket(
        uint256 _callbackGasLimit,
        FailureHandleStrategy _failureHandleStrategy
	) external payable onlyOwner returns (string memory){
	    require(basBucket != Status.Pending && basBucket != Status.Success, "The bas bucket for current contract has existed");
	    string memory bucketName = _getName("",bytes32(0));
        require(!IBucketRegistry(bucketRegistry).existBucketName(bucketName), "The name of bucket for schema has existed");
        bytes memory _callbackData = abi.encode("", bytes32(0));

	    _createBucket(bucketName,_callbackData,_callbackGasLimit,_failureHandleStrategy);
	    basBucket = Status.Pending;
        return bucketName;
    }
    
    function _createBucket(
        string memory bucketName,
        bytes memory _callbackData,
        uint256 _callbackGasLimit,
        FailureHandleStrategy _failureHandleStrategy
    ) internal {
       (uint256 totalFee,,)  = _getTotelFee(_callbackGasLimit);
       require(msg.value >= totalFee,"create bucket insufficent value" );

        CreateBucketSynPackage memory createPackage = CreateBucketSynPackage({
            creator: address(this),
            name: bucketName,
            visibility: BucketVisibilityType.Private,
            paymentAddress: address(this),
            primarySpAddress: sp_address_testnet,
            primarySpApprovalExpiredHeight: 0,
            globalVirtualGroupFamilyId: 1,
            primarySpSignature: new bytes(0),
            chargedReadQuota: 10485760000,
            extraData: new bytes(0)
        });

        ExtraData memory _extraData = ExtraData({
            appAddress: address(this),
            refundAddress: msg.sender,
            failureHandleStrategy: _failureHandleStrategy,
            callbackData: _callbackData
        });
        
        IBucketHub(bucket_hub).createBucket{ value:totalFee }(createPackage,_callbackGasLimit,_extraData);
    }


    function createSchemaPolicy(
        string memory name,
        bytes32 schemaId, 
        
        Policys.Policy memory policy,
        uint256 _callbackGasLimit,
        FailureHandleStrategy _failureHandleStrategy
    ) external payable onlyOwner {
        bytes memory createPolicyData = Policys.encodePolicy(policy);
		return _createSchemaPolicy(name,schemaId,createPolicyData,_callbackGasLimit, _failureHandleStrategy);
    }

    function _createSchemaPolicy(
        string memory name,
        bytes32 schemaId, 
        bytes memory createPolicyData,
        uint256 _callbackGasLimit,
        FailureHandleStrategy _failureHandleStrategy
    ) internal {
        require (schemaBuckets[schemaId][name] == Status.Success, "The bucket of the given schema and name is not created");
		_createPolicy(name,schemaId,createPolicyData,_callbackGasLimit,_failureHandleStrategy);
    }


    function createUserPolicy(bytes calldata createPolicyData,uint256 _callbackGasLimit,FailureHandleStrategy _failureHandleStrategy)  external payable onlyOwner{
        return _createUserPolicy(createPolicyData,_callbackGasLimit, _failureHandleStrategy);
    }
    function _createUserPolicy(bytes memory createPolicyData,uint256 _callbackGasLimit,FailureHandleStrategy _failureHandleStrategy) internal {
        require (basBucket == Status.Success, "The bucket of this contract is not created");
        _createPolicy("",bytes32(0),createPolicyData,_callbackGasLimit,_failureHandleStrategy);
    }

    function _createPolicy(
        string memory name,
        bytes32 schemaId,
        bytes memory createPolicyData,
        uint256 _callbackGasLimit,
        FailureHandleStrategy _failureHandleStrategy
        ) internal {
            bytes memory _callbackData = abi.encode(name,schemaId,createPolicyData);

            bytes32 dataHash = keccak256(createPolicyData);
            require(policies[dataHash] != Status.Pending && policies[dataHash] != Status.Success,"The policy has created");
            ExtraData memory _extraData = ExtraData({
                appAddress: address(this),
                refundAddress: msg.sender,
                failureHandleStrategy: _failureHandleStrategy,
                callbackData: _callbackData
            });

            (uint256 totalFee,,) = _getTotelFee(_callbackGasLimit);
            require(msg.value >= totalFee,"create policy insufficent value" );
            IPermissionHub(permission_hub).createPolicy{ value: totalFee }(createPolicyData,_extraData); 
            policies[dataHash] == Status.Pending;
        }

    
    
    function topUpBNB(uint256 transferOutAmount) external payable {
        (uint256 relayFee, uint256 ackRelayFee) = ICrossChain(cross_chain).getRelayFees();
        require(msg.value == transferOutAmount + relayFee + ackRelayFee, "msg.value not enough");
        _topUpBNB(transferOutAmount,relayFee,ackRelayFee);
    }

    function _topUpBNB(uint256 transferOutAmount,uint256 relayFee, uint256 ackRelayFee) internal {
        bool result = ITokenHub(tokenHub).transferOut{ value: transferOutAmount + relayFee + ackRelayFee }(
            address(this),
            transferOutAmount
        );
        require(result,"fail to transfer token");
    }

    function transferOwnership(address _controller) public override onlyOwner{
        require(_controller != address(0), "Ownable: new owner is the zero address");
        address preController = owner();
        _transferOwnership(_controller);
        IBucketRegistry(bucketRegistry).updateController(preController,_controller);
    }

    //todo: change visibility 
    function greenfieldExecutor(uint8[] calldata _msgTypes, bytes[] calldata _msgBytes) external onlyOwner {
        (uint256 relayFee,) = ICrossChain(cross_chain).getRelayFees();
        bool result = IGreenfieldExecutor(greenfield_executor).execute{ value: relayFee }(_msgTypes, _msgBytes);
        require(result,"fail to execute");
    }

    function getName(string memory name, bytes32 schemaId) public view returns (string memory){
        return _getName(name, schemaId);
    }

    function toHexString(bytes20 data) public pure returns (string memory) {
        bytes memory alphabet = "0123456789abcdef";
        bytes memory str = new bytes(40); // 每个字节对应两个十六进制字符

        for (uint256 i = 0; i < 20; i++) {
            str[2 * i] = alphabet[uint8(data[i] >> 4)]; // 获取高4位
            str[2 * i + 1] = alphabet[uint8(data[i] & 0x0f)]; // 获取低4位
        }
        return string(str);
    }   

    uint8 public constant RESOURCE_BUCKET = 0x04;
    uint8 public constant PERMISSION_CHANNEL = 0x07;
    uint8 public constant TYPE_CREATE = 2;


    function greenfieldCall(
        uint32 status,
        uint8 resourceType,
        uint8 operationType,
        uint256 resourceId,
        bytes calldata callbackData
    ) external {
        require(msg.sender == bucket_hub || msg.sender == permission_hub, "Invalid caller");
        if (operationType != TYPE_CREATE) {
            return;
        }
        
        if (resourceType == RESOURCE_BUCKET) {
            _bucketGreenfieldCall(status, callbackData);
        } else if (resourceType == PERMISSION_CHANNEL) {
            _policyGreenfieldCall(status, callbackData);
        } else {
            revert("Invalid resource");
        }
    }

    function _bucketGreenfieldCall(uint32 status,bytes calldata callbackData) internal { 
        (string memory name, bytes32 schemaId) = abi.decode(callbackData,(string, bytes32));
        string memory bucketName = _getName(name,schemaId);

        if (status == 0) {
            if (schemaId == bytes32(0)) {
                basBucket = Status.Success;
                bucketNames.push(bucketName);
            }else {
                basBucket = Status.Failed;
            }
        }else if (status == 1) { 
            if (schemaId == bytes32(0)) {
                schemaBuckets[schemaId][name] = Status.Success;
                bucketNames.push(bucketName);
                nameOfSchemaId[schemaId].push(name);
            }else {
                schemaBuckets[schemaId][name] = Status.Failed;
            }
            IBucketRegistry(bucketRegistry).setBucketName(bucketName);
        } 
        emit CreateBucket(bucketName,status);
    }


    function _policyGreenfieldCall(
        uint32 status,
        bytes calldata callbackData) internal {

        (string memory name, bytes32 schemaId,bytes memory createPolicyData) = abi.decode(callbackData,(string, bytes32,bytes));    
        bytes32 dataHash = keccak256(callbackData);
        if (status == 0) {
            policies[dataHash] = Status.Success;
        }else if(status == 1){
            policies[dataHash] = Status.Failed;
        }      
        string memory bucketName = _getName(name, schemaId);
        emit CreatePolicy(bucketName, createPolicyData, status);  
    }   

    function _getTotelFee(uint256 _callbackGasLimit) internal returns (uint256 totalFee,uint256 relayFee,uint256 minAckRelayFee) {
        (relayFee, minAckRelayFee) = ICrossChain(cross_chain).getRelayFees();
        uint256 gasPrice = ICrossChain(cross_chain).callbackGasPrice();
        return (relayFee + minAckRelayFee + _callbackGasLimit * gasPrice,relayFee, minAckRelayFee);
    }


    function getUserBucketStatus() public view returns(Status) {
        return basBucket;
    }

    function getSchemaBucketStatus(bytes32 schemaId, string memory name)public view returns(Status) {
        return schemaBuckets[schemaId][name];
    }

    function getPolicyStatus(bytes32 _msgDataHash)public view returns(Status) {
        return policies[_msgDataHash];
    }
}