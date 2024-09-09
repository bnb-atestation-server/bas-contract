import  {ethers as hardhat} from "hardhat";
import { Policy } from '@bnb-chain/greenfield-cosmos-types/greenfield/permission/types';
import { ResourceType } from '@bnb-chain/greenfield-cosmos-types/greenfield/resource/types';


import {
    ActionType,
    Effect,
    PrincipalType,
 } from '@bnb-chain/greenfield-cosmos-types/greenfield/permission/common';


async function deploy() {
    const TOKEN_HUB = "0xED8e5C546F84442219A5a987EE1D820698528E04";
    const CROSS_CHAIN = "0xa5B2c9194131A4E0BFaCbF9E5D6722c873159cb7";
    const BUCKET_HUB = "0x5BB17A87D03620b313C39C24029C94cB5714814A";
    const PERMISSION_HUB = "0x25E1eeDb5CaBf288210B132321FBB2d90b4174ad";
    const SP_ADDRESS_TESTNET = "0x5FFf5A6c94b182fB965B40C7B9F30199b969eD2f";
    const GREENFIELD_EXECUTOR = "0x3E3180883308e8B4946C9a485F8d91F8b15dC48e";
    const SCHEMA_REGISTRY = "0x08C8b8417313fF130526862f90cd822B55002D72"

    const callbackGasLimit = 1000000000n
    const failureHandleStrategy = 2


    const [signer] = await hardhat.getSigners();
    const Manager =  await hardhat.getContractFactory("BucketManager",signer);


    const manager = await Manager.deploy(
        signer.address,
        SCHEMA_REGISTRY,
        SCHEMA_REGISTRY,
        TOKEN_HUB,
        CROSS_CHAIN,
        BUCKET_HUB,
        PERMISSION_HUB,
        SP_ADDRESS_TESTNET,
        GREENFIELD_EXECUTOR,
        callbackGasLimit,
        failureHandleStrategy,
        "1.0.0"
    )

    await manager.waitForDeployment()
    const addr = await manager.getAddress();
    console.log('Bucket Manager Address:', addr)

    const policyDataToAllowUserOperateBucket = Policy.
     encode({
        id: '0',
        resourceId: "100000000000000000000", 
        resourceType: ResourceType.RESOURCE_TYPE_BUCKET,
        statements: [
            {
                effect: Effect.EFFECT_ALLOW,
                actions: [
                    ActionType.ACTION_CREATE_OBJECT,
                    ActionType.ACTION_CREATE_OBJECT,
                    ActionType.ACTION_CREATE_OBJECT,
                    ActionType.ACTION_CREATE_OBJECT,
                    ActionType.ACTION_CREATE_OBJECT,
                    ActionType.ACTION_CREATE_OBJECT,
                    ActionType.ACTION_CREATE_OBJECT,
                    ActionType.ACTION_CREATE_OBJECT,
                    ActionType.ACTION_CREATE_OBJECT,
                    ActionType.ACTION_CREATE_OBJECT,
                    ActionType.ACTION_CREATE_OBJECT,
                    ActionType.ACTION_CREATE_OBJECT
                ], 
                resources: [
                    "asdfasdfasdfasdfasdfadsfasdfadsfa",
                    "asdfadsfasdfasdfasdfadsfasdfasdfa",
                    "asdfadsfasdfasdfasdfadsfasdfasdfa",
                    "asdfadsfasdfasdfasdfadsfasdfasdfa",
                    "asdfadsfasdfasdfasdfadsfasdfasdfa",
                    "asdfadsfasdfasdfasdfadsfasdfasdfa",
                    "asdfadsfasdfasdfasdfadsfasdfasdfa",
                    "asdfadsfasdfasdfasdfadsfasdfasdfa"
                ],
            },
        ],
        principal: {
            type: PrincipalType.PRINCIPAL_TYPE_GNFD_ACCOUNT,
            value: signer.address,
        },
    }).finish();

    const encoder = hardhat.AbiCoder.defaultAbiCoder();
    const encodedData = encoder.encode(
        ["string", "bytes32", "bytes"],
        ["asdfas", "0xacc308075dabd756f3806f0f2a0d919d12b13597ba4791de96283aa646c2c5b5", policyDataToAllowUserOperateBucket]
    );
    const resp = await manager.greenfieldCall(
        0n,
        7n,
        2n,
        0,
        encodedData
    )
   const provider =  hardhat.provider
   console.log(provider.estimateGas(resp))
}



async function main() {
    await deploy()

  }
  // We recommend this pattern to be able to use async/await everywhere
  // and properly handle errors.
  main().catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });