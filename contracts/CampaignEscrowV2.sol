// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {Address} from "@openzeppelin/contracts/utils/Address.sol";

/// @title CampaignEscrowV2
/// @notice Professional escrow contract for milestone-based influencer campaigns on BNB Chain.
/// @dev Human-in-the-loop approvals are enforced by requiring brand milestone approval before payout release.
contract CampaignEscrowV2 is Ownable, ReentrancyGuard, Pausable {
    using Address for address payable;

    uint16 public constant BASIS_POINTS = 10_000;
    uint16 public constant MAX_AGENCY_FEE_BPS = 3_000; // 30%

    enum CampaignState {
        Created,
        Funded,
        Completed,
        Cancelled
    }

    struct Campaign {
        address brand;
        address influencer;
        uint256 totalMilestoneAmount;
        uint256 totalEscrowed;
        uint256 totalReleased;
        uint16 agencyFeeBps;
        uint256 reputationScore;
        CampaignState state;
        uint256[] milestoneAmounts;
        bool[] milestoneApproved;
        bool[] milestonePaid;
        string[] milestoneProofHashes;
    }

    /// @notice Total number of campaigns created.
    uint256 public campaignCount;

    /// @notice Campaign storage by ID.
    mapping(uint256 => Campaign) private _campaigns;

    /// @notice Reputation score tracker for influencers.
    mapping(address => uint256) public influencerReputation;

    event CampaignCreated(
        uint256 indexed campaignId,
        address indexed brand,
        address indexed influencer,
        uint256 totalMilestoneAmount,
        uint16 agencyFeeBps
    );
    event FundsDeposited(uint256 indexed campaignId, address indexed brand, uint256 amount);
    event ProofSubmitted(
        uint256 indexed campaignId,
        uint256 indexed milestoneIndex,
        address indexed influencer,
        string proofHash
    );
    event MilestoneApproved(uint256 indexed campaignId, uint256 indexed milestoneIndex, address indexed brand);
    event FundsReleased(
        uint256 indexed campaignId,
        uint256 grossAmount,
        uint256 influencerAmount,
        uint256 agencyFeeAmount
    );

    error CampaignNotFound(uint256 campaignId);
    error InvalidAddress();
    error InvalidAgencyFee();
    error InvalidMilestoneConfiguration();
    error Unauthorized();
    error InvalidMilestoneIndex();
    error EmptyProofHash();
    error MilestoneProofMissing();
    error MilestoneAlreadyApproved();
    error NothingToRelease();
    error TransferFailed();

    /// @notice Creates the escrow contract with an agency treasury owner.
    /// @param initialOwner Address that receives agency fees and administrative rights.
    constructor(address initialOwner) Ownable(initialOwner) {
        if (initialOwner == address(0)) {
            revert InvalidAddress();
        }
    }

    /// @notice Creates a new campaign with milestone schedule and fee policy.
    /// @param brand Brand wallet that controls approvals and deposits.
    /// @param influencer Influencer wallet that submits proof and receives payouts.
    /// @param milestones Milestone amounts denominated in wei. Sum is total campaign value.
    /// @param agencyFee Fee in basis points (e.g. 500 = 5%).
    function createCampaign(
        address brand,
        address influencer,
        uint256[] memory milestones,
        uint256 agencyFee
    ) external whenNotPaused returns (uint256 campaignId) {
        if (brand == address(0) || influencer == address(0)) {
            revert InvalidAddress();
        }
        if (agencyFee > MAX_AGENCY_FEE_BPS) {
            revert InvalidAgencyFee();
        }
        if (milestones.length == 0) {
            revert InvalidMilestoneConfiguration();
        }

        uint256 totalMilestoneAmount;
        for (uint256 i = 0; i < milestones.length; i++) {
            if (milestones[i] == 0) {
                revert InvalidMilestoneConfiguration();
            }
            totalMilestoneAmount += milestones[i];
        }
        if (totalMilestoneAmount == 0) {
            revert InvalidMilestoneConfiguration();
        }

        campaignId = ++campaignCount;
        Campaign storage campaign = _campaigns[campaignId];
        campaign.brand = brand;
        campaign.influencer = influencer;
        campaign.totalMilestoneAmount = totalMilestoneAmount;
        campaign.agencyFeeBps = uint16(agencyFee);
        campaign.reputationScore = influencerReputation[influencer];
        campaign.state = CampaignState.Created;

        for (uint256 i = 0; i < milestones.length; i++) {
            campaign.milestoneAmounts.push(milestones[i]);
            campaign.milestoneApproved.push(false);
            campaign.milestonePaid.push(false);
            campaign.milestoneProofHashes.push("");
        }

        emit CampaignCreated(campaignId, brand, influencer, totalMilestoneAmount, campaign.agencyFeeBps);
    }

    /// @notice Deposits native BNB into campaign escrow.
    /// @param campaignId Campaign identifier.
    function depositFunds(uint256 campaignId) external payable whenNotPaused {
        Campaign storage campaign = _campaign(campaignId);
        if (msg.sender != campaign.brand) {
            revert Unauthorized();
        }
        if (msg.value == 0) {
            revert InvalidMilestoneConfiguration();
        }

        campaign.totalEscrowed += msg.value;
        if (campaign.totalEscrowed >= campaign.totalMilestoneAmount && campaign.state == CampaignState.Created) {
            campaign.state = CampaignState.Funded;
        }

        emit FundsDeposited(campaignId, msg.sender, msg.value);
    }

    /// @notice Submits proof for the next unpaid milestone.
    /// @param campaignId Campaign identifier.
    /// @param proofHash Off-chain proof hash (for example IPFS CID or URL hash).
    function submitProof(uint256 campaignId, string memory proofHash) external whenNotPaused {
        Campaign storage campaign = _campaign(campaignId);
        if (msg.sender != campaign.influencer) {
            revert Unauthorized();
        }
        if (bytes(proofHash).length == 0) {
            revert EmptyProofHash();
        }

        uint256 milestoneIndex = _nextProofMilestoneIndex(campaign);
        if (milestoneIndex >= campaign.milestoneAmounts.length) {
            revert InvalidMilestoneIndex();
        }

        campaign.milestoneProofHashes[milestoneIndex] = proofHash;
        emit ProofSubmitted(campaignId, milestoneIndex, msg.sender, proofHash);
    }

    /// @notice Brand approves a specific milestone after reviewing proof.
    /// @param campaignId Campaign identifier.
    /// @param milestoneIndex Milestone index to approve.
    function approveMilestone(uint256 campaignId, uint256 milestoneIndex) external whenNotPaused {
        Campaign storage campaign = _campaign(campaignId);
        if (msg.sender != campaign.brand) {
            revert Unauthorized();
        }
        if (milestoneIndex >= campaign.milestoneAmounts.length) {
            revert InvalidMilestoneIndex();
        }
        if (campaign.milestoneApproved[milestoneIndex]) {
            revert MilestoneAlreadyApproved();
        }
        if (bytes(campaign.milestoneProofHashes[milestoneIndex]).length == 0) {
            revert MilestoneProofMissing();
        }

        campaign.milestoneApproved[milestoneIndex] = true;
        emit MilestoneApproved(campaignId, milestoneIndex, msg.sender);
    }

    /// @notice Releases all currently approved and unpaid milestones.
    /// @dev Applies checks-effects-interactions and fee splitting to agency treasury owner.
    /// @param campaignId Campaign identifier.
    function releaseFunds(uint256 campaignId) external nonReentrant whenNotPaused {
        Campaign storage campaign = _campaign(campaignId);
        if (msg.sender != campaign.brand) {
            revert Unauthorized();
        }

        uint256 releasableGross;
        for (uint256 i = 0; i < campaign.milestoneAmounts.length; i++) {
            if (campaign.milestoneApproved[i] && !campaign.milestonePaid[i]) {
                releasableGross += campaign.milestoneAmounts[i];
                campaign.milestonePaid[i] = true;
            }
        }

        if (releasableGross == 0) {
            revert NothingToRelease();
        }
        if (campaign.totalEscrowed - campaign.totalReleased < releasableGross) {
            revert NothingToRelease();
        }

        uint256 agencyFeeAmount = (releasableGross * campaign.agencyFeeBps) / BASIS_POINTS;
        uint256 influencerAmount = releasableGross - agencyFeeAmount;
        campaign.totalReleased += releasableGross;

        if (campaign.totalReleased >= campaign.totalMilestoneAmount) {
            campaign.state = CampaignState.Completed;
            influencerReputation[campaign.influencer] += 1;
            campaign.reputationScore = influencerReputation[campaign.influencer];
        } else if (campaign.state == CampaignState.Created && campaign.totalEscrowed >= campaign.totalMilestoneAmount) {
            campaign.state = CampaignState.Funded;
        }

        if (agencyFeeAmount > 0) {
            payable(owner()).sendValue(agencyFeeAmount);
        }
        payable(campaign.influencer).sendValue(influencerAmount);

        emit FundsReleased(campaignId, releasableGross, influencerAmount, agencyFeeAmount);
    }

    /// @notice Returns campaign metadata for dashboard rendering.
    function getCampaign(
        uint256 campaignId
    )
        external
        view
        returns (
            address brand,
            address influencer,
            uint256 totalMilestoneAmount,
            uint256 totalEscrowed,
            uint256 totalReleased,
            uint16 agencyFeeBps,
            uint256 reputationScore,
            CampaignState state,
            uint256 milestoneCount
        )
    {
        Campaign storage campaign = _campaign(campaignId);
        return (
            campaign.brand,
            campaign.influencer,
            campaign.totalMilestoneAmount,
            campaign.totalEscrowed,
            campaign.totalReleased,
            campaign.agencyFeeBps,
            campaign.reputationScore,
            campaign.state,
            campaign.milestoneAmounts.length
        );
    }

    /// @notice Returns data for a single milestone.
    function getMilestone(
        uint256 campaignId,
        uint256 milestoneIndex
    ) external view returns (uint256 amount, bool approved, bool paid, string memory proofHash) {
        Campaign storage campaign = _campaign(campaignId);
        if (milestoneIndex >= campaign.milestoneAmounts.length) {
            revert InvalidMilestoneIndex();
        }
        return (
            campaign.milestoneAmounts[milestoneIndex],
            campaign.milestoneApproved[milestoneIndex],
            campaign.milestonePaid[milestoneIndex],
            campaign.milestoneProofHashes[milestoneIndex]
        );
    }

    /// @notice Pauses mutating operations for emergency response.
    function pause() external onlyOwner {
        _pause();
    }

    /// @notice Unpauses mutating operations for normal operation.
    function unpause() external onlyOwner {
        _unpause();
    }

    function _campaign(uint256 campaignId) internal view returns (Campaign storage campaign) {
        if (campaignId == 0 || campaignId > campaignCount) {
            revert CampaignNotFound(campaignId);
        }
        return _campaigns[campaignId];
    }

    function _nextProofMilestoneIndex(Campaign storage campaign) internal view returns (uint256) {
        for (uint256 i = 0; i < campaign.milestoneAmounts.length; i++) {
            if (!campaign.milestonePaid[i] && bytes(campaign.milestoneProofHashes[i]).length == 0) {
                return i;
            }
        }
        return campaign.milestoneAmounts.length;
    }
}
