// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import "erc721a/contracts/IERC721A.sol";

// import "hardhat/console.sol";

struct TokenInfo {
    uint256 tokenId;
    bool deposited;
}

contract DTKHero is ERC721, Pausable, Ownable {
    using Strings for uint256;
    using Counters for Counters.Counter;

    // for mint control
    Counters.Counter private supply;
    uint256 public maxSupply;

    // for signature control
    address public authSigner;
    mapping(address => mapping(uint256 => bool)) sigNonces; // all the nonces consumed by each address

    // for deposit control
    mapping(uint256 => bool) depositedTokens;

    // for metadata control
    bool public revealed = false;
    string public uriPrefix = "";
    string public uriSuffix = ".json";
    string public hiddenMetadataURI;

    constructor(
        address _authSigner,
        string memory _hiddenMetadataURI,
        uint256 _maxSupply
    ) ERC721("HeroMysteryBox", "HMB") {
        require(_authSigner != address(0), "Invalid addr");
        require(
            bytes(_hiddenMetadataURI).length != 0,
            "Invalid hidden metadata uri"
        );

        authSigner = _authSigner;
        maxSupply = _maxSupply;
        setHiddenMetadataURI(hiddenMetadataURI);
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

    function totalSupply() public view returns (uint256) {
        return supply.current();
    }

    function _baseURI() internal view virtual override returns (string memory) {
        return uriPrefix;
    }

    function tokenURI(uint256 _tokenId)
        public
        view
        virtual
        override
        returns (string memory)
    {
        require(
            _exists(_tokenId),
            "ERC721Metadata: URI query for nonexistent token"
        );

        if (revealed == false) {
            return hiddenMetadataURI;
        }

        string memory currentBaseURI = _baseURI();
        return
            bytes(currentBaseURI).length > 0
                ? string(
                    abi.encodePacked(
                        currentBaseURI,
                        _tokenId.toString(),
                        uriSuffix
                    )
                )
                : "";
    }

    function tokensOfOwner(address _owner)
        public
        view
        returns (TokenInfo[] memory)
    {
        uint256 ownerTokenCount = balanceOf(_owner);
        TokenInfo[] memory ownedTokens = new TokenInfo[](ownerTokenCount);
        uint256 currentTokenId = 1;
        uint256 ownedTokenIndex = 0;

        while (
            ownedTokenIndex < ownerTokenCount && currentTokenId <= maxSupply
        ) {
            if (_exists(currentTokenId)) {
                address currentTokenOwner = ownerOf(currentTokenId);

                if (currentTokenOwner == _owner) {
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

    function setRevealed(bool _state) external onlyOwner {
        revealed = _state;
    }

    function setHiddenMetadataURI(string memory _hiddenMetadataURI)
        public
        onlyOwner
    {
        hiddenMetadataURI = _hiddenMetadataURI;
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
        _requireNotPaused();
        require(!depositedTokens[tokenId], "Token has been deposited");
        super.transferFrom(from, to, tokenId);
    }

    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public override {
        _requireNotPaused();
        require(!depositedTokens[tokenId], "Token has been deposited");
        super.safeTransferFrom(from, to, tokenId);
    }

    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId,
        bytes memory data
    ) public virtual override {
        _requireNotPaused();
        require(
            _isApprovedOrOwner(_msgSender(), tokenId),
            "ERC721: caller is not token owner nor approved"
        );
        require(!depositedTokens[tokenId], "Token has been deposited");
        super._safeTransfer(from, to, tokenId, data);
    }

    modifier mintCompliance(
        uint256 tokenId,
        address minter,
        uint256 nonce,
        bytes memory sig
    ) {
        _requireNotPaused();
        require(!_exists(tokenId), "token already minted");
        require(!sigNonces[minter][nonce], "nonce already consumed");

        require(
            _validateHash(
                "mint(uint256,uint256,bytes)",
                minter,
                tokenId,
                nonce,
                sig
            ),
            "Invalid signature"
        );
        require(supply.current() + 1 <= maxSupply, "Max supply exceeded!");
        _;
    }

    function mint(
        uint256 tokenId,
        uint256 nonce,
        bytes memory sig
    ) public mintCompliance(tokenId, _msgSender(), nonce, sig) {
        supply.increment();
        sigNonces[msg.sender][nonce] = true;
        super._safeMint(_msgSender(), tokenId);
    }

    function burn(uint256 tokenId) public {
        _requireNotPaused();
        _requireMinted(tokenId);
        require(_isApprovedOrOwner(msg.sender, tokenId), "Unauthorized");
        require(!depositedTokens[tokenId], "Token has been deposited");
        supply.decrement();
        super._burn(tokenId);
    }

    modifier depositCompliance(
        uint256 tokenId,
        address _address,
        uint256 nonce,
        bytes memory sig
    ) {
        _requireNotPaused();
        _requireMinted(tokenId);
        require(_isApprovedOrOwner(_address, tokenId), "Unauthorized");
        require(!depositedTokens[tokenId], "Token has been deposited");
        require(!sigNonces[_address][nonce], "nonce already consumed");

        require(
            _validateHash(
                "deposit(uint256,uint256,bytes)",
                _address,
                tokenId,
                nonce,
                sig
            ),
            "Invalid signature"
        );
        _;
    }

    function deposit(
        uint256 tokenId,
        uint256 _nonce,
        bytes memory sig
    ) external depositCompliance(tokenId, _msgSender(), _nonce, sig) {
        depositedTokens[tokenId] = true;
    }

    modifier withdrawCompliance(
        uint256 tokenId,
        address _address,
        uint256 nonce,
        bytes memory sig
    ) {
        _requireNotPaused();
        _requireMinted(tokenId);
        require(_isApprovedOrOwner(_address, tokenId), "Unauthorized");
        require(depositedTokens[tokenId], "Token has not been deposited");
        require(!sigNonces[_address][nonce], "nonce already consumed");

        require(
            _validateHash(
                "withdraw(uint256,uint256,bytes)",
                _address,
                tokenId,
                nonce,
                sig
            ),
            "Invalid signature"
        );
        _;
    }

    function withdraw(
        uint256 tokenId,
        uint256 _nonce,
        bytes memory sig
    ) external withdrawCompliance(tokenId, _msgSender(), _nonce, sig) {
        depositedTokens[tokenId] = false;
    }
}
