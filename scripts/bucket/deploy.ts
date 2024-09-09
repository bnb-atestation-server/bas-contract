import  {ethers,upgrades} from "hardhat";
import { ExecutorMsg } from '@bnb-chain/bsc-cross-greenfield-sdk';
import { Policy } from '@bnb-chain/greenfield-cosmos-types/greenfield/permission/types';
import { Client } from '@bnb-chain/greenfield-js-sdk';
import { ResourceType } from '@bnb-chain/greenfield-cosmos-types/greenfield/resource/types';
import {StatementStruct,PrincipalStruct,PolicyStruct} from "../../typechain-types/contracts/bucket/Common"
import {BucketRegistry__factory} from  "../../typechain-types/factories/contracts/bucket";
import {BucketFactory__factory} from  "../../typechain-types/factories/contracts/bucket/BucketFactory.sol";
import {BucketManager__factory} from  "../../typechain-types/factories/contracts/bucket/BucketManager.sol";


import {
   ActionType,
   Effect,
   PrincipalType,
} from '@bnb-chain/greenfield-cosmos-types/greenfield/permission/common';
import { ZERO_BYTES32 } from "../utils";

async function deployRegistry() {
    const [signer] = await ethers.getSigners();
    console.log('Deploy bucket registry contract with account:',signer.address);

    const Registry =  await ethers.getContractFactory("BucketRegistry",signer);
    const registry = await upgrades.deployProxy(Registry,[]);
    await registry.waitForDeployment();
    const addr = await registry.getAddress();
    console.log('Bucket Registry Address:', addr)
    return addr
}

async function deployUtilsLib() {
    const [signer] = await ethers.getSigners();
    const Policy =  await ethers.getContractFactory("Policys",signer);
    const policy = await Policy.deploy()
    await policy.waitForDeployment()
    const addr = await policy.getAddress()
    console.log("policy lib address:",addr)
    return addr
}

async function deployFactory(bucketRegistry: string, policyAddr:string) {
    const TOKEN_HUB = "0xED8e5C546F84442219A5a987EE1D820698528E04";
    const CROSS_CHAIN = "0xa5B2c9194131A4E0BFaCbF9E5D6722c873159cb7";
    const BUCKET_HUB = "0x5BB17A87D03620b313C39C24029C94cB5714814A";
    const PERMISSION_HUB = "0x25E1eeDb5CaBf288210B132321FBB2d90b4174ad";
    const SP_ADDRESS_TESTNET = "0x5FFf5A6c94b182fB965B40C7B9F30199b969eD2f";
    const GREENFIELD_EXECUTOR = "0x3E3180883308e8B4946C9a485F8d91F8b15dC48e";
    const SCHEMA_REGISTRY = "0x08C8b8417313fF130526862f90cd822B55002D72"

    const callbackGasLimit = 200000n
    const failureHandleStrategy = 2


    const [signer] = await ethers.getSigners();
    // const Factory =  await ethers.getContractFactory("BucketFactory",{
    //     signer,
    //     libraries:{
    //         Policys: policyAddr,
    //     }
    // });

    const Factory =  await ethers.getContractFactory("BucketFactory",signer);

    const factory = await upgrades.deployProxy(Factory,[
        bucketRegistry,
        SCHEMA_REGISTRY,
        TOKEN_HUB,
        CROSS_CHAIN,
        BUCKET_HUB,
        PERMISSION_HUB,
        SP_ADDRESS_TESTNET,
        GREENFIELD_EXECUTOR,
        callbackGasLimit,
        failureHandleStrategy
    ])
    await factory.waitForDeployment()
    const addr = await factory.getAddress();
    console.log('Bucket Factory Address:', addr)
    return addr
}

async function setFactoryAddressForRegistry(_registry: string,_factory:string) {
    const [signer] = await ethers.getSigners();
    const registry = BucketRegistry__factory.connect(_registry,signer)
    const resp = await registry.setBucketFactory(_factory);
    await resp.wait()
    console.log(`set bucket factory address to ${_factory} in tx ${resp.hash}`);
}

async function deployBucketManager(_factory: string,salt: string) {
    const [signer] = await ethers.getSigners();
    
    const factory = BucketFactory__factory.connect(_factory,signer)

    const CROSS_CHAIN = await factory.cross_chain();
    const crossChain = (await ethers.getContractAt('ICrossChain', CROSS_CHAIN));
    const [relayFee, ackRelayFee] = await crossChain.getRelayFees();

    const transferOutAmt = ethers.parseEther('0.005');

    const _bucketManager = await factory.getManagerAddress(salt);
    console.log("deploy manager:", _bucketManager)

    const value = transferOutAmt + relayFee + ackRelayFee;

    const resp = await factory.deploy(transferOutAmt,salt,{value});
    console.log(`create bucket manager contract in tx ${resp.hash}`);
    await resp.wait();
    return _bucketManager
}

async function createUserBucket(_bucketManager: string) {
    const GRPC_URL = 'https://gnfd-testnet-fullnode-tendermint-us.bnbchain.org';
    const GREEN_CHAIN_ID = 'greenfield_5600-1';
    const client = Client.create(GRPC_URL, GREEN_CHAIN_ID);

    const [signer] = await ethers.getSigners();
    const bucketManager = BucketManager__factory.connect(_bucketManager, signer)

    const CROSS_CHAIN = await bucketManager.cross_chain();
    const crossChain = (await ethers.getContractAt('ICrossChain', CROSS_CHAIN));
    const [relayFee, ackRelayFee] = await crossChain.getRelayFees();

    const gasPrice =  10000000000n;
    const callbackGasLimit = await bucketManager.callbackGasLimit();

    const userBucketName = await bucketManager.getName("",ZERO_BYTES32);

    const userDataSetBucketFlowRateLimit = ExecutorMsg.getSetBucketFlowRateLimitParams({
        bucketName:userBucketName,
        bucketOwner: _bucketManager,
        operator: _bucketManager,
        paymentAddress: _bucketManager,
        flowRateLimit: '100000000000000000',
    });

    
    const userExecutorData = userDataSetBucketFlowRateLimit[1];
    const userValue = 2n * relayFee + ackRelayFee + callbackGasLimit * gasPrice

    console.log('- create user bucket', userBucketName);
    console.log('send crosschain tx!');
    const resp = await (await bucketManager.createUserBucket(userExecutorData, {value: userValue })).wait();
    console.log(`https://testnet.bscscan.com/tx/${resp?.hash}`);

    
    console.log('waiting for user bucket created..., about 1 minute');
    await sleep(60); // waiting bucket created
 
    const userBucketInfo = await client.bucket.getBucketMeta({ bucketName:userBucketName });
    const userBucketId = userBucketInfo.body!.GfSpGetBucketMetaResponse.Bucket.BucketInfo.Id;

    console.log('usre bucket created, bucket id', userBucketId);
    const userHexBucketId = `0x000000000000000000000000000000000000000000000000000000000000${BigInt(
       userBucketId
    ).toString(16)}`;
    console.log(`https://testnet.greenfieldscan.com/bucket/${userHexBucketId}`);
}


async function createSchemaBucket(_bucketManager: string, name: string, schemaId:string) {
    const GRPC_URL = 'https://gnfd-testnet-fullnode-tendermint-us.bnbchain.org';
    const GREEN_CHAIN_ID = 'greenfield_5600-1';
    const client = Client.create(GRPC_URL, GREEN_CHAIN_ID);

    const [signer] = await ethers.getSigners();
    const bucketManager = BucketManager__factory.connect(_bucketManager, signer)

    const CROSS_CHAIN = await bucketManager.cross_chain();
    const crossChain = (await ethers.getContractAt('ICrossChain', CROSS_CHAIN));
    const [relayFee, ackRelayFee] = await crossChain.getRelayFees();

    const gasPrice =  10000000000n;
    const callbackGasLimit = await bucketManager.callbackGasLimit();
    const schemaBucketName = await bucketManager.getName(name,schemaId)

    const schemaDataSetBucketFlowRateLimit = ExecutorMsg.getSetBucketFlowRateLimitParams({
        bucketName:schemaBucketName,
        bucketOwner: _bucketManager,
        operator: _bucketManager,
        paymentAddress: _bucketManager,
        flowRateLimit: '100000000000000000',
    });

    const schemaExecutorData = schemaDataSetBucketFlowRateLimit[1];
    const schemaValue = 2n * relayFee + ackRelayFee + callbackGasLimit * gasPrice

    console.log('- create schema bucket', schemaBucketName);
    console.log('send crosschain tx!');
    const resp1 = await (await bucketManager.createSchemaBucket(name,schemaId, schemaExecutorData, {value: schemaValue })).wait();
    console.log(`https://testnet.bscscan.com/tx/${resp1?.hash}`);

    console.log('waiting for user bucket created..., about 1 minute');
    await sleep(60); // waiting bucket created

    const schemaBucketInfo = await client.bucket.getBucketMeta({ bucketName:schemaBucketName });
    const schemaBucketId = schemaBucketInfo.body!.GfSpGetBucketMetaResponse.Bucket.BucketInfo.Id;

    console.log('schema bucket created, bucket id', schemaBucketId);
    const schemaHexBucketId = `0x000000000000000000000000000000000000000000000000000000000000${BigInt(
        schemaBucketId
    ).toString(16)}`;
    console.log(`https://testnet.greenfieldscan.com/bucket/${schemaHexBucketId}`);
}

async function createUserPolicy(_bucketManager: string ,eoa : string) {
    const [signer] = await ethers.getSigners();
    const bucketManager = BucketManager__factory.connect(_bucketManager, signer)

    const GRPC_URL = 'https://gnfd-testnet-fullnode-tendermint-us.bnbchain.org';
    const GREEN_CHAIN_ID = 'greenfield_5600-1';
    const client = Client.create(GRPC_URL, GREEN_CHAIN_ID);
     
    const bucketName = await bucketManager.getName("",ZERO_BYTES32);
    const bucketInfo = await client.bucket.getBucketMeta({ bucketName });
    const bucketId = bucketInfo.body!.GfSpGetBucketMetaResponse.Bucket.BucketInfo.Id;

    const CROSS_CHAIN = await bucketManager.cross_chain();
    const crossChain = (await ethers.getContractAt('ICrossChain', CROSS_CHAIN));

    const [relayFee, ackRelayFee] = await crossChain.getRelayFees();
    const gasPrice =  10000000000n;
    const callbackGasLimit = await bucketManager.callbackGasLimit();

    const userValue = relayFee + ackRelayFee + callbackGasLimit * gasPrice


    const policyDataToAllowUserOperateBucket = Policy.
     encode({
        id: '0',
        resourceId: bucketId, 
        resourceType: ResourceType.RESOURCE_TYPE_BUCKET,
        statements: [
            {
                effect: Effect.EFFECT_ALLOW,
                actions: [
                    ActionType.ACTION_CREATE_OBJECT
                ], 
                resources: [],
            },
        ],
        principal: {
            type: PrincipalType.PRINCIPAL_TYPE_GNFD_ACCOUNT,
            value: eoa,
        },
    }).finish();

    const resp = await bucketManager.createUserPolicy(policyDataToAllowUserOperateBucket, { value: userValue});
    console.log(`https://testnet.bscscan.com/tx/${resp?.hash}`);
    console.log(
        `policy set success, ${eoa} could create object ${bucketName} (id: ${bucketId}) now on Greenfield`
    );
}

async function createSchemaPolicy(_bucketManager: string ,eoa : string, name: string, schemaId:string) {
    const [signer] = await ethers.getSigners();
    const bucketManager = BucketManager__factory.connect(_bucketManager, signer)

    const GRPC_URL = 'https://gnfd-testnet-fullnode-tendermint-us.bnbchain.org';
    const GREEN_CHAIN_ID = 'greenfield_5600-1';
    const client = Client.create(GRPC_URL, GREEN_CHAIN_ID);
     
    const bucketName = await bucketManager.getName(name,schemaId);
    const bucketInfo = await client.bucket.getBucketMeta({ bucketName });
    const bucketId = bucketInfo.body!.GfSpGetBucketMetaResponse.Bucket.BucketInfo.Id;

    const CROSS_CHAIN = await bucketManager.cross_chain();
    const crossChain = (await ethers.getContractAt('ICrossChain', CROSS_CHAIN));
    const [relayFee, ackRelayFee] = await crossChain.getRelayFees();

    const policyDataToAllowUserOperateBucket = Policy.
     encode({
        id: '0',
        resourceId: bucketId, 
        resourceType: ResourceType.RESOURCE_TYPE_BUCKET,
        statements: [
            {
                effect: Effect.EFFECT_ALLOW,
                actions: [
                    ActionType.ACTION_CREATE_OBJECT
                ], 
                resources: [],
            },
        ],
        principal: {
            type: PrincipalType.PRINCIPAL_TYPE_GNFD_ACCOUNT,
            value: eoa,
        },
    }).finish();

    const resp =  await bucketManager.createSchemaPolicy(name,schemaId,policyDataToAllowUserOperateBucket, { value: relayFee+ackRelayFee})
    console.log(`https://testnet.bscscan.com/tx/${resp?.hash}`);

    console.log(
        `policy set success, ${eoa} could create object ${bucketName} (id: ${bucketId}) now on Greenfield`
    );
}

async function createUserPolicyInContract(_bucketManager: string, policy: PolicyStruct) {
    const [signer] = await ethers.getSigners();
    const bucketManager = BucketManager__factory.connect(_bucketManager, signer)

    const GRPC_URL = 'https://gnfd-testnet-fullnode-tendermint-us.bnbchain.org';
    const GREEN_CHAIN_ID = 'greenfield_5600-1';
    const client = Client.create(GRPC_URL, GREEN_CHAIN_ID);
     
    const bucketName = await bucketManager.getName("",ZERO_BYTES32);
    const bucketInfo = await client.bucket.getBucketMeta({ bucketName });
    const bucketId = bucketInfo.body!.GfSpGetBucketMetaResponse.Bucket.BucketInfo.Id;

    policy.resource_id = bucketId;

    const CROSS_CHAIN = await bucketManager.cross_chain();
    const crossChain = (await ethers.getContractAt('ICrossChain', CROSS_CHAIN));

    const [relayFee, ackRelayFee] = await crossChain.getRelayFees();
    const gasPrice =  10000000000n;
    const callbackGasLimit = await bucketManager.callbackGasLimit();

    const userValue = relayFee + ackRelayFee + callbackGasLimit * gasPrice

    const resp = await bucketManager.testCreateUserPolicy(policy, { value: userValue});
    console.log(`https://testnet.bscscan.com/tx/${resp?.hash}`);
    console.log(
        `policy set success, ${policy.principal.value} could create object ${bucketName} (id: ${bucketId}) now on Greenfield`
    );
}


async function sleep(seconds: number) {
    return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}

async function getControlledManagers(_registry: string) {
    const [signer] = await ethers.getSigners();
    const registry = BucketRegistry__factory.connect(_registry,signer)

    const managers = await registry.getBucketManagers(signer.address)
    console.log(`Bucket Managers of ${signer.address} are ${managers}`)

    const registeredManagers = await registry.getRegisteredManagers()
    console.log(`Bucket Managers registered are ${registeredManagers}`)
}

async function main() {
    // const registry = await deployRegistry()
    const registry = "0x501B042B96054E3F0A79C22e1D83fb0E267aFdD4"

    // const policyLib = await deployUtilsLib()

    const factory = await deployFactory(registry,"")
    // const factory = "0x59B6A989a7c09Df1942E486aa2526C0334ab940f"

    await setFactoryAddressForRegistry(registry,factory)
    const salt = ethers.hashMessage("test-salt-aad123")

    const manager = await deployBucketManager(factory,salt)

    // await getControlledManagers(registry)
    // const manager = "0x65061Ba378351809d6dBFdB33eFD50FF43C3E2Ac"

    // const schemaId = "0xacc308075dabd756f3806f0f2a0d919d12b13597ba4791de96283aa646c2c5b5";
    // const name = "thdsssrr"
    // const eoa = "0xF7a381D4c5753775757D3445aBdc2cdFCA1b5BB4" 
    

    // await createUserBucket(manager)
    // await createUserPolicy(manager,eoa)

    const principal: PrincipalStruct =  {
        principal_type:1,
        value: "0x65061Ba378351809d6dBFdB33eFD50FF43C3E2Ac"
    }

    const statement:StatementStruct = {
        effect: Effect.EFFECT_ALLOW,
        actions: [
            ActionType.ACTION_CREATE_OBJECT
        ], 
        resources: [],
        expiration_time: {
            _seconds:0,
            nanos:0
        },
        limit_size: {value:0}
    }
    
    const policy:PolicyStruct = {
        id: "0",
        resource_id: "127", 
        resource_type: ResourceType.RESOURCE_TYPE_BUCKET,
        statements: [statement],
        principal: principal,
        expiration_time: {
            _seconds:0,
            nanos:0
        }
    }
    // await createUserPolicyInContract(manager,policy)

    // await createSchemaBucket(manager,name,schemaId)
    // await createSchemaPolicy(manager,eoa,name,schemaId)
  }
  // We recommend this pattern to be able to use async/await everywhere
  // and properly handle errors.
  main().catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });