// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
// import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {AttestationRequest} from "./IEAS.sol";
import {DelegatedProxyAttestationRequest} from "./eip712/proxy/EIP712Proxy.sol";
import { Address } from "@openzeppelin/contracts/utils/Address.sol";

enum FailureHandleStrategy {
        BlockOnFail, // If a package fails, the subsequent SYN packages will be blocked until the failed ACK packages are handled in the order they were received.
        CacheOnFail, // When a package fails, it is cached for later handling. New SYN packages will continue to be handled normally.
        SkipOnFail // Failed ACK packages are ignored and will not affect subsequent SYN packages.
    }

interface IBucketFactory {
    function deploy(uint256 transferOutAmount,bytes32 _salt) external payable;
}

interface IManageContract{
    function getName(string memory name, bytes32 schemaId) external view returns (string memory);
    function createBucket(string memory name,bytes32 schemaId, bytes memory _executorData,uint256 _callbackGasLimit,FailureHandleStrategy _failureHandleStrategy,address sp_address) external payable returns (string memory);
    function createPolicy(string memory name,bytes32 schemaId, bytes memory createPolicyData,uint256 _callbackGasLimit,FailureHandleStrategy _failureHandleStrategy) external payable;
}

interface IBAS {
    function attest(AttestationRequest calldata request) external payable returns (bytes32);
}

interface IVerifier {
    function verifyAttestation(DelegatedProxyAttestationRequest memory request) external returns (bool);
}

interface Manager {
    function transferOwnership(address newOwner) external;
}

enum AttestationType{
    ONCHAIN,
    OFFCHAIN
}

struct AttestResult {
    bytes32 schemaId;
    AttestationType _type;
}
   

contract Passport is Initializable, OwnableUpgradeable{
    using Address for address payable;
    // using EnumerableSet for EnumerableSet.AddressSet;


    uint256 public createBucketFee;
    uint256 public bank;
    IBAS public bas;
    IVerifier public verifier;

    bytes32 public passport;

    mapping(address=>AttestationType) public mint_passport;
    mapping(address=>AttestResult[]) public mint_result;
    mapping(uint256=>uint64)invited_amount;
    mapping(uint256=>uint256)invite_code_discount;
    mapping(address=>uint256)user_invited_codes;
    mapping(uint256=>address[]) public invite_code_users;
    mapping(uint256=>uint256) public invite_code_incomes;

    mapping(bytes32=>uint256)mint_fees;
    mapping(bytes32=>address)validate_attestors;

    IBucketFactory public bucketFactory;
    // EnumerableSet.AddressSet managers;
    // mapping(address=>bool) buckets;
    // mapping(address=>bool) policies;
    
    event MintOffChainPassport(address indexed recipient);
    event MintOffChain(address indexed recipient,bytes32 schemaId,DelegatedProxyAttestationRequest request);

    function initialize(IBAS _bas,uint256 _createBucketFee,bytes32 _passport, IVerifier _verifier,IBucketFactory _bucketFactory) public initializer {
        __Ownable_init();
        bas = _bas;
        createBucketFee = _createBucketFee;
        passport = _passport;
        verifier = _verifier;
        bucketFactory = _bucketFactory;
    }

    function setInviteCode(uint256[] calldata invite_code, uint256[] calldata _invite_code_discount ) external onlyOwner {
        uint256 length = invite_code.length;
        require(length == _invite_code_discount.length,"invalidate input length");
        for (uint256 i =0; i<length;i++) {
            invite_code_discount[invite_code[i]] = _invite_code_discount[i];
        }
    }

    function setMintFees(bytes32[] calldata schemaIds, uint256[] calldata _mint_fees,address[] calldata _validate_attestors) external onlyOwner {
        uint256 length = schemaIds.length;
        require(length == _mint_fees.length && _validate_attestors.length == length,"invalidate input length");

        for (uint256 i =0; i<length;i++) {
            bytes32 schemaId = schemaIds[i];
            mint_fees[schemaId] = _mint_fees[i];
            address validate_attestor = _validate_attestors[i];
            if (validate_attestor != address(0)) {
                validate_attestors[schemaId] = validate_attestor;
            }
        }
    }

    function setPassport(bytes32 _passport) external onlyOwner {
        passport = _passport;
    }

    function setBucketFee(uint256 _createBucketFee) external onlyOwner {
        createBucketFee = _createBucketFee;
    }


    function withdraw(uint256 amount,address to) external onlyOwner(){
        if (amount > 0) {
            payable(to).sendValue(amount);
            bank-=amount;
        } else{
             payable(to).sendValue(bank);
             bank = 0;
        }
    } 

    /**
    * @dev Mints a new passport based on the provided attestation request and type.
    * @param request The attestation request containing the necessary data for minting.
    * @param _type The type of attestation to be used for minting the passport. (Onchain or Offchain)
    * @param invite_code The invite code required for minting (default 0).
    * @notice This function is payable, meaning it can accept Ether. Ensure the correct amount is sent.
    * @dev The function checks the validity of the invite code and processes the attestation request.
    *      It may revert if the invite code is invalid or if the attestation type is not supported.
    */
    function mintPassport(AttestationRequest calldata request, AttestationType _type, uint256 invite_code) external payable {
        require(invite_code== 0 || invite_code_discount[invite_code] > 0,"invalid invite code");
        bytes32 schemaId = request.schema;
        require(schemaId == passport,"invalid schema id");
        bas.attest(request);
        
        if(_type == AttestationType.OFFCHAIN){
             require(msg.value >= createBucketFee,"insufficient fund");
             bank += (msg.value);
             emit MintOffChainPassport(request.data.recipient);
        }

       
        mint_passport[request.data.recipient] = _type;
        if (invite_code != 0) {
            user_invited_codes[request.data.recipient] = invite_code;
            invited_amount[invite_code]++;
            invite_code_users[invite_code].push(request.data.recipient);
        }

        //todo: transfer bucket manager to msg.sender
    }

    function mint(DelegatedProxyAttestationRequest calldata request, AttestationType _type) external payable {
        verifier.verifyAttestation(request);
        bytes32 schemaId = request.schema;
        uint256 mint_fee = mint_fees[schemaId];
        require(mint_fee > 0, "invalid schema");
        address recipient = request.data.recipient;
        uint256 invite_code = user_invited_codes[recipient];
        if (invite_code != 0) {
            uint256 discount = invite_code_discount[invite_code];
            require(discount > 0, "Invalid discount");
            mint_fee = mint_fee * 10 / discount;
            invite_code_incomes[invite_code] += mint_fee;
        }
        
        require(msg.value >= mint_fee);
        if (msg.value > mint_fee) {
            payable(msg.sender).sendValue(msg.value - mint_fee);
        }

        address validate_attestor = validate_attestors[schemaId];
        require(validate_attestor == address(0) || validate_attestor == request.attester,"invalid attestor");

        if (_type==AttestationType.ONCHAIN) {
            bas.attest(AttestationRequest({ schema: request.schema, data: request.data }));
        } else{
            emit MintOffChain(recipient, request.schema, request);
        }
        mint_result[recipient].push(AttestResult(schemaId, _type));
    }

     function deployManager(uint256 transferOutAmount,bytes32 _salt) external payable{
        bucketFactory.deploy{value:msg.value}(transferOutAmount,_salt);
     }

    function createBucket(address manager,string calldata name,bytes32 schemaId, bytes calldata _executorData,uint256 _callbackGasLimit,FailureHandleStrategy _failureHandleStrategy,address sp_address) external payable onlyOwner{
        // require(!buckets[manager],"the manager has created bucket");
        IManageContract(manager).createBucket{value: msg.value}(name, schemaId, _executorData, _callbackGasLimit, _failureHandleStrategy, sp_address);
        // buckets[manager] = true;
    }

    function createPolity(address manager,string memory name,bytes32 schemaId, bytes calldata createPolicyData,uint256 _callbackGasLimit,FailureHandleStrategy _failureHandleStrategy) external payable onlyOwner{
        // require(buckets[manager],"the manager does not create bucket");
        // require(!policies[manager],"the manager has created policy");
        IManageContract(manager).createPolicy{value:msg.value}(name, schemaId, createPolicyData, _callbackGasLimit, _failureHandleStrategy);
        // policies[manager] = true;
        // managers.add(manager);
    }
}