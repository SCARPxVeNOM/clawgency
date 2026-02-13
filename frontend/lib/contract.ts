const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export const campaignEscrowV2Address = (process.env.NEXT_PUBLIC_CAMPAIGN_ESCROW_V2_ADDRESS ??
  ZERO_ADDRESS) as `0x${string}`;

export const campaignEscrowV2Abi = [
  {
    type: "function",
    name: "campaignCount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }]
  },
  {
    type: "function",
    name: "createCampaign",
    stateMutability: "nonpayable",
    inputs: [
      { name: "brand", type: "address" },
      { name: "influencer", type: "address" },
      { name: "milestones", type: "uint256[]" },
      { name: "agencyFee", type: "uint256" }
    ],
    outputs: [{ name: "campaignId", type: "uint256" }]
  },
  {
    type: "function",
    name: "depositFunds",
    stateMutability: "payable",
    inputs: [{ name: "campaignId", type: "uint256" }],
    outputs: []
  },
  {
    type: "function",
    name: "submitProof",
    stateMutability: "nonpayable",
    inputs: [
      { name: "campaignId", type: "uint256" },
      { name: "proofHash", type: "string" }
    ],
    outputs: []
  },
  {
    type: "function",
    name: "approveMilestone",
    stateMutability: "nonpayable",
    inputs: [
      { name: "campaignId", type: "uint256" },
      { name: "milestoneIndex", type: "uint256" }
    ],
    outputs: []
  },
  {
    type: "function",
    name: "releaseFunds",
    stateMutability: "nonpayable",
    inputs: [{ name: "campaignId", type: "uint256" }],
    outputs: []
  },
  {
    type: "function",
    name: "cancelCampaign",
    stateMutability: "nonpayable",
    inputs: [{ name: "campaignId", type: "uint256" }],
    outputs: []
  },
  {
    type: "function",
    name: "getCampaign",
    stateMutability: "view",
    inputs: [{ name: "campaignId", type: "uint256" }],
    outputs: [
      { name: "brand", type: "address" },
      { name: "influencer", type: "address" },
      { name: "totalMilestoneAmount", type: "uint256" },
      { name: "totalEscrowed", type: "uint256" },
      { name: "totalReleased", type: "uint256" },
      { name: "agencyFeeBps", type: "uint16" },
      { name: "reputationScore", type: "uint256" },
      { name: "state", type: "uint8" },
      { name: "milestoneCount", type: "uint256" }
    ]
  },
  {
    type: "function",
    name: "getMilestone",
    stateMutability: "view",
    inputs: [
      { name: "campaignId", type: "uint256" },
      { name: "milestoneIndex", type: "uint256" }
    ],
    outputs: [
      { name: "amount", type: "uint256" },
      { name: "approved", type: "bool" },
      { name: "paid", type: "bool" },
      { name: "proofHash", type: "string" }
    ]
  },
  {
    type: "event",
    name: "CampaignCreated",
    anonymous: false,
    inputs: [
      { indexed: true, name: "campaignId", type: "uint256" },
      { indexed: true, name: "brand", type: "address" },
      { indexed: true, name: "influencer", type: "address" },
      { indexed: false, name: "totalMilestoneAmount", type: "uint256" },
      { indexed: false, name: "agencyFeeBps", type: "uint16" }
    ]
  },
  {
    type: "event",
    name: "FundsDeposited",
    anonymous: false,
    inputs: [
      { indexed: true, name: "campaignId", type: "uint256" },
      { indexed: true, name: "brand", type: "address" },
      { indexed: false, name: "amount", type: "uint256" }
    ]
  },
  {
    type: "event",
    name: "ProofSubmitted",
    anonymous: false,
    inputs: [
      { indexed: true, name: "campaignId", type: "uint256" },
      { indexed: true, name: "milestoneIndex", type: "uint256" },
      { indexed: true, name: "influencer", type: "address" },
      { indexed: false, name: "proofHash", type: "string" }
    ]
  },
  {
    type: "event",
    name: "MilestoneApproved",
    anonymous: false,
    inputs: [
      { indexed: true, name: "campaignId", type: "uint256" },
      { indexed: true, name: "milestoneIndex", type: "uint256" },
      { indexed: false, name: "brand", type: "address" }
    ]
  },
  {
    type: "event",
    name: "FundsReleased",
    anonymous: false,
    inputs: [
      { indexed: true, name: "campaignId", type: "uint256" },
      { indexed: false, name: "grossAmount", type: "uint256" },
      { indexed: false, name: "influencerAmount", type: "uint256" },
      { indexed: false, name: "agencyFeeAmount", type: "uint256" }
    ]
  },
  {
    type: "event",
    name: "CampaignCancelled",
    anonymous: false,
    inputs: [
      { indexed: true, name: "campaignId", type: "uint256" },
      { indexed: true, name: "actor", type: "address" },
      { indexed: false, name: "refundedAmount", type: "uint256" }
    ]
  }
] as const;

export const isContractConfigured = campaignEscrowV2Address.toLowerCase() !== ZERO_ADDRESS;


