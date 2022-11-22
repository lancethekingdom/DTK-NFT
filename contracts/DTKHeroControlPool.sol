// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

// import "hardhat/console.sol";

struct DepositInfo {
    address depositor;
    bool hasPlayerId;
    uint256 playerId;
}

contract DTKHeroControlPool is Ownable, ERC721Holder {
    IERC721 immutable _dtkHero;

    event OnERC721Received(
        address indexed erc721,
        address indexed operator,
        address from,
        uint256 indexed tokenId
    );
    event OnDtkHeroDeposited(
        address indexed depositor,
        uint256 indexed tokenId,
        bool hasPlayerId,
        uint256 playerId
    );
    event WithdrawDTKHero(
        address indexed operator,
        uint256 tokenId,
        uint256 nonce
    );
    event TransferERC721(
        address indexed erc721Address,
        address indexed to,
        uint256 indexed tokenId
    );

    mapping(uint256 => DepositInfo) private _depositedDtkHero;

    // for signature control
    address public authSigner;
    mapping(address => uint256) sigNonces; // all the nonces consumed by each address

    constructor(address nftAddress, address _authSigner) {
        require(nftAddress != address(0), "Invalid Token Address");
        require(_authSigner != address(0), "Invalid addr");

        _dtkHero = IERC721(nftAddress);
        authSigner = _authSigner;
    }

    function bytesToUint(bytes memory b) internal pure returns (uint256) {
        uint256 number;
        for (uint256 i = 0; i < b.length; i++) {
            number =
                number +
                uint256(uint8(b[i])) *
                (2**(8 * (b.length - (i + 1))));
        }
        return number;
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

    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes memory data
    ) public virtual override returns (bytes4) {
        if (_msgSender() == address(_dtkHero)) {
            bool hasPlayerId = data.length != 0;
            uint256 playerId = bytesToUint(data);

            DepositInfo storage depositInfo = _depositedDtkHero[tokenId];
            depositInfo.depositor = operator;
            depositInfo.hasPlayerId = hasPlayerId;
            depositInfo.playerId = playerId;

            emit OnDtkHeroDeposited(operator, tokenId, hasPlayerId, playerId);
        }
        emit OnERC721Received(_msgSender(), operator, from, tokenId);
        return super.onERC721Received(operator, from, tokenId, data);
    }

    function currentNonce(address walletAddress) public view returns (uint256) {
        return sigNonces[walletAddress];
    }

    function getDtkHeroAddress() external view returns (address) {
        return address(_dtkHero);
    }

    function depositInfoOfDtkHero(uint256 tokenId)
        external
        view
        returns (DepositInfo memory depositInfo)
    {
        return _depositedDtkHero[tokenId];
    }

    function transferERC721(
        address erc721Address,
        address to,
        uint256 tokenId
    ) external onlyOwner {
        if (erc721Address == address(_dtkHero)) {
            DepositInfo storage depositInfo = _depositedDtkHero[tokenId];

            depositInfo.depositor = address(0);
            depositInfo.hasPlayerId = false;
            depositInfo.playerId = 0;

            _dtkHero.safeTransferFrom(address(this), to, tokenId);
        } else {
            IERC721(erc721Address).safeTransferFrom(
                address(this),
                to,
                tokenId,
                ""
            );
        }
        emit TransferERC721(erc721Address, to, tokenId);
    }

    modifier withdrawDTKHeroCompliance(
        uint256 tokenId,
        address wallet,
        uint256 nonce,
        bytes memory sig
    ) {
        require(
            _depositedDtkHero[tokenId].depositor != address(0),
            "Token has not been deposited yet"
        );
        require(_depositedDtkHero[tokenId].depositor == wallet, "Unauthorized");
        require(currentNonce(wallet) == nonce, "Invalid nonce");

        require(
            _validateHashWithTokenId(
                "withdrawDTKHero(uint256,uint256,bytes)",
                wallet,
                tokenId,
                nonce,
                sig
            ),
            "Invalid signature"
        );
        _;
    }

    function withdrawDTKHero(
        uint256 tokenId,
        uint256 _nonce,
        bytes memory sig
    ) external withdrawDTKHeroCompliance(tokenId, _msgSender(), _nonce, sig) {
        DepositInfo storage depositInfo = _depositedDtkHero[tokenId];

        depositInfo.depositor = address(0);
        depositInfo.hasPlayerId = false;
        depositInfo.playerId = 0;

        // increment nonce
        sigNonces[_msgSender()] += 1;

        _dtkHero.safeTransferFrom(address(this), _msgSender(), tokenId, "");

        emit WithdrawDTKHero(_msgSender(), tokenId, _nonce);
    }
}
