import  {ethers  as hardhat} from "hardhat";
import {ethers} from "ethers";
import {ISchemaRegistry__factory} from "../typechain-types/factories/contracts";
import {SCHEMAS,ZERO_ADDRESS,getSchemaUID} from "./utils";

async function initSchema(_registrySchema:string,resolver:string,revocable: boolean) {
    const provider = new ethers.JsonRpcProvider(
        "https://data-seed-prebsc-1-s1.binance.org:8545/"
      );

    const [signer] = await hardhat.getSigners();
    // console.log('Init Registry Schema contract with account:',signer.address);

    const registrySchema = ISchemaRegistry__factory.connect(_registrySchema,provider)

    for (const {schema} of SCHEMAS) {
        const resp = await registrySchema.connect(signer).register(schema,resolver,revocable)
        await resp.wait()
        console.log(`Registered schema ${schema} with UID ${getSchemaUID(schema, resolver, revocable)} in tx ${resp.hash}`);
    }
}

export default initSchema;