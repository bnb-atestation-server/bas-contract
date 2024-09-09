import  {ethers} from "hardhat";
import {Common__factory} from  "../../typechain-types/factories/contracts/bucket/Common__factory";
import {StatementStruct,PrincipalStruct,PolicyStruct} from "../../typechain-types/contracts/bucket/Common"
import { ResourceType } from '@bnb-chain/greenfield-cosmos-types/greenfield/resource/types';
import { ActionType, Effect, PrincipalType } from "@bnb-chain/greenfield-cosmos-types/greenfield/permission/common"



async function deploy() {
    const [signer] = await ethers.getSigners();
    console.log('Deploy bucket registry contract with account:',signer.address);

    const Common =  await ethers.getContractFactory("Common",signer);
    const common = await Common.deploy();
    await common.waitForDeployment();
    const addr = await common.getAddress();
    console.log('Common Address:', addr)
    return addr
}

async function encodePrinciple(addr:string,principal:PrincipalStruct) {  
    const [signer] = await ethers.getSigners();
    const common = Common__factory.connect(addr,signer)
    const _data = await common.encodePrinciple(principal);
    console.log(`encode of principle is ${_data}`);
}

async function encodeStatement(addr:string, statement:StatementStruct) {
    const [signer] = await ethers.getSigners();
    const common = Common__factory.connect(addr,signer)
    const _data = await common.encodeStatement(statement);
    console.log(`encode of statement is ${_data}`);
}

async function encodePolicy(addr:string,policy:PolicyStruct) {
    const [signer] = await ethers.getSigners();
    const common = Common__factory.connect(addr,signer) 
    const _data = await common.encodePolicy(policy);
    console.log(`encode of policy is ${_data}`);
}

async function main() {
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
            _seconds:1725530201,
            nanos:0
        },
        limit_size: {value:100_000_000}
    }

    const policy:PolicyStruct = {
        id: "0",
        resource_id: "127", 
        resource_type: ResourceType.RESOURCE_TYPE_BUCKET,
        statements: [statement],
        principal: principal,
        expiration_time: {
            _seconds:10,
            nanos:0
        }
    }

    const addr = await deploy()
    // const addr = "0x5c63c2E7Ce27575444307B9b79DE7557FC03E809"
    await encodePrinciple(addr,principal)
    await encodeStatement(addr,statement)
    await encodePolicy(addr,policy)

}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });