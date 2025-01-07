import { ZeroAddress,solidityPackedKeccak256 }  from  "ethers";

export const SCHEMAS = [
  //passport 
  // {schema: 'bool passport',name: 'BNB Passport',point: 1_000_000,validator: '0x0000000000000000000000000000000000000000'}
  // {schema: "bytes32 uHash,string source,bytes32 publicDataHash,bool bnKYCUser",name:"BN KYC User", point: 0,validator: '0x471543A3bd04486008c8a38c5C00543B73F1769e'},
  // {schema: "bytes32 uHash,string source,bytes32 publicDataHash,bool okxKYCUser",name:"OKX KYC Account", point: 0,validator: '0x471543A3bd04486008c8a38c5C00543B73F1769e'},
  // {schema: "bytes32 uHash,string source,bytes32 publicDataHash,bool bybitKYCUser",name:"Bybit KYC Account", point: 0,validator: '0x471543A3bd04486008c8a38c5C00543B73F1769e'},
  // {schema: "bytes32 uHash,string source,bytes32 publicDataHash,bool coinbaseKYCUser",name:"Coinbase KYC User", point: 100,validator: '0x471543A3bd04486008c8a38c5C00543B73F1769e'},
  // {schema: "bytes32 uHash,string source,bytes32 publicDataHash,bool upbitKYCUser",name:"Upbit KYC User", point: 100,validator: '0x471543A3bd04486008c8a38c5C00543B73F1769e'},
  // {schema: "bytes32 uHash,string source,bytes32 publicDataHash,bool bithumbKYCUser",name:"Bitthumb KYC User", point: 100,validator: '0x471543A3bd04486008c8a38c5C00543B73F1769e'},

  {schema: "uint256 BNBBalanceOnBSC,uint256 activity",name:"BSC Activities", point: 100,validator: '0x471543A3bd04486008c8a38c5C00543B73F1769e'},
  {schema: "uint256 ETHBalanceOnETH,uint256 activity",name:"ETH Activities", point: 100,validator: '0x471543A3bd04486008c8a38c5C00543B73F1769e'},
  {schema: "uint256 ETHBalanceOnOp,uint256 activity",name:"OP Activities", point: 100,validator: '0x471543A3bd04486008c8a38c5C00543B73F1769e'},
  {schema: "uint256 ETHBalanceOnBase",name:"BASE Activities", point: 100,validator: '0x471543A3bd04486008c8a38c5C00543B73F1769e'},
 

  {schema: "bool virtual_creator",name:"Virtual Token Creator", point: 100,validator: '0x471543A3bd04486008c8a38c5C00543B73F1769e'},
  {schema: "bool clanker_creator",name:"Clanker Token Creator", point: 100,validator: '0x471543A3bd04486008c8a38c5C00543B73F1769e'},
  {schema: "bool luna_holder",name:"Luna Holder", point: 100,validator: '0x471543A3bd04486008c8a38c5C00543B73F1769e'},
  {schema: "bool aixpt_holder",name:"AIXPT Holder", point: 100,validator: '0x471543A3bd04486008c8a38c5C00543B73F1769e'},
  {schema: "bool ai16z_holder",name:"AI16Z Holder", point: 100,validator: '0x471543A3bd04486008c8a38c5C00543B73F1769e'},

  {schema: "bool facarter_user",name:"Facaster User", point: 100,validator: '0x471543A3bd04486008c8a38c5C00543B73F1769e'},
  {schema: "bool create_opensocial_profile",name:"OpenSocial Profile", point: 100,validator: '0x471543A3bd04486008c8a38c5C00543B73F1769e'},

  {schema: "bool twitter_user",name:"Twitter User", point: 100,validator: '0x471543A3bd04486008c8a38c5C00543B73F1769e'},
  {schema: "bool telegram_user",name:"Telegram User", point: 100,validator: '0x471543A3bd04486008c8a38c5C00543B73F1769e'},
  {schema: "bool hasDotBNBDomain",name:"SpaceId User", point: 100,validator: '0x471543A3bd04486008c8a38c5C00543B73F1769e'},
  {schema: "bool hasDotETHDomain",name:"ENS User", point: 100,validator: '0x471543A3bd04486008c8a38c5C00543B73F1769e'},

  {schema: "string PancakeV3VolumeWithIn3M",name:"Pancake V3 Volume Within 3 Months", point: 100,validator: '0x471543A3bd04486008c8a38c5C00543B73F1769e'},
  {schema: "string PancakeV2VolumeWithIn3M",name:"Pancake V2 Volume Within 3 Months", point: 100,validator: '0x471543A3bd04486008c8a38c5C00543B73F1769e'},

  // { schema: 'string verifiedCountry', name: 'Verified Coinbase Country'},
  // { schema: 'bool verifiedAccount', name: 'Verified Coinbase Account' }

    // { schema: 'bytes32 schemaId,string name', name: 'Name a Schema' },
    // { schema: 'bytes32 schemaId,string description', name: 'Schema Description' },
    // { schema: 'bytes32 schemaId,string context', name: 'Schema Context' },
    // { schema: 'bytes32 schemaId,[]string attestor', name: 'Valid Schema Attestors' },

    // {schema: "bytes32 uHash,string source,bytes32 publicDataHash,bool bnSpotVolumeLe100U",name:"BN Spot Volume > 100U", point: 200},
    // {schema: "bytes32 uHash,string source,bytes32 publicDataHash,bool bnKYCUser",name:"BN KYC User", point: 0,validator: '0x471543A3bd04486008c8a38c5C00543B73F1769e'},
    // {schema: "bytes32 uHash,string source,bytes32 publicDataHash,bool bnBalanceLe100U",name:"BN Balance > 100U", point: 200},
    // {schema: "bytes32 uHash,string source,bytes32 publicDataHash,bool bnFirstTxWithinOneWeek",name:"BN First Tx Within OneWeek", point: 300},
    // {schema: "bytes32 uHash,string source,bytes32 publicDataHash,bool okxKYCUser",name:"OKX KYC Account", point: 0,validator: '0x471543A3bd04486008c8a38c5C00543B73F1769e'},

    
    // {schema: "bytes32 uHash,string source,bytes32 publicDataHash,bool followBNBChainTwitter",name:"Follow BNB Chain Twitter", point: 50},
    // {schema: "bytes32 uHash,string source,bytes32 publicDataHash,bool followBASTwitter",name:"Follow BAS Twitter", point: 50},
    // {schema: "bool bnbOnChainLe1",name:"BNB on Chain > 1", point: 100},

    
    // {schema: "bool tgOwnership",name:"TG Ownership", point: 50},
    // {schema: "bool tgMember",name:"TG Member", point: 50},
    
    // {schema: "bool voteOneTimes",name:"Vote One Times", point: 100},
    // {schema: "bool vote5Times",name:"Vote 5 Times", point: 200},
    // {schema: "bool vote10Times",name:"Vote 10 Times", point: 400},

    // {schema:"string buidl_id,string buidl_name,string buidl_hash,string buidl_owner_address,uint256 vote,string grant_program_address,string grant_initiator,string grant_name,string grant_id", name:"Quadratic Voting", point: 0}
   

    // { schema: 'bool like', name: 'Like' },
    // { schema: 'address contractAddress,bool trusted', name: 'Trust a Contract' },
    // {
    //   schema: 'bytes32 eventId,uint8 ticketType,uint32 ticketNum',
    //   name: 'Create Event Ticket'
    // },
    // { schema: 'bool isHuman', name: 'Is a Human' },
    // { schema: 'bytes32 name', name: 'Name Something' },
    // { schema: 'string message', name: 'Write a Message' },
    // { schema: 'string statement', name: 'Make a Statement' },
    // { schema: 'bytes32 username', name: 'Username' },
    // { schema: 'bool isFriend', name: 'Is a Friend' },
    // { schema: 'bool hasPhoneNumber,bytes32 phoneHash', name: 'Has Phone Number' },
    // { schema: 'uint256 eventId,uint8 voteIndex', name: 'Vote' },
    // { schema: 'bool hasPassedKYC', name: 'Passed KYC' },
    // { schema: 'bool isAccreditedInvestor', name: 'Is an Accredited Investor' },
    // { schema: 'bytes32 hashOfDocument,string note', name: 'Sign Document' },
    // { schema: 'bytes32 contentHash', name: 'Content Hash' },
    // {
    //   schema: 'uint8 holdType,uint8 useType,uint64 expiration,int40[2][] polygonArea',
    //   name: 'Land Registry'
    // },
    // {
    //   schema:
    //     'string productName,bytes32 productSKU,string origin,string manufacturer,uint64 productionDate,uint64 ' +
    //     'expirationDate,bytes32 rawMaterialHash,address certifier',
    //   name: 'Product Origin'
    // },
    // {
    //   schema:
    //     'bytes32 productId,string productName,address producerAddress,bytes32 batchId,uint64 productionDate,uint64 ' +
    //     'expirationDate',
    //   name: 'Product Provenance'
    // },
    // {
    //   schema: 'string assetName,string assetTicker,uint64 futureDate,uint256 price',
    //   name: 'Price Prediction'
    // },
    // {
    //   schema: 'string assetName,string assetTicker,uint64 timestamp,uint256 price',
    //   name: 'Price Feed'
    // },
    // {
    //   schema: 'bytes32 documentHash,bytes32 notaryCertificate,uint64 notarizationTime',
    //   name: 'Digital Notary'
    // },
    // { schema: 'bytes32 passportHash,uint64 expirationDate', name: 'Passport' },
    // {
    //   schema:
    //     'string projectName,string description,address beneficiary,uint256 amountRequested,uint64 submittedTime,bytes32 proposalHash',
    //   name: 'Grant Proposal Request'
    // },
    // {
    //   schema: 'bytes32 projectId,bytes32 milestoneId,uint256 amount,bool isCompleted',
    //   name: 'Grant Milestone'
    // },
    // {
    //   schema: 'bytes32 projectId,uint256 amountPaid,string memo',
    //   name: 'Grant Payment'
    // },
    // {
    //   schema:
    //     'string hackathonName,string hackathonId,string projectName,string description,address[] team,uint64 submittedDate',
    //   name: 'Hackathon Submission'
    // },
    // {
    //   schema: 'bytes32 projectId,string projectName,address winnerAddress,uint256 prizeAmount,string projectDescription',
    //   name: 'Hackathon Winner'
    // },
    // {
    //   schema: 'bytes32 productName,string review,uint8 rating',
    //   name: 'Product Review'
    // },
    // {
    //   schema: 'uint64 dateOfProof,uint256 amount,bool hasFunds,bytes32 evidenceHash',
    //   name: 'Proof of Funds'
    // },
    // {
    //   schema: 'string assetName,bool activeHolding,string note',
    //   name: 'Asset Disclosure'
    // },
    // { schema: 'string websiteUrl', name: 'Website URL' },
    // { schema: 'string twitterHandle', name: 'Twitter Handle' },
    // { schema: 'string youtubeChannel', name: 'YouTube Channel' },
    // { schema: 'string githubUrl', name: 'GitHub Username' },
    // { schema: 'string telegramUsername', name: 'Telegram Username' },
    // {
    //   schema: 'string eventName,string eventLocation,bytes32 eventID,uint64 checkInTime,bytes32 ticketID',
    //   name: 'Event Attendance'
    // },
    // {
    //   schema:
    //     'string institutionName,string degreeName,uint64 graduationDate,bytes32 transcriptHash,address issuerAddress',
    //   name: 'Academic Credentials'
    // },
    // {
    //   schema: 'string companyName,string role,uint64 startDate,uint64 endDate',
    //   name: 'Employment Verification'
    // },
    // {
    //   schema: 'bytes32 roleId,string role,bytes32[] authorizations',
    //   name: 'Community Authorization'
    // },
    // {
    //   schema: 'bool passedAudit',
    //   name: 'Contract Audit'
    // },
    // { schema: 'bool metIRL', name: 'Met in Real Life' },
    // { schema: 'bytes32 privateData', name: 'Private Data' },
    // { schema: 'bool isTrue', name: 'True' },
    // { schema: 'string post', name: 'Post' },
    // { schema: 'bool gm', name: 'GM' }
  ];

export const PASSPORTSCHEMA = [
  {schema: "bytes32 uHash,string source,bytes32 publicDataHash,bool bnKYCUser",name:"BN KYC User", point: 0,validator: '0x471543A3bd04486008c8a38c5C00543B73F1769e'},
  {schema: "bytes32 uHash,string source,bytes32 publicDataHash,bool okxKYCUser",name:"OKX KYC Account", point: 0,validator: '0x471543A3bd04486008c8a38c5C00543B73F1769e'},
  {schema: "bytes32 uHash,string source,bytes32 publicDataHash,bool bybitKYCUser",name:"Bybit KYC Account", point: 0,validator: '0x471543A3bd04486008c8a38c5C00543B73F1769e'},
  {schema: "bytes32 uHash,string source,bytes32 publicDataHash,bool coinbaseKYCUser",name:"Coinbase KYC User", point: 100,validator: '0x471543A3bd04486008c8a38c5C00543B73F1769e'},
  {schema: "bytes32 uHash,string source,bytes32 publicDataHash,bool upbitKYCUser",name:"Upbit KYC User", point: 100,validator: '0x471543A3bd04486008c8a38c5C00543B73F1769e'},
  {schema: "bytes32 uHash,string source,bytes32 publicDataHash,bool bithumbKYCUser",name:"Bitthumb KYC User", point: 100,validator: '0x471543A3bd04486008c8a38c5C00543B73F1769e'},

  {schema: "string chain,uint256 balance,uint256 activity",name:"BSC Activities", point: 100,validator: '0x471543A3bd04486008c8a38c5C00543B73F1769e'},
  {schema: "string chain,uint256 balance,uint256 activity",name:"ETH Activities", point: 100,validator: '0x471543A3bd04486008c8a38c5C00543B73F1769e'},
  {schema: "string chain,uint256 balance,uint256 activity",name:"OP Activities", point: 100,validator: '0x471543A3bd04486008c8a38c5C00543B73F1769e'},
  {schema: "string chain,uint256 balance",name:"BASE Activities", point: 100,validator: '0x471543A3bd04486008c8a38c5C00543B73F1769e'},


  {schema: "string domain",name:"SpaceId User", point: 100,validator: '0x471543A3bd04486008c8a38c5C00543B73F1769e'},
  {schema: "string domain",name:"ENS User", point: 100,validator: '0x471543A3bd04486008c8a38c5C00543B73F1769e'},
 

  {schema: "bool virtual_creator",name:"Virtual Token Creator", point: 100,validator: '0x471543A3bd04486008c8a38c5C00543B73F1769e'},
  {schema: "bool clanker_creator",name:"Clanker Token Creator", point: 100,validator: '0x471543A3bd04486008c8a38c5C00543B73F1769e'},
  {schema: "bool luna_holder",name:"Luna Holder", point: 100,validator: '0x471543A3bd04486008c8a38c5C00543B73F1769e'},
  {schema: "bool aixpt_holder",name:"AIXPT Holder", point: 100,validator: '0x471543A3bd04486008c8a38c5C00543B73F1769e'},
  {schema: "bool ai16z_holder",name:"AI16Z Holder", point: 100,validator: '0x471543A3bd04486008c8a38c5C00543B73F1769e'},

  {schema: "bool facarter_user",name:"Facaster User", point: 100,validator: '0x471543A3bd04486008c8a38c5C00543B73F1769e'},

  {schema: "bool twitter_user",name:"Twitter User", point: 100,validator: '0x471543A3bd04486008c8a38c5C00543B73F1769e'},
  {schema: "bool telegram_user",name:"Telegram User", point: 100,validator: '0x471543A3bd04486008c8a38c5C00543B73F1769e'},
  {schema: "string domain", name:"ENS", point: 100,validator: '0x471543A3bd04486008c8a38c5C00543B73F1769e'},
  {schema: "string domain", name:"SpaceID", point: 100,validator: '0x471543A3bd04486008c8a38c5C00543B73F1769e'},

]

export const ZERO_ADDRESS = ZeroAddress;
export const ZERO_BYTES = '0x';
export const ZERO_BYTES32 = '0x0000000000000000000000000000000000000000000000000000000000000000';
  
export const NO_EXPIRATION = 0n;

export const EIP712_BNB_DOMAIN_NAME = 'BNB Attestation'
export const EIP712_PROXY_NAME = 'EIP712Proxy';

export const EIP712_DOMAIN_NAME = "OPBNB ATTESTATION"

export const EIP712_DEV_BSC_DOMAN_NAME = "BSC ATTESTATION DEV"

export const EIP712_DEV_OPBNB_DOMAN_NAME = "OPBNB ATTESTATION DEV"

export const getSchemaUID = (schema:string, resolverAddress:string, revocable:boolean) =>
  solidityPackedKeccak256(['string', 'address', 'bool'], [schema, resolverAddress, revocable]);