// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import { Strings } from "@openzeppelin/contracts/utils/Strings.sol";
import "@lazyledger/protobuf3-solidity-lib/contracts/ProtobufLib.sol";

int32 constant RESOURCE_TYPE_UNSPECIFIED = 0;
int32 constant RESOURCE_TYPE_BUCKET = 1;
int32 constant RESOURCE_TYPE_OBJECT = 2;
int32 constant RESOURCE_TYPE_GROUP =3;

int32 constant PRINCIPAL_TYPE_UNSPECIFIED=0;
int32 constant PRINCIPAL_TYPE_GNFD_ACCOUNT=1;
int32 constant PRINCIPAL_TYPE_GNFD_GROUP =2;

int32 constant ACTION_UNSPECIFIED = 0;
int32 constant ACTION_UPDATE_BUCKET_INFO = 1;
int32 constant ACTION_DELETE_BUCKET = 2;
int32 constant  ACTION_CREATE_OBJECT = 3;
int32 constant ACTION_DELETE_OBJECT = 4;
int32 constant ACTION_COPY_OBJECT = 5;
int32 constant ACTION_GET_OBJECT = 6;
int32 constant ACTION_EXECUTE_OBJECT = 7;
int32 constant ACTION_LIST_OBJECT = 8;
int32 constant ACTION_UPDATE_GROUP_MEMBER = 9;
int32 constant ACTION_DELETE_GROUP = 10;
int32 constant ACTION_UPDATE_OBJECT_INFO = 11;
int32 constant ACTION_UPDATE_GROUP_EXTRA = 12;
int32 constant ACTION_UPDATE_GROUP_INFO = 13;
int32 constant ACTION_UPDATE_OBJECT_CONTENT = 14;

int32 constant EFFECT_UNSPECIFIED = 0;
int32 constant EFFECT_ALLOW = 1;
int32 constant EFFECT_DENY = 2;

struct Timestamp {
    int64 _seconds;
    int32 nanos;
}

struct UInt64Value {
    uint64 value;
}


int32 constant VISIBILITY_TYPE_UNSPECIFIED = 0;
int32 constant   VISIBILITY_TYPE_PUBLIC_READ = 1;
int32 constant   VISIBILITY_TYPE_PRIVATE = 2;
int32 constant   VISIBILITY_TYPE_INHERIT = 3;
int32 constant  UNRECOGNIZED = -1;


library Policys {
    struct Policy {
        string id;
        Principal principal;
        int32 resource_type;
        string resource_id;
        Statement[] statements;
        Timestamp expiration_time;
    }

    struct Principal {
        int32 principal_type;
        string value;
    }

    struct Statement {
        int32 effect;
        int32[] actions;
        string[] resources;
        Timestamp expiration_time;
        UInt64Value limit_size;
    }

    function encodePrinciple(Principal memory principal)internal pure returns (bytes memory) {
        bytes memory result;
        if (principal.principal_type != 0) {
            result = abi.encodePacked(ProtobufLib.encode_uint32(8),ProtobufLib.encode_int32(principal.principal_type));
        }

        if (!Strings.equal("",principal.value))  {
            result = abi.encodePacked(result,ProtobufLib.encode_uint32(18),ProtobufLib.encode_string(principal.value));
        }
        return result;
        }   

    function encodeStatement(Statement memory statement)internal pure returns (bytes memory) {
        bytes memory result;
        if (statement.effect != 0) {
            result = abi.encodePacked(ProtobufLib.encode_uint32(8),ProtobufLib.encode_int32(statement.effect));
        }

        //actions
        result = abi.encodePacked(result,ProtobufLib.encode_uint32(18));
        
        bytes memory actionsBytes;
        for (uint i = 0;i< statement.actions.length;i++) {
           actionsBytes = abi.encodePacked(actionsBytes,ProtobufLib.encode_int32(statement.actions[i]));
        }
        if (actionsBytes.length >0) {
            result = abi.encodePacked(result,ProtobufLib.encode_uint32(uint32(actionsBytes.length)),actionsBytes);
        }

        //resources 
        for (uint i = 0;i< statement.resources.length;i++) {
            result = abi.encodePacked(result,ProtobufLib.encode_uint32(26),ProtobufLib.encode_string(statement.resources[i]));
        }

        //expiration 
        // bytes memory expirationTimeBytes;
        if (statement.expiration_time._seconds != 0) {
            bytes memory secondBytes = abi.encodePacked(ProtobufLib.encode_uint32(8),ProtobufLib.encode_int64(statement.expiration_time._seconds));
            result = abi.encodePacked(result,ProtobufLib.encode_uint32(34),ProtobufLib.encode_uint32(uint32(secondBytes.length)),secondBytes);
        }

        // bytes memory limitSizeBytes;
        if (statement.limit_size.value != 0) {
            bytes memory valueBytes = abi.encodePacked(ProtobufLib.encode_uint32(8),ProtobufLib.encode_uint64(statement.limit_size.value));
            result = abi.encodePacked(result,ProtobufLib.encode_uint32(42),ProtobufLib.encode_uint32(uint32(valueBytes.length)),valueBytes);
        }
        return result; 
    }

    function encodePolicy(Policy memory policy) internal pure returns (bytes memory) {
        bytes memory result;
        if (!Strings.equal("",policy.id)) {
            result = abi.encodePacked(ProtobufLib.encode_uint32(10),ProtobufLib.encode_string(policy.id));
        }

        if (policy.principal.principal_type !=0) {
            bytes memory principalBytes = encodePrinciple(policy.principal);
            result = abi.encodePacked(result,ProtobufLib.encode_uint32(18),ProtobufLib.encode_uint32(uint32(principalBytes.length)),principalBytes);
        }

        if (policy.resource_type != 0) {
            result = abi.encodePacked(result,ProtobufLib.encode_uint32(24),ProtobufLib.encode_int32(policy.resource_type));
        }

         if (!Strings.equal("",policy.resource_id)){
            result = abi.encodePacked(result,ProtobufLib.encode_uint32(34),ProtobufLib.encode_string(policy.resource_id));
        }

        for (uint i = 0;i<policy.statements.length;i++) {
            bytes memory statementsBytes = encodeStatement(policy.statements[i]);
            result = abi.encodePacked(result,ProtobufLib.encode_uint32(42),ProtobufLib.encode_uint32(uint32(statementsBytes.length)),statementsBytes);
        }

        if (policy.expiration_time._seconds != 0) {
            bytes memory secondBytes = abi.encodePacked(ProtobufLib.encode_uint32(8),ProtobufLib.encode_int64(policy.expiration_time._seconds));
            result = abi.encodePacked(result,ProtobufLib.encode_uint32(50),ProtobufLib.encode_uint32(uint32(secondBytes.length)),secondBytes);
        }
    
        return result;
    }
}

library Executor {
    struct MsgSetBucketFlowRateLimit{
        string operator;
        string bucketName;
        string bucketOwner;
        string paymentAddress;
        string flowRateLimit;
    }

    struct MsgUpdateBucketInfo {
        string operator;
        string bucketName;
        UInt64Value chargedReadQuota;
        string paymentAddress;
        int32 visibility;       
    }

    struct MsgUpdateObjectInfo {
        string operator;
        string bucketName;
        string objectName;
        int32 visibility;       
    }

    function encodeMsgSetBucketFlowRateLimit(MsgSetBucketFlowRateLimit memory _msg) internal pure returns (bytes memory) {
        bytes memory result;
        if (!Strings.equal(_msg.operator, "")) {
            result = abi.encodePacked(ProtobufLib.encode_uint32(10),ProtobufLib.encode_string(_msg.operator));
        }

        if (!Strings.equal(_msg.bucketName,"")) {
            result = abi.encodePacked(result,ProtobufLib.encode_uint32(18),ProtobufLib.encode_string(_msg.bucketName));
        }

        if (!Strings.equal(_msg.bucketOwner,"")) {
            result = abi.encodePacked(result,ProtobufLib.encode_uint32(26),ProtobufLib.encode_string(_msg.bucketOwner));
        }

        if (!Strings.equal(_msg.paymentAddress, "")) {
            result = abi.encodePacked(result,ProtobufLib.encode_uint32(34),ProtobufLib.encode_string(_msg.paymentAddress));
        }

        if (!Strings.equal(_msg.flowRateLimit, "")) {
            result = abi.encodePacked(result,ProtobufLib.encode_uint32(42),ProtobufLib.encode_string(_msg.flowRateLimit));
        }
        return result;

    }
    function encodeMsgUpdateObjectInfo(MsgUpdateObjectInfo memory _msg) internal pure returns (bytes memory) {
        bytes memory result;
        if (!Strings.equal(_msg.operator, "")) {
            result = abi.encodePacked(ProtobufLib.encode_uint32(10),ProtobufLib.encode_string(_msg.operator));
        }

        if (!Strings.equal(_msg.bucketName,"")) {
            result = abi.encodePacked(result,ProtobufLib.encode_uint32(18),ProtobufLib.encode_string(_msg.bucketName));
        }

        if (!Strings.equal(_msg.objectName,"")) {
            result = abi.encodePacked(result,ProtobufLib.encode_uint32(26),ProtobufLib.encode_string(_msg.objectName));
        }

        if (_msg.visibility != 0) {
            result = abi.encodePacked(result,ProtobufLib.encode_uint32(32),ProtobufLib.encode_int32(_msg.visibility));
        }
        return result;
    }

    function encodeMsgUpdateBucketInfo(MsgUpdateBucketInfo memory _msg) internal pure returns (bytes memory) {
        bytes memory result;
        if (!Strings.equal(_msg.operator, "")) {
            result = abi.encodePacked(ProtobufLib.encode_uint32(10),ProtobufLib.encode_string(_msg.operator));
        }

        if (!Strings.equal(_msg.bucketName,"")) {
            result = abi.encodePacked(result,ProtobufLib.encode_uint32(18),ProtobufLib.encode_string(_msg.bucketName));
        }

        if (_msg.chargedReadQuota.value != 0) {
             bytes memory valueBytes = abi.encodePacked(ProtobufLib.encode_uint32(8),ProtobufLib.encode_uint64(_msg.chargedReadQuota.value));
            result = abi.encodePacked(result,ProtobufLib.encode_uint32(26),ProtobufLib.encode_uint32(uint32(valueBytes.length)),valueBytes);
        }

        if (!Strings.equal(_msg.paymentAddress, "")) {
            result = abi.encodePacked(result,ProtobufLib.encode_uint32(34),ProtobufLib.encode_string(_msg.paymentAddress));
        }

        if (_msg.visibility != 0) {
            result = abi.encodePacked(result,ProtobufLib.encode_uint32(40),ProtobufLib.encode_int32(_msg.visibility));
        }
        return result;
    }
}