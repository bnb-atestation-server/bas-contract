import  {ethers,upgrades} from "hardhat";
import { ExecutorMsg } from '@bnb-chain/bsc-cross-greenfield-sdk';
import { Policy } from '@bnb-chain/greenfield-cosmos-types/greenfield/permission/types';
import { Client } from '@bnb-chain/greenfield-js-sdk';
import { ResourceType } from '@bnb-chain/greenfield-cosmos-types/greenfield/resource/types';
import {BucketRegistry__factory} from  "../../typechain-types/factories/contracts/bucket";
import {BucketFactory__factory} from  "../../typechain-types/factories/contracts/bucket/BucketFactory.sol";
import {BucketManager__factory} from  "../../typechain-types/factories/contracts/bucket/BucketManager.sol";

import {
   ActionType,
   Effect,
   PrincipalType,
} from '@bnb-chain/greenfield-cosmos-types/greenfield/permission/common';
import { ZERO_BYTES32 } from "../utils";
import { zeroPadBytes } from "ethers";

const callbackGasLimit = 200000n
const failureHandleStrategy = 2
const sp_address = "0x1eb29708f59f23fe33d6f1cd3d54f07636ff466a"

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

async function deployFactory(bucketRegistry: string) {
    //bsc testnet
    // const TOKEN_HUB = "0xED8e5C546F84442219A5a987EE1D820698528E04";
    // const CROSS_CHAIN = "0xa5B2c9194131A4E0BFaCbF9E5D6722c873159cb7";
    // const BUCKET_HUB = "0x5BB17A87D03620b313C39C24029C94cB5714814A";
    // const PERMISSION_HUB = "0x25E1eeDb5CaBf288210B132321FBB2d90b4174ad";
    // const SP_ADDRESS_TESTNET = "0x5FFf5A6c94b182fB965B40C7B9F30199b969eD2f";
    // const GREENFIELD_EXECUTOR = "0x3E3180883308e8B4946C9a485F8d91F8b15dC48e";
    // const SCHEMA_REGISTRY = "0x08C8b8417313fF130526862f90cd822B55002D72"

    //opbnb testnet
    const TOKEN_HUB = "0x59614C9e9B5Df6dF4dc9e457cc7F3a67D796d3b2";
    const CROSS_CHAIN = "0xF0Bcf6E4F72bCB33b944275dd5c9d4540a259eB9";
    const BUCKET_HUB = "0xCAB5728B7cc21D0056E237D371b28efEEBFd8C2d";
    const PERMISSION_HUB = "0x089e97333da0B4260131068b7492D10fbEeC67BC";
    const SP_ADDRESS_TESTNET = "0x5FFf5A6c94b182fB965B40C7B9F30199b969eD2f";
    const GREENFIELD_EXECUTOR = "0x4bF975A172793FbcFff30Ffe5b3141A5C5aeBE52";
    const SCHEMA_REGISTRY = "0x9676dC3469B70f67f8968A832C9ef7eDE3C1AB45"

    //bsc mainnet
    // const TOKEN_HUB = "0xeA97dF87E6c7F68C9f95A69dA79E19B834823F25";
    // const CROSS_CHAIN = "0x77e719b714be09F70D484AB81F70D02B0E182f7d";
    // const BUCKET_HUB = "0xE909754263572F71bc6aFAc837646A93f5818573";
    // const PERMISSION_HUB = "0xe1776006dBE9B60d9eA38C0dDb80b41f2657acE8";
    // const SP_ADDRESS_TESTNET = "0x5FFf5A6c94b182fB965B40C7B9F30199b969eD2f";
    // const GREENFIELD_EXECUTOR = "0xFa39D9111D927836b14D071d43e0aAD9cE83bBBf";
    // const SCHEMA_REGISTRY = "0x5e905F77f59491F03eBB78c204986aaDEB0C6bDa"


    //opbnb mainnet
    // const TOKEN_HUB = "0x723987D45BA424D562b087eE032b8C27F2E7b689";
    // const CROSS_CHAIN = "0x7E376AEFAF05E20e3eB5Ee5c08fE1B9832b175cE";
    // const BUCKET_HUB = "0xDbf8aEcB0F697A5c71baA0C1470Ba8D7f0395018";
    // const PERMISSION_HUB = "0x979876507F1395E5D391F9Dbef68468a22162B8D";
    // const SP_ADDRESS_TESTNET = "0x5FFf5A6c94b182fB965B40C7B9F30199b969eD2f";
    // const GREENFIELD_EXECUTOR = "0xdFc5DC31bfbf992C19C171db273A028736322Ec4";
    // const SCHEMA_REGISTRY = "0x65CFBDf1EA0ACb7492Ecc1610cfBf79665DC631B"


    const [signer] = await ethers.getSigners();
    const Factory =  await ethers.getContractFactory("BucketFactory",signer);

    const factory = await upgrades.deployProxy(Factory,[
        bucketRegistry,
        SCHEMA_REGISTRY,
        TOKEN_HUB,
        CROSS_CHAIN,
        BUCKET_HUB,
        PERMISSION_HUB,
        GREENFIELD_EXECUTOR,
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

    const transferOutAmt = ethers.parseEther('0.001');

    const _bucketManager = await factory.getManagerAddress(salt);
    console.log("deploy manager:", _bucketManager)

    const value = transferOutAmt + relayFee + ackRelayFee;

    const resp = await factory.deploy(transferOutAmt,salt,{value});
    console.log(`create bucket manager contract in tx ${resp.hash}`);
    await resp.wait();
    return _bucketManager
}

async function createBucket(_bucketManager: string, name: string, schemaId:string) {
    const GRPC_URL = 'https://gnfd-testnet-fullnode-tendermint-us.bnbchain.org';
    const GREEN_CHAIN_ID = 'greenfield_5600-1';
    const client = Client.create(GRPC_URL, GREEN_CHAIN_ID);

    const [signer] = await ethers.getSigners();
    const bucketManager = BucketManager__factory.connect(_bucketManager, signer)

    const CROSS_CHAIN = await bucketManager.cross_chain();
    const crossChain = (await ethers.getContractAt('ICrossChain', CROSS_CHAIN));
    const [relayFee, ackRelayFee] = await crossChain.getRelayFees();

    const gasPrice =  10_000_000_000n;
    const bucketName = await bucketManager.getName(name,schemaId)

    const dataSetBucketFlowRateLimit = ExecutorMsg.getSetBucketFlowRateLimitParams({
        bucketName:bucketName,
        bucketOwner: _bucketManager,
        operator: _bucketManager,
        paymentAddress: _bucketManager,
        flowRateLimit: '100000000000000000',
    });

    const executorData = dataSetBucketFlowRateLimit[1];
    const value = 2n * relayFee + ackRelayFee + callbackGasLimit * gasPrice

    console.log('- create bucket', bucketName);
    console.log('send crosschain tx!');
    const resp1 = await (await bucketManager.createBucket(
        name,
        schemaId, 
        executorData, 
        callbackGasLimit,
        failureHandleStrategy,
        sp_address,
        {value: value })).wait();
    console.log(`https://testnet.bscscan.com/tx/${resp1?.hash}`);

    console.log('waiting for bucket created..., about 1 minute');
    await sleep(60); // waiting bucket created

    const schemaBucketInfo = await client.bucket.getBucketMeta({ bucketName:bucketName });
    const schemaBucketId = schemaBucketInfo.body!.GfSpGetBucketMetaResponse.Bucket.BucketInfo.Id;

    console.log('bucket created, bucket id', schemaBucketId);
    const schemaHexBucketId = `0x000000000000000000000000000000000000000000000000000000000000${BigInt(
        schemaBucketId
    ).toString(16)}`;
    console.log(`https://testnet.greenfieldscan.com/bucket/${schemaHexBucketId}`);
}

async function getBucketStatus(_bucketManager: string, name: string, schemaId:string) {
    const [signer] = await ethers.getSigners();
    const bucketManager = BucketManager__factory.connect(_bucketManager, signer)
    const status = await bucketManager.getBucketStatus(schemaId,name)
    const bucketName = await bucketManager.getName(name,schemaId)
    console.log(`Status of bucket ${bucketName} is ${status}`)
}

async function getBucketId(_bucketManager: string,_registry: string,name: string, schemaId:string) {
    const [signer] = await ethers.getSigners();
    const bucketManager = BucketManager__factory.connect(_bucketManager, signer)
    const userBucketName = await bucketManager.getName(name,schemaId);
    const registry = BucketRegistry__factory.connect(_registry,signer)

    const id = await registry.bucketsNames(userBucketName)
    console.log(`ID of bucket ${userBucketName} is ${id}`)
}


async function createPolicy(_bucketManager: string ,eoa : string, name: string, schemaId:string) {
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

    const gasPrice =  10_000_000_000n;
    const value = relayFee + ackRelayFee + callbackGasLimit * gasPrice

    const policyDataToAllowUserOperateBucket = Policy.
     encode({
        id: '0',
        resourceId: bucketId, 
        resourceType: ResourceType.RESOURCE_TYPE_BUCKET,
        statements: [
            {
                effect: Effect.EFFECT_ALLOW,
                actions: [
                    ActionType.ACTION_CREATE_OBJECT,
                    ActionType.ACTION_GET_OBJECT,
                    ActionType.ACTION_LIST_OBJECT
                ], 
                resources: [],
            },
        ],
        principal: {
            type: PrincipalType.PRINCIPAL_TYPE_GNFD_ACCOUNT,
            value: eoa,
        },
    }).finish();

    const resp =  await bucketManager.createPolicy(
        name,
        schemaId,
        policyDataToAllowUserOperateBucket,
        callbackGasLimit,
        failureHandleStrategy,
        {value})
    console.log(`https://testnet.bscscan.com/tx/${resp?.hash}`);

    console.log(
        `policy set success, ${eoa} could create object ${bucketName} (id: ${bucketId}) now on Greenfield`
    );
    return ethers.keccak256(policyDataToAllowUserOperateBucket)
}


async function getPolicyStatus(_bucketManager: string, _hash :string) {
    const [signer] = await ethers.getSigners();
    const bucketManager = BucketManager__factory.connect(_bucketManager, signer)

    const status = await bucketManager.getPolicyStatus(_hash)
    console.log(`Status of Policy ${_hash} is ${status}`)
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

async function topUpBNB(_bucketManager:string) {
    const GRPC_URL = 'https://gnfd-testnet-fullnode-tendermint-us.bnbchain.org';
    const GREEN_CHAIN_ID = 'greenfield_5600-1';
    const client = Client.create(GRPC_URL, GREEN_CHAIN_ID);

    const [signer] = await ethers.getSigners();
    const bucketManager = BucketManager__factory.connect(_bucketManager, signer)

    const CROSS_CHAIN = await bucketManager.cross_chain();
    const crossChain = (await ethers.getContractAt('ICrossChain', CROSS_CHAIN));

    console.log(`cross chain ${CROSS_CHAIN}`)
    const [relayFee, ackRelayFee] = await crossChain.getRelayFees();


    const tokenHub = await bucketManager.tokenHub()
    console.log(`token hub ${tokenHub}`)

    



    const value = relayFee + ackRelayFee  + 100n
    const status = await bucketManager.topUpBNB(100,{value})
    console.log(`top up is at tx ${status}`)
}

async function main() {
    // const registry = await deployRegistry()
    // const factory = await deployFactory(registry)
    // await setFactoryAddressForRegistry(registry,factory)

    // const salt = ethers.hashMessage("liubo5")
    // const manager = await deployBucketManager(factory,salt)

    // await getControlledManagers(registry)
    // await sleep(60)


    await topUpBNB("0x87187c6eEF1D00145ea9f52c06C5bAC8CE50e9a3")

    // const registry = "0x69898E314B671357b74DCC4b14469F588884e10e"
    // const factory = "0xF46574d4B5AfbA81234CD04eFb24411798D7CE90"
    // const manager = "0x7af5fE11F2bAd13cFd659f5F7D9baF8c7d09d22B"

    

    // const schemaId = "0xacc308075dabd756f3806f0f2a0d919d12b13597ba4791de96283aa646c2c5b5";
    // const name = "bascan"  
    // const eoa = '0x471543A3bd04486008c8a38c5C00543B73F1769e'

    // user bucket 
    // await createBucket(manager,name,ZERO_BYTES32)
    // await getBucketStatus(manager,name,ZERO_BYTES32)
    // await getBucketId(manager,registry,name,ZERO_BYTES32)
    // await sleep(60)
    // const policyHash1 = await createPolicy(manager,eoa,name,ZERO_BYTES32)
    // await getPolicyStatus(manager,"0x2aee815d88bff1a64f6c6e5df3350f4ae1165d0a62e73e2290394dd0e9ef8815")

    // //schema bucket
    // await createBucket(manager,name,schemaId)
    // await getBucketStatus(manager,name,schemaId)
    // await getBucketId(manager,registry,name,schemaId)
    // const policyHash2 = await createPolicy(manager,eoa,name,schemaId)
    // await sleep(60)
    // await getPolicyStatus(manager,"0x26992e8422ce91e00399382ffb97c55f4a55d042190a6a1ed2ccda70cb689f25")
    
  }
  // We recommend this pattern to be able to use async/await everywhere
  // and properly handle errors.
  main().catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });