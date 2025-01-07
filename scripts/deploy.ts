import { ethers } from "hardhat";

import deployRegistry from "./1-registrySchema";
import deployEAS from "./2-eas";
import initSchema from "./3-initSchema";
import initSchemaName from "./4-initName";
import deployEIP712 from "./5-eip721";
import deployIndexer from "./6-indexer";
import { ZERO_ADDRESS } from "./utils";



async function main() {
  // const registrySchema = await deployRegistry();
  // const bas = await deployEAS(registrySchema);
  // const registrySchema = "0x5e905F77f59491F03eBB78c204986aaDEB0C6bDa"
  // const bas = "0x247Fe62d887bc9410c3848DF2f322e52DA9a51bC"

  //testnet
   const registrySchema = "0x08C8b8417313fF130526862f90cd822B55002D72"
    const bas = "0x6c2270298b1e6046898a322acB3Cbad6F99f7CBD"
  await initSchema(registrySchema,ZERO_ADDRESS,true);
  await initSchemaName(bas,ZERO_ADDRESS,true);
  await deployEIP712(bas); 
  // await deployIndexer(bas)
}


// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);

  process.exitCode = 1;
});
