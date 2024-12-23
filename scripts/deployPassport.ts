import  {ethers,upgrades} from "hardhat";
import  {AttestorResolver__factory} from "../typechain-types/factories/contracts/resolver/AttestorResolver__factory"
import  {Passport__factory} from "../typechain-types/factories/contracts/Passport.sol"
import {EIP712Proxy__factory} from "../typechain-types/factories/contracts/eip712/proxy/EIP712Proxy__factory"
import {AttestationRequestStruct} from "../typechain-types/contracts/Passport.sol/Passport"
import {DelegatedProxyAttestationRequestStruct,SignatureStruct,AttestationRequestDataStruct} from "../typechain-types/contracts/eip712/proxy/EIP712Proxy"
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
    ownership
}from "./bucket/deploy"



import  {SCHEMAS,getSchemaUID,NO_EXPIRATION,ZERO_BYTES32,EIP712_BNB_DOMAIN_NAME} from "./utils";
import { AbiCoder }  from "ethers";

import initSchema from "./3-initSchema";
import deployRegistry from "./1-registrySchema";
import deployEAS from "./2-eas";

async function getVerifierDomain(verifierAddr:string) {
    const [signer] = await ethers.getSigners();
    const verifier =  EIP712Proxy__factory.connect(verifierAddr, signer);
    const domain = await verifier.eip712Domain()
    console.log(`domain is ${domain}`)
    
}

async function verify(verifierAddr:string,req: DelegatedProxyAttestationRequestStruct) {
    const [signer] = await ethers.getSigners();
    const verifier =  EIP712Proxy__factory.connect(verifierAddr, signer);

    const resp = await verifier.verifyAttestation(req)
    console.log(`verify result is ${resp}`)
}

async function upgradePassport(passportAddr:string) {
    const [signer] = await ethers.getSigners();
    const Passport =  await ethers.getContractFactory("Passport",signer);
    const resp = await upgrades.upgradeProxy(passportAddr, Passport)
    resp.waitForDeployment()
    console.log(`upgrade passport at tx ${resp.hash}`)

}

async function mintPassport(passportAddr:string,schemaId :string,to:string,revocable:boolean,createBucketFee:bigint,attestationType:bigint,invite_code: bigint) {
    const [signer] = await ethers.getSigners();
    const passport = Passport__factory.connect(passportAddr,signer)


    const attestationRequest: AttestationRequestStruct = {
        schema:schemaId,
        data:{
            recipient:to,
            expirationTime:NO_EXPIRATION,
            revocable,
            refUID:ZERO_BYTES32,
            data:AbiCoder.defaultAbiCoder().encode(['bool'], [true]),
            value:0
        }
    }
    const resp = await passport.mintPassport(attestationRequest,attestationType,invite_code,{value: createBucketFee});
    resp.wait()
    console.log(`mint passport at tx ${resp.hash}`)
}

async function getPassportInfo(passportAddr:string) {
    const [signer] = await ethers.getSigners();
    const passport = Passport__factory.connect(passportAddr,signer)
    const createBucketFee = await passport.createBucketFee()
    const bank = await passport.bank()
    console.log(`create bucket fee: ${createBucketFee}, bank balance: ${bank}`)
}

async function deployVerifier(bas: string, name: string) {
    const [signer] = await ethers.getSigners()
    const EIP712 = await ethers.getContractFactory("EIP712Proxy",signer)
    const eip712 = await EIP712.deploy(bas,name)
    await eip712.waitForDeployment()
    const addr = await eip712.getAddress()
    console.log('Verifier Contract Address:', addr)
    return addr
}

async function deployPassport(bas:string,createBucketFee: bigint,passportSchema:string, verifier: string,factoryAddr: string) {
    const [signer] = await ethers.getSigners()
    const Passport = await ethers.getContractFactory("Passport",signer)
    const passport = await upgrades.deployProxy(Passport,[
        bas,createBucketFee,passportSchema,verifier,factoryAddr
    ])
    await passport.waitForDeployment()
    const addr = await passport.getAddress()
    console.log('Passport Contract Address:', addr)
    return addr
}

async function deployAttestorResolver(bas:string,attestor:string) {
    const [signer] = await ethers.getSigners();
    // console.log('Deploy point contract with account:',signer.address);

    const Resolver =  await ethers.getContractFactory("AttestorResolver",signer);
    const resolver = await upgrades.deployProxy(Resolver,[
       bas,attestor
    ]);
    await resolver.waitForDeployment();
    const addr = await resolver.getAddress();
    console.log('Point Resolver Contract Address:', addr)
    return addr
}

async function setMintFee(passportAddr : string,taskSchemaIds:string[],mintFees: bigint[],attestors: string[]) {
    const [signer] = await ethers.getSigners();

    const passport = Passport__factory.connect(passportAddr,signer)
    const resp = await passport.setMintFees(taskSchemaIds,mintFees,attestors)
    await resp.wait()
    console.log(`set mint fee in tx ${resp.hash}`);
}

async function setInviteCode(passportAddr : string,inviteCodes:bigint[],discounts: bigint[]) {
    const [signer] = await ethers.getSigners();

    const passport = Passport__factory.connect(passportAddr,signer)
    const resp = await passport.setInviteCode(inviteCodes,discounts)
    await resp.wait()
    console.log(`set invite code in tx ${resp.hash}`);
}

async function setPassportSchema(passportAddr : string,schemaId:string) {
    const [signer] = await ethers.getSigners();
    // console.log('Update Task Point with account:',signer.address);
    const passport = Passport__factory.connect(passportAddr,signer)
    const resp = await passport.setPassport(schemaId)
    await resp.wait()
    console.log(`set passport schema in tx ${resp.hash}`);
}

function getSchemaIdAndPoint(resolver: string) {
    var schemaIds = new Array()
    var points = new Array()
    var validators = new Array()
    for (const {schema,point,validator} of SCHEMAS) {
        schemaIds.push(getSchemaUID(schema,resolver,true))
        points.push(BigInt(point))
        validators.push(validator)
    }
    return [schemaIds, points,validators]
}

async function updateResolverAttestor(resolverAddr: string, validateAttestor: string) {
    const [signer] = await ethers.getSigners();
    const resolver = AttestorResolver__factory.connect(resolverAddr,signer)
    const resp = await resolver.updateTargetAttester(validateAttestor)
    resp.wait()
    console.log(`update target attestor to ${validateAttestor} in tx ${resp.hash}`);
}
// function validInviteCode(passportAddr:string, invite_code: bigint) {
//     const [signer] = await ethers.getSigners();
//     // console.log('Update Task Point with account:',signer.address);
//     const passport = Passport__factory.connect(passportAddr,signer)
//     passport.
// }

async function sleep(seconds: number) {
    return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}


async function main() {
    const [signer] = await ethers.getSigners();

    //localhost
    // const registry = await deployRegistry()
    // const bas = await deployEAS(registry)
    // const createBucketFee = 1000n

    // const verifier = await deployVerifier(bas,EIP712_BNB_DOMAIN_NAME)

    // const passport = await deployPassport(bas,createBucketFee,ZERO_BYTES32,verifier)

    // const resolver = await deployAttestorResolver(bas,passport)
    // await initSchema(registry,resolver,true)

    // const [schemaIds, points, validator] = getSchemaIdAndPoint(resolver)
    // await setPassportSchema(passport,schemaIds[0])

    // const invite_codes  = [1n,2n]
    // await setInviteCode(passport,invite_codes,[3n,6n])

    


    //bsc testnet
    console.log('Deploy contract with account:',signer.address);
    
    const registry = "0x08C8b8417313fF130526862f90cd822B55002D72"
    const bas = "0x6c2270298b1e6046898a322acB3Cbad6F99f7CBD"
    const bucketRegistry = "0x7540304c2C017f6441b5425f4d5E4B70e21171E8"

    // const factory = await deployFactory(bucketRegistry)
    const factory = "0x660cD00a374101F14A7A8209682f35922bC51672"

    // await setFactoryAddressForRegistry(bucketRegistry,factory)

    const createBucketFee = 1000n

    // const verifier = await deployVerifier(bas,EIP712_BNB_DOMAIN_NAME)
    const verifier = "0x14Cd63ff4501fdE53647b81519916cc52456a31B"

    // const passport = await deployPassport(bas,createBucketFee,ZERO_BYTES32,verifier,bucketRegistry)
    const passport = "0x63e7C33db44F3a14d27fd3E42B88FD8Cf6a5c953"

    // const resolver = await deployAttestorResolver(bas,passport)
    const resolver = "0xfBcc5d0a58a866c66a4523f6369dd16DFE658236"
    // await initSchema(registry,resolver,true)

    const [schemaIds, points, validator] = getSchemaIdAndPoint(resolver)
    // await setPassportSchema(passport,schemaIds[0])

    const invite_codes  = [1n,2n]
    // await setInviteCode(passport,invite_codes,[3n,6n])

    const salt = ethers.hashMessage("12")
    const name = "bascan"

    // const manager = await deployBucketManager(factory,salt,"0.001")
    const manager = "0xA74fB86836BE2822a95Cf6cC39b5Dbba06f1FCfC"
    // await createBucket(manager,name,ZERO_BYTES32)
     // await sleep(60)
    // await getBucketStatus(manager,name,ZERO_BYTES32)
   
    // const policyHash1 = await createPolicy(manager,signer.address,name,ZERO_BYTES32)
    // await sleep(60)
    // const policyHash1 = await hashPolicy(manager,signer.address,name,ZERO_BYTES32)
    // await getPolicyStatus(manager,policyHash1)
    
    // await transferOwnership(manager,passport)
    await ownership(manager)
    // await getControlledManagers(bucketRegistry,passport)

    await upgradePassport(passport)
    // sleep(240)
    // await updateResolverAttestor(resolver,passport)
    // sleep(240)

    // await mintPassport(passport,schemaIds[0],signer.address,false,createBucketFee,1n,invite_codes[0])

    // await getVerifierDomain(verifier)
    // const req: DelegatedProxyAttestationRequestStruct = {
    //     schema: "0x99d156b98024cb8cc4c9ec0dce649a1973c9365c284341e940f082a3b5ca7e50",
    //       data: {
    //         recipient: "0x471543A3bd04486008c8a38c5C00543B73F1769e",
    //         expirationTime: 0,
    //         revocable: false,
    //         refUID: "0x0000000000000000000000000000000000000000000000000000000000000000",
    //         data: "0x0000000000000000000000000000000000000000000000000000000000000001",
    //         value: 0
    //       },
    //       signature: {
    //         v: 28,
    //         r: "0x8d1b9964f7af57d009452d2baf355ff78ebccb5cb88353a97332e217dc624870",
    //         s: "0x1400237f5a2340aec25c4fa455d330145ffc4c3ef2895987ccecf81c65e60b7d"
    //       },
    //       attester: "0x471543A3bd04486008c8a38c5C00543B73F1769e",
    //       deadline: 1734953580
    // }
    // await verify(verifier,req)
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });


