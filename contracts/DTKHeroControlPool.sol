// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

import "hardhat/console.sol";

contract DTKHeroControlPool is Ownable, ERC721Holder {
    IERC721 immutable _dtkHero;

    event ERC721Received(
        address indexed erc721,
        address indexed operator,
        address from,
        uint256 indexed tokenId
    );
    event WithdrawDTKHero(address indexed operator, uint256 tokenId);
    event ERC721Transfer(
        address indexed erc721Address,
        address indexed to,
        uint256 indexed tokenId
    );

    mapping(uint256 => address) private _depositedDtkHero;

    constructor(address nftAddress) {
        require(nftAddress != address(0), "Invalid Token Address");

        _dtkHero = IERC721(nftAddress);
    }

    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes memory data
    ) public virtual override returns (bytes4) {
        if (_msgSender() == address(_dtkHero)) {
            _depositedDtkHero[tokenId] = operator;
        }
        emit ERC721Received(_msgSender(), operator, from, tokenId);
        return super.onERC721Received(operator, from, tokenId, data);
    }

    function getDtkHeroAddress() external view returns (address) {
        return address(_dtkHero);
    }

    function depositedDtkHeroOwner(uint256 tokenId)
        external
        view
        returns (address)
    {
        return _depositedDtkHero[tokenId];
    }

    function transfer(
        address erc721Address,
        address to,
        uint256 tokenId
    ) external onlyOwner {
        if (erc721Address == address(_dtkHero)) {
            _dtkHero.safeTransferFrom(address(this), to, tokenId, "");
            _depositedDtkHero[tokenId] = address(0);
        } else {
            IERC721(erc721Address).safeTransferFrom(
                address(this),
                to,
                tokenId,
                ""
            );
        }
    }

    function withdrawDTKHero(uint256 tokenId) external {
        require(
            _depositedDtkHero[tokenId] != address(0),
            "TokenId has not been deposited yet"
        );
        require(_depositedDtkHero[tokenId] == _msgSender(), "Unauthorized");

        _dtkHero.safeTransferFrom(address(this), _msgSender(), tokenId, "");
        _depositedDtkHero[tokenId] = address(0);

        emit WithdrawDTKHero(_msgSender(), tokenId);
    }
}
