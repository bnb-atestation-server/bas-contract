import  {ethers,upgrades} from "hardhat";
import  {BASPoint__factory } from "../typechain-types/factories/contracts/BAS.sol";
import  {PointReleaseResolver__factory } from "../typechain-types/factories/contracts/resolver/PointReleaseResolver.sol";
import  {SCHEMAS,getSchemaUID,NO_EXPIRATION,ZERO_BYTES32} from "./utils";
import initSchema from "./3-initSchema";
import initSchemaName from "./4-initName";
import { bigint } from "hardhat/internal/core/params/argumentTypes";

async function deployERC20Point() {
    const [signer] = await ethers.getSigners();
    console.log('Deploy Point ERC20 contract with account:',signer.address);

    const Point = await ethers.getContractFactory("BASPoint",signer)
    const point = await Point.deploy()

    await point.waitForDeployment();
    const addr = await point.getAddress();
    console.log('BAS ETC20 Point Contract Address:', addr)

    const decimals:bigint = await point.decimals()
    return [decimals,addr]

}

async function deployBalanceResolver(faucet:string,point:string,eas:string, balanceDownBound: bigint[], taskSchemaIds:string[],taskPoints: bigint[] ){
    const [signer] = await ethers.getSigners();
    console.log('Deploy balance contract with account:',signer.address);

    const Resolver =  await ethers.getContractFactory("PointReleaseResolver",signer);
    const resolver = await upgrades.deployProxy(Resolver,[
        faucet,
        point,
        eas,
        taskSchemaIds,
        taskPoints,
        balanceDownBound
    ]);
    await resolver.waitForDeployment();
    const addr = await resolver.getAddress();
    console.log('Balance Resolver Contract Address:', addr)
    return addr
}

async function deployPointResolver(indexer:string, faucet:string,point:string,bas:string, validAttestor: string[], taskSchemaIds:string[],taskPoints: bigint[] ) {
    const [signer] = await ethers.getSigners();
    console.log('Deploy point contract with account:',signer.address);

    const Resolver =  await ethers.getContractFactory("PointReleaseResolver",signer);
    const resolver = await upgrades.deployProxy(Resolver,[
        faucet,
        point,
        bas,
        indexer,
        validAttestor,
        taskSchemaIds,
        taskPoints
    ]);
    await resolver.waitForDeployment();
    const addr = await resolver.getAddress();
    console.log('Point Resolver Contract Address:', addr)
    return addr
}

async function updateTaskPoint(resolverAddr : string, taskSchemaIds:string[],taskPoints: bigint[]) {
    const [signer] = await ethers.getSigners();
    console.log('Update Task Point with account:',signer.address);

    const resolver = PointReleaseResolver__factory.connect(resolverAddr,signer)
    const resp = await resolver.updateTaskPoint(taskSchemaIds,taskPoints)
    await resp.wait()
    console.log(`update task point in tx ${resp.hash}`);
}

async function approveToResolver(pointResolver:string, ercPoint:string, value: bigint) {
    const [signer] = await ethers.getSigners();
    const point = BASPoint__factory.connect(ercPoint,signer)
    const resp = await point.approve(pointResolver,value)
    await resp.wait()
    console.log(`approve ${value} BAS point to ${pointResolver} in tx ${resp.hash}`);
}

function getSchemaIdAndPoint(decimals:bigint,resolver: string) {
    var schemaIds = new Array()
    var points = new Array()
    for (const {schema,point} of SCHEMAS) {
        schemaIds.push(getSchemaUID(schema,resolver,true))
        points.push(BigInt(point) * 10n ** decimals)
    }
    return [schemaIds, points]
}

async function main() {
    const [decimals,erc20Point] = await deployERC20Point();
    // const erc20Point = '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9'
    const bas = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
    const indexer  = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0"
    
    const [signer] = await ethers.getSigners();
    const validAttestor = [signer.address];

    const pointResolver =  await  deployPointResolver(indexer,signer.address,erc20Point.toString(),bas,validAttestor,[],[])
    await approveToResolver(pointResolver,erc20Point.toString(), 21_000_000_000_000_000_000_000_000n)

    
    const registrySchema = "0x5FbDB2315678afecb367f032d93F642f64180aa3"
    await initSchema(registrySchema,pointResolver);
    await initSchemaName(bas,pointResolver);

    const [taskSchemaIdsForPointResolver,taskPointsForPointResolver] = getSchemaIdAndPoint(decimals as bigint,pointResolver)
    await updateTaskPoint(pointResolver,taskSchemaIdsForPointResolver,taskPointsForPointResolver)

}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });