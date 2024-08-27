// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;
import "@bnb-chain/greenfield-contracts/contracts/interface/IBucketHub.sol";
import "@bnb-chain/greenfield-contracts/contracts/interface/ITokenHub.sol";

import "@bnb-chain/greenfield-contracts/contracts/interface/ICrossChain.sol";
import "@bnb-chain/greenfield-contracts/contracts/interface/IPermissionHub.sol";
import "@bnb-chain/greenfield-contracts/contracts/interface/IGreenfieldExecutor.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol"; 
import { Semver } from "../Semver.sol";
// 引入 OpenZeppelin 的 Strings 库


import {SchemaRecord} from "../ISchemaRegistry.sol";


interface ISchemaRegistry {
    function getSchema(bytes32 uid) external view returns (SchemaRecord memory);
}

interface IBucketRegistry{
    function existBucketName(string memory bucketName) external view returns (bool);
    function setBucketName(string memory bucketName) external;
    function updateController(address preController, address newController) external;
}

contract BucketManager is Semver, Ownable{
    address public  bucketRegistry;
    address public  schemaRegistry;
    address public  tokenHub;
    address public  cross_chain;
    address public  bucket_hub;
    address public  permission_hub;
    address public  sp_address_testnet;
    address public  greenfield_executor;


    event CreateSchemaBucket(address indexed creator, bytes32 indexed schemaId, string name);
    event CreateSchemaPolicy(bytes32 indexed schemaId, string name, bytes _msgData);

    event CreateUserBucket(address indexed creator,string name);
    event CreateUserPolicy(bytes _msgData);
    
	//schemaID => name
	mapping (bytes32 => mapping(string => bool)) public schemaBuckets;
    string[] public bucketNames;
    mapping (bytes32 => string[]) public nameOfSchemaId;
    bool public basBucket;


    function _getName(string memory name, bytes32 schemaId) public view returns (string memory){
         if (schemaId == bytes32(0)) {
            return string(abi.encodePacked("bas-", Strings.toHexString(msg.sender)));
        }
        return string(abi.encodePacked("bas-", name,"-",Strings.toHexString(uint256(schemaId))));
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

        uint256 major, 
        uint256 minor, 
        uint256 patch
        
    ) Semver(major, minor, patch) {
        bucketRegistry = _bucketRegistry;
        schemaRegistry = _schemaRegistry;
        tokenHub = _tokenHub;
        cross_chain = _cross_chain;
        bucket_hub = _bucket_hub;
        permission_hub = _permission_hub;
        sp_address_testnet = _sp_address_testnet;
        greenfield_executor = _greenfield_executor;

        _transferOwnership(_controller);
    }

    function createSchemaBucket(
		string memory name,
		bytes32 schemaId, 
		bytes memory _executorData
	) external payable onlyOwner returns (string memory) {
         // Verify if the schema exists
        require(bytes(name).length != 0, "Invalid Name: Name should not be empty");
		require(schemaBuckets[schemaId][name] == false,"The bucket of the given schema and name has exsited");

        string memory bucketName = _getName(name,schemaId);
        require(!IBucketRegistry(bucketRegistry).existBucketName(bucketName), "The name of bucket for schema has existed");
		SchemaRecord memory schema = ISchemaRegistry(schemaRegistry).getSchema(schemaId);
		require(schema.uid != bytes32(0),"Invalid schemaId");
        
        // Create the bucket
		_createBucket(bucketName,_executorData);
        schemaBuckets[schemaId][name] = true;
        bucketNames.push(bucketName);
        nameOfSchemaId[schemaId].push(name);
        IBucketRegistry(bucketRegistry).setBucketName(bucketName);
		emit CreateSchemaBucket(msg.sender, schemaId,name);
        return bucketName;
	}
	
	function createUserBucket(
		bytes memory _executorData
	) external payable onlyOwner returns (string memory){
	    require(!basBucket,"The bas bucket for current contract has existed");
	    string memory bucketName = _getName("",bytes32(0));
        require(!IBucketRegistry(bucketRegistry).existBucketName(bucketName), "The name of bucket for schema has existed");

	    _createBucket(bucketName,_executorData);
	    basBucket = true;
        bucketNames.push(bucketName);
        IBucketRegistry(bucketRegistry).setBucketName(bucketName);
	    emit CreateUserBucket(msg.sender,bucketName);
        return bucketName;
    }

    
    function _createBucket(
        string memory bucketName,
        bytes memory _executorData
    ) internal {
        (uint256 relayFee, uint256 ackRelayFee) = ICrossChain(cross_chain).getRelayFees();

        if (_executorData.length == 0)  {
            require(msg.value == relayFee + ackRelayFee, "msg.value not enough");
        } else {
            require(msg.value == relayFee * 2 + ackRelayFee, "msg.value not enough");
        } 

       if (_executorData.length > 0) {
         // 2. set bucket flow rate limit
            uint8[] memory _msgTypes = new uint8[](1);
            _msgTypes[0] = 9; // * 9: SetBucketFlowRateLimit
            bytes[] memory _msgBytes = new bytes[](1);
            _msgBytes[0] = _executorData;
            IGreenfieldExecutor(greenfield_executor).execute{ value: relayFee }(_msgTypes, _msgBytes);
       }

        // 3. create bucket, owner = address(this)
        BucketStorage.CreateBucketSynPackage memory createPackage = BucketStorage.CreateBucketSynPackage({
            creator: address(this),
            name: bucketName,
            visibility: BucketStorage.BucketVisibilityType.Private,
            paymentAddress: address(this),
            primarySpAddress: sp_address_testnet,
            primarySpApprovalExpiredHeight: 0,
            globalVirtualGroupFamilyId: 1,
            primarySpSignature: new bytes(0),
            chargedReadQuota: 10485760000,
            extraData: new bytes(0)
        });
        bool result = IBucketHub(bucket_hub).createBucket{ value: relayFee + ackRelayFee }(createPackage);
        require(result,"fail to create bucket");
    }

    function createSchemaPolicy(string memory name,bytes32 schemaId, bytes calldata createPolicyData) external payable onlyOwner {
        require (schemaBuckets[schemaId][name] == true, "The bucket of the given schema and name is not created");
		bool result = IPermissionHub(permission_hub).createPolicy{ value: msg.value }(createPolicyData);   
        require(result,"fail to create policy");
        emit CreateSchemaPolicy(schemaId,name,createPolicyData);
    }

    function createUserPolicy(bytes calldata createPolicyData) external payable onlyOwner {
        require ( basBucket == true, "The bucket of this contract is not created");
		bool result = IPermissionHub(permission_hub).createPolicy{ value: msg.value }(createPolicyData);   
        require(result,"fail to create policy");
        emit CreateUserPolicy(createPolicyData);
    }

    function topUpBNB(uint256 transferOutAmount) external payable {
        _topUpBNB(transferOutAmount);
    }


    function _topUpBNB(uint256 transferOutAmount) internal {
        (uint256 relayFee, uint256 ackRelayFee) = ICrossChain(cross_chain).getRelayFees();
        require(msg.value == transferOutAmount + relayFee + ackRelayFee, "msg.value not enough");

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
        (uint256 relayFee, uint256 ackRelayFee) = ICrossChain(cross_chain).getRelayFees();
        bool result = IGreenfieldExecutor(greenfield_executor).execute{ value: relayFee }(_msgTypes, _msgBytes);
        require(result,"fail to execute");
    }

    function getName(string memory name, bytes32 schemaId) public view returns (string memory){
        return _getName(name, schemaId);
    }
    
}