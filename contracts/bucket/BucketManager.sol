// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;
import "@bnb-chain/greenfield-contracts/contracts/interface/IBucketHub.sol";
import "@bnb-chain/greenfield-contracts/contracts/interface/ITokenHub.sol";
// import "@bnb-chain/greenfield-contracts-sdk/BaseApp.sol";

import "@bnb-chain/greenfield-contracts/contracts/interface/ICrossChain.sol";
import "@bnb-chain/greenfield-contracts/contracts/interface/IPermissionHub.sol";
import "@bnb-chain/greenfield-contracts/contracts/interface/IGreenfieldExecutor.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol"; 
// 引入 OpenZeppelin 的 Strings 库


import {SchemaRecord} from "../ISchemaRegistry.sol";


interface ISchemaRegistry {
    function getSchema(bytes32 uid) external view returns (SchemaRecord memory);
}

interface IBucketRegistry{
    function existBucketName(string memory bucketName) external view returns (bool);
    function setBucketName(string memory bucketName,uint256 bucketId) external;
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
    address public  greenfield_executor;
    string  public  version;


    event CreateBucket(string bucketName ,uint32 indexed status);
    event CreatePolicy(string bucketName, bytes32 indexed _msgDataHash, uint32 indexed status);
    
	//schemaID => name
	mapping (bytes32 => mapping(string => Status)) public schemaBuckets;
    
    string[] public bucketNames;
    mapping (bytes32 => string[]) public nameOfSchemaId;
    mapping(bytes32 => Status) policies;
    bytes32 addressBytes32;

    function _getName(string memory name, bytes32 schemaId) internal view returns (string memory){
        bytes memory nameBytes = bytes(name);
        require(nameBytes.length < 18 && nameBytes.length > 0, "length of name should < 18 and > 0");
        for (uint i=0;i <nameBytes.length;i++){
            require(isLowercaseLetter(nameBytes[i]) || isDigit(nameBytes[i]) || nameBytes[i] == ',',"Schema bucket name can only include lowercase letters, numbers, commas");
        }

        if (schemaId == bytes32(0)) {
            return string(abi.encodePacked("bas-",name,"-",Strings.toHexString(address(this)))); 
        } else {
            return string(abi.encodePacked("bas-", name,"-",toHexString(bytes20(schemaId))));
        }
    }

    constructor (
        address _controller,
        address _bucketRegistry,
        address _schemaRegistry,
        address _tokenHub,
        address _cross_chain,
        address _bucket_hub,
        address _permission_hub,
        address _greenfield_executor,
        string memory _version
    ) {
        bucketRegistry = _bucketRegistry;
        schemaRegistry = _schemaRegistry;
        tokenHub = _tokenHub;
        cross_chain = _cross_chain;
        bucket_hub = _bucket_hub;
        permission_hub = _permission_hub;
        greenfield_executor = _greenfield_executor;
        version = _version;
        IBucketRegistry(bucketRegistry).updateController(owner(),_controller);
        _transferOwnership(_controller);
        addressBytes32 = bytes32(uint256(uint160(address(this))));
    }
    

    function createBucket(
		string memory name,
		bytes32 schemaId, 
		bytes memory _executorData,
        uint256 _callbackGasLimit,
        PackageQueue.FailureHandleStrategy _failureHandleStrategy,
        address sp_address
	) public payable onlyOwner returns (string memory) {
         // Verify if the schema exists
		if (schemaId != bytes32(0)) {
            require(schemaBuckets[schemaId][name] != Status.Pending && schemaBuckets[schemaId][name] != Status.Success ,"The bucket of the given schema and name has existed");
		    SchemaRecord memory schema = ISchemaRegistry(schemaRegistry).getSchema(schemaId);
		    require(schema.uid != bytes32(0),"Invalid schemaId");
        } else {
            require(schemaBuckets[addressBytes32][name] != Status.Pending && schemaBuckets[addressBytes32][name] != Status.Success ,"The bucket of the given schema and name has existed");
        }

        string memory bucketName = _getName(name,schemaId);
        require(!IBucketRegistry(bucketRegistry).existBucketName(bucketName), string(abi.encodePacked(bucketName, ":bucket has created")));
        
        // Create the bucket
        bytes memory _callbackData = abi.encode(name, schemaId);
	    _createBucket(bucketName,_executorData,_callbackData,_callbackGasLimit,_failureHandleStrategy,sp_address);
        
        if (schemaId != bytes32(0)) {
            schemaBuckets[schemaId][name] = Status.Pending;
        } else {
            schemaBuckets[addressBytes32][name] = Status.Pending;
        }

        return bucketName;
	}
	
    function _createBucket(
        string memory bucketName,
        bytes memory _executorData,
        bytes memory _callbackData,
        uint256 _callbackGasLimit,
        PackageQueue.FailureHandleStrategy _failureHandleStrategy,
        address sp_address
    ) internal {

       (uint256 totalFee,uint256 relayFee,)  = _getTotalFee(_callbackGasLimit);
       if (_executorData.length > 0) {
         // 2. set bucket flow rate limit
            uint8[] memory _msgTypes = new uint8[](1);
            _msgTypes[0] = 9; // * 9: SetBucketFlowRateLimit
            bytes[] memory _msgBytes = new bytes[](1);
            _msgBytes[0] = _executorData;
            IGreenfieldExecutor(greenfield_executor).execute{ value: relayFee }(_msgTypes, _msgBytes);
            require(msg.value >= totalFee+relayFee,"create bucket insufficient value with execution" );
       }

       require(msg.value >= totalFee,"create bucket insufficient value" );

        // 3. create bucket, owner = address(this)
        BucketStorage.CreateBucketSynPackage memory createPackage = BucketStorage.CreateBucketSynPackage({
            creator: address(this),
            name: bucketName,
            visibility: BucketStorage.BucketVisibilityType.PublicRead,
            paymentAddress: address(this),
            primarySpAddress: sp_address,
            primarySpApprovalExpiredHeight: 0,
            globalVirtualGroupFamilyId: 1,
            primarySpSignature: new bytes(0),
            chargedReadQuota: 1048576000,
            extraData: new bytes(0)
        });

        CmnStorage.ExtraData memory _extraData = CmnStorage.ExtraData({
            appAddress: address(this),
            refundAddress: msg.sender,
            failureHandleStrategy: _failureHandleStrategy,
            callbackData: _callbackData
        });
        
        IBucketHub(bucket_hub).createBucket{ value:totalFee }(createPackage,_callbackGasLimit,_extraData);
    }

    function createPolicy(
        string memory name,
        bytes32 schemaId, 
        bytes calldata createPolicyData,
        uint256 _callbackGasLimit,
        PackageQueue.FailureHandleStrategy _failureHandleStrategy
    ) external payable onlyOwner {
        bytes32 _schemaId;
        if (schemaId == bytes32(0)) {
            _schemaId = addressBytes32;
        }else {
            _schemaId = schemaId;
        }
        require (schemaBuckets[_schemaId][name] == Status.Success, "The bucket of the given schema and name is not created");
		_createPolicy(name,schemaId,createPolicyData,_callbackGasLimit,_failureHandleStrategy);
    }


    function _createPolicy(
        string memory name,
        bytes32 schemaId,
        bytes calldata createPolicyData,
        uint256 _callbackGasLimit,
        PackageQueue.FailureHandleStrategy _failureHandleStrategy
        ) internal {
            bytes32 dataHash = keccak256(createPolicyData);
            require(policies[dataHash] != Status.Pending && policies[dataHash] != Status.Success,"The policy has created");
            
            bytes memory _callbackData = abi.encode(name,schemaId,dataHash);
            CmnStorage.ExtraData memory _extraData = CmnStorage.ExtraData({
                appAddress: address(this),
                refundAddress: msg.sender,
                failureHandleStrategy: _failureHandleStrategy,
                callbackData: _callbackData
            });

            (uint256 totalFee,,) = _getTotalFee(_callbackGasLimit);
            require(msg.value >= totalFee,"create policy insufficient value" );
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
            _bucketGreenfieldCall(status, callbackData,resourceId);
        } else if (resourceType == PERMISSION_CHANNEL) {
            _policyGreenfieldCall(status, callbackData);
        } else {
            revert("Invalid resource");
        }
    }

    function _bucketGreenfieldCall(uint32 status,bytes calldata callbackData,uint256 resourceId) internal { 
        (string memory name, bytes32 schemaId) = abi.decode(callbackData,(string, bytes32));
        string memory bucketName = _getName(name,schemaId);
        bytes32 _schemaId;
        if (schemaId == bytes32(0)) {
            _schemaId = addressBytes32;
        }else {
            _schemaId = schemaId;
        }

        if (status == 0) {
            schemaBuckets[_schemaId][name] = Status.Success;
            bucketNames.push(bucketName);
            nameOfSchemaId[_schemaId].push(name);
            IBucketRegistry(bucketRegistry).setBucketName(bucketName,resourceId);

        }else if (status == 1) { 
            schemaBuckets[_schemaId][name] = Status.Failed;
        } 
        emit CreateBucket(bucketName,status);
    }

    function _policyGreenfieldCall(
        uint32 status,
        bytes calldata callbackData) internal {
        (string memory name, bytes32 schemaId,bytes32 dataHash) = abi.decode(callbackData,(string, bytes32,bytes32));    
        if (status == 0) {
            policies[dataHash] = Status.Success;
        }else if(status == 1){
            policies[dataHash] = Status.Failed;
        }      
        string memory bucketName = _getName(name, schemaId);
        emit CreatePolicy(bucketName, dataHash, status);  
    }   

    function _getTotalFee(uint256 _callbackGasLimit) internal returns (uint256 totalFee,uint256 relayFee,uint256 minAckRelayFee) {
        (relayFee, minAckRelayFee) = ICrossChain(cross_chain).getRelayFees();
        uint256 gasPrice = ICrossChain(cross_chain).callbackGasPrice();
        return (relayFee + minAckRelayFee + _callbackGasLimit * gasPrice,relayFee, minAckRelayFee);
    }


    function getBucketStatus(bytes32 schemaId, string memory name)public view returns(Status) {
         bytes32 _schemaId;
        if (schemaId == bytes32(0)) {
            _schemaId = addressBytes32;
        }else {
            _schemaId = schemaId;
        }
        return schemaBuckets[_schemaId][name];
    }

    function getPolicyStatus(bytes32 _msgDataHash)public view returns(Status) {
        return policies[_msgDataHash];
    }


    function isLowercaseLetter(bytes1 char) internal pure returns (bool) {
        return (char >= 'a' && char <= 'z');
    }
    
    // Function to check if a character is a digit
    function isDigit(bytes1 char) internal pure returns (bool) {
        return (char >= '0' && char <= '9');
    }
}