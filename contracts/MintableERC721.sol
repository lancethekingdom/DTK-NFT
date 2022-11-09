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

contract MintableERC721 is ERC721, ERC721Pausable, Ownable {
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
    string public uriPrefix = "";
    string public uriSuffix = "";

    event Burn(address indexed owner, uint256 indexed tokenId);

    constructor(address _authSigner, uint256 _maxSupply)
        ERC721("HeroMysteryBox", "HMB")
    {
        require(_authSigner != address(0), "Invalid addr");

        authSigner = _authSigner;
        maxSupply = _maxSupply;
    }
    
    function _baseURI() internal view virtual override returns (string memory) {
        return uriPrefix;
    }

    function totalSupply() public view returns (uint256) {
        return supply.current();
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

    function mint() public {
        super._safeMint(_msgSender(), supply.current());
        supply.increment();
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

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal override(ERC721, ERC721Pausable) {
        super._beforeTokenTransfer(from, to, tokenId);
    }
}
