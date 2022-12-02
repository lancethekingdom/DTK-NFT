// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Pausable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

// import "hardhat/console.sol";

struct TokenInfo {
    uint256 tokenId;
    bool deposited;
}

contract DTKHero is ERC721, ERC721Pausable, Ownable {
    using Strings for uint256;
    using Counters for Counters.Counter;

    // for mint control
    Counters.Counter private supply;
    Counters.Counter private minted; // for micmicking thirdweb droperc721
    uint256 public maxSupply;

    // for signature control
    address public authSigner;
    mapping(address => uint256) sigNonces; // all the nonces consumed by each address

    // for deposit control
    mapping(uint256 => bool) depositedTokens;

    // for metadata control
    string public uriPrefix = "";
    string public uriSuffix = "";

    event Mint(
        address indexed minter,
        uint256 indexed tokenId,
        uint256 indexed nonce
    );

    event Burn(address indexed owner, uint256 indexed tokenId);

    event Deposit(
        address indexed owner,
        uint256 indexed tokenId,
        uint256 indexed nonce
    );
    event Withdraw(
        address indexed owner,
        uint256 indexed tokenId,
        uint256 indexed nonce
    );

    constructor(
        address _authSigner,
        uint256 _maxSupply,
        string memory _uriPrefix,
        string memory _uriSuffix
    ) ERC721("DTKHeroGenesis", "DTKHG") {
        require(_authSigner != address(0), "Invalid addr");

        authSigner = _authSigner;
        maxSupply = _maxSupply;
        uriPrefix = _uriPrefix;
        uriSuffix = _uriSuffix;
    }

    function splitSignature(bytes memory sig)
        internal
        pure
        returns (
            uint8,
            bytes32,
            bytes32
        )
    {
        require(sig.length == 65, "Invalid signature");

        bytes32 r;
        bytes32 s;
        uint8 v;

        assembly {
            r := mload(add(sig, 32))
            s := mload(add(sig, 64))
            v := byte(0, mload(add(sig, 96)))
        }

        return (v, r, s);
    }

    function prefixed(bytes32 hash) internal pure returns (bytes32) {
        return
            keccak256(
                abi.encodePacked("\x19Ethereum Signed Message:\n32", hash)
            );
    }

    function recoverSigner(bytes32 message, bytes memory sig)
        internal
        pure
        returns (address)
    {
        uint8 v;
        bytes32 r;
        bytes32 s;

        (v, r, s) = splitSignature(sig);
        return ecrecover(message, v, r, s);
    }

    function _validateHash(
        string memory _methodIdentifier,
        address _address,
        uint256 _nonce,
        bytes memory sig
    ) internal view returns (bool) {
        bytes32 msgHash = prefixed(
            keccak256(
                abi.encodePacked(
                    _methodIdentifier,
                    address(this),
                    _address,
                    _nonce
                )
            )
        );
        return recoverSigner(msgHash, sig) == authSigner;
    }

    function _validateHashWithTokenId(
        string memory _methodIdentifier,
        address _address,
        uint256 _tokenId,
        uint256 _nonce,
        bytes memory sig
    ) internal view returns (bool) {
        bytes32 msgHash = prefixed(
            keccak256(
                abi.encodePacked(
                    _methodIdentifier,
                    address(this),
                    _address,
                    _tokenId,
                    _nonce
                )
            )
        );
        return recoverSigner(msgHash, sig) == authSigner;
    }

    function _baseURI() internal view virtual override returns (string memory) {
        return uriPrefix;
    }

    function currentNonce(address walletAddress) public view returns (uint256) {
        return sigNonces[walletAddress];
    }

    function totalSupply() public view returns (uint256) {
        return supply.current();
    }

    function totalMinted() public view returns (uint256) {
        return minted.current();
    }

    function tokenURI(uint256 tokenId)
        public
        view
        virtual
        override
        returns (string memory)
    {
        _requireMinted(tokenId);

        string memory currentBaseURI = _baseURI();
        return
            bytes(currentBaseURI).length > 0
                ? string(
                    abi.encodePacked(
                        currentBaseURI,
                        tokenId.toString(),
                        uriSuffix
                    )
                )
                : "";
    }

    function tokenDepositStatus(uint256 tokenId) public view returns (bool) {
        return depositedTokens[tokenId];
    }

    function tokensOfOwner(address owner)
        public
        view
        returns (TokenInfo[] memory)
    {
        uint256 ownerTokenCount = balanceOf(owner);
        TokenInfo[] memory ownedTokens = new TokenInfo[](ownerTokenCount);
        uint256 currentTokenId = 0;
        uint256 ownedTokenIndex = 0;
        while (
            ownedTokenIndex < ownerTokenCount && currentTokenId <= totalSupply()
        ) {
            if (_exists(currentTokenId)) {
                address currentTokenOwner = ownerOf(currentTokenId);

                if (currentTokenOwner == owner) {
                    ownedTokens[ownedTokenIndex].tokenId = currentTokenId;
                    ownedTokens[ownedTokenIndex].deposited = depositedTokens[
                        currentTokenId
                    ];
                    ownedTokenIndex++;
                }
            }
            currentTokenId++;
        }
        return ownedTokens;
    }

    function setUriPrefix(string memory _uriPrefix) public onlyOwner {
        uriPrefix = _uriPrefix;
    }

    function setUriSuffix(string memory _uriSuffix) public onlyOwner {
        uriSuffix = _uriSuffix;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function transferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public override {
        require(!depositedTokens[tokenId], "Token has been deposited");
        super.transferFrom(from, to, tokenId);
    }

    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public override {
        require(!depositedTokens[tokenId], "Token has been deposited");
        super.safeTransferFrom(from, to, tokenId);
    }

    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId,
        bytes memory data
    ) public virtual override {
        require(!depositedTokens[tokenId], "Token has been deposited");
        super._safeTransfer(from, to, tokenId, data);
    }

    modifier mintCompliance(
        address minter,
        uint256 nonce,
        bytes memory sig
    ) {
        _requireNotPaused();
        require(currentNonce(minter) == nonce, "Invalid nonce");

        require(
            _validateHash("mint(uint256,uint256,bytes)", minter, nonce, sig),
            "Invalid signature"
        );
        require(supply.current() + 1 <= maxSupply, "Max supply exceeded!");
        _;
    }

    function mint(uint256 nonce, bytes memory sig)
        public
        mintCompliance(_msgSender(), nonce, sig)
    {
        super._safeMint(_msgSender(), supply.current());

        // increment nonce
        sigNonces[_msgSender()] += 1;

        supply.increment();
        minted.increment();
        emit Mint(_msgSender(), supply.current(), nonce);
    }

    modifier burnCompliance(uint256 tokenId) {
        _requireNotPaused();
        _requireMinted(tokenId);
        require(_isApprovedOrOwner(_msgSender(), tokenId), "Unauthorized");
        require(!depositedTokens[tokenId], "Token has been deposited");
        _;
    }

    function burn(uint256 tokenId) public burnCompliance(tokenId) {
        super._burn(tokenId);
        emit Burn(_msgSender(), tokenId);
        supply.decrement();
    }

    // modifier withdrawCompliance(
    //     uint256 tokenId,
    //     address wallet,
    //     uint256 nonce,
    //     bytes memory sig
    // ) {
    //     _requireNotPaused();
    //     _requireMinted(tokenId);
    //     require(_isApprovedOrOwner(wallet, tokenId), "Unauthorized");
    //     require(depositedTokens[tokenId], "Token has not been deposited");
    //     require(!sigNonces[wallet][nonce], "nonce already consumed");

    //     // require(
    //     //     _validateHashWithTokenId(
    //     //         "withdraw(uint256,uint256,bytes)",
    //     //         wallet,
    //     //         tokenId,
    //     //         nonce,
    //     //         sig
    //     //     ),
    //     //     "Invalid signature"
    //     // );
    //     _;
    // }

    // function withdraw(
    //     uint256 tokenId // uint256 _nonce, // bytes memory sig // withdrawCompliance(tokenId, _msgSender(), _nonce, sig)
    // ) external {
    //     // sigNonces[_msgSender()][_nonce] = true;
    //     require(ownerOf(tokenId) == _msgSender(), "unauthorized");
    //     require(depositedTokens[tokenId], "token not deposited");
    //     depositedTokens[tokenId] = false;
    //     // emit Withdraw(_msgSender(), tokenId, _nonce);
    // }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal override(ERC721, ERC721Pausable) {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
    }
}
