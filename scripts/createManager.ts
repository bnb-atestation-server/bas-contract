import  {ethers,upgrades} from "hardhat";
import {
    deployFactory,
    setFactoryAddressForRegistry,
    deployBucketManager,
    createBucket,
    getBucketStatus,
    createPolicy,
    transferOwnership,
    getPolicyStatus,
    getControlledManagers,
    hashPolicy,
    ownership,
    getManagerAmount
}from "./bucket/deploy"
import  {SCHEMAS,getSchemaUID,NO_EXPIRATION,ZERO_BYTES32,EIP712_BNB_DOMAIN_NAME} from "./utils";
import { boolean } from "hardhat/internal/core/params/argumentTypes";

const registry = "0x08C8b8417313fF130526862f90cd822B55002D72"
const bas = "0x6c2270298b1e6046898a322acB3Cbad6F99f7CBD"
const bucketRegistry = "0x7540304c2C017f6441b5425f4d5E4B70e21171E8"
const factory = "0x660cD00a374101F14A7A8209682f35922bC51672"
const passport = "0x63e7C33db44F3a14d27fd3E42B88FD8Cf6a5c953"
 const name = "bascan"

async function sleep(seconds: number) {
    return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}


async function getBucketResult(manager:string, name:string) {
    var result = 3n
    do {
        result = await getBucketStatus(manager,name,ZERO_BYTES32)
        if (result == 1n) {
           return true
        } else if (result == 2n) {
           return false
        } 
        sleep(15)
    }
    while(result == 3n|| result == 0n)
}


async function createBucketLoop(manager:string,name:string) {
    var result = false
    do {
        await createBucket(manager,name,ZERO_BYTES32)
        result = await getBucketResult(manager,name) as boolean
    } while(result)
}

async function getPolicyResult(manager:string, policyHash:string) {
    var result = 3n
    do {
        result = await getPolicyStatus(manager,policyHash)
        if (result == 1n) {
           return true
        } else if (result == 2n) {
           return false
        } 
        sleep(15)
    } while(result == 3n || result == 0n)
}

async function createPolicyLoop(manager:string,to:string,name:string) {
    var result = false
    do {
        const policyHash1 = await createPolicy(manager,to,name,ZERO_BYTES32)
        result = await getPolicyResult(manager,policyHash1) as boolean
    } while(!result)
}

async function addManger() {
    const [signer] = await ethers.getSigners();
    
    const amount = await getManagerAmount(bucketRegistry,passport)
    console.log("current manager amount is", amount)

    //todo: 15参数配进来
    while (1) {
        const salt =  ethers.randomBytes(32)
        const manager = await deployBucketManager(factory,salt,"0.0005")
        await createBucketLoop(manager,name)
        await createPolicyLoop(manager,signer.address,name)
        await transferOwnership(manager,passport)
        console.log("add manager:", manager)
    }
}

async function main() {
    // while(1) {
    //     try {
    //         await addManger()
    //     } catch(e){
    //         sleep(300)
    //         console.error(e)
    //     }
    //     sleep(300)
    // }
    const managers = [
        "0x347b071C3934D070E85DE958dad78BeA5dD3C6d4",
        "0x725f586785aB077093a15AD498B33970e2004Afc",
        "0xC00Fa526EAF2565Eed7d7139dd264107f191807c",
        "0xF2316B01a9F5610FC67274fbc07F1c0801e096A3",
        "0x506d702dC4D4B3Dfc75E80f7A17392EA77588c49",
    ]
    for (let manager of managers) {
        console.log("start create policy: ",manager)
        await createPolicyLoop(manager,"0x471543A3bd04486008c8a38c5C00543B73F1769e",name)
        await transferOwnership(manager,passport)
        console.log("add manager:", manager)
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });


