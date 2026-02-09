import { expect } from "chai";
import { ethers } from "hardhat";

describe("CampaignEscrowV2", function () {
  async function deployFixture() {
    const [deployer, brand, influencer, treasury, other] = await ethers.getSigners();

    const CampaignEscrowV2 = await ethers.getContractFactory("CampaignEscrowV2");
    const contract = await CampaignEscrowV2.deploy(treasury.address);
    await contract.waitForDeployment();

    return { deployer, brand, influencer, treasury, other, contract };
  }

  it("creates campaign, accepts deposit, approves milestones, and splits payouts", async function () {
    const { brand, influencer, treasury, contract } = await deployFixture();

    const milestones = [ethers.parseEther("1"), ethers.parseEther("2")];
    const total = milestones[0] + milestones[1];
    const feeBps = 1_000n; // 10%

    await expect(
      contract.connect(brand).createCampaign(brand.address, influencer.address, milestones, feeBps)
    )
      .to.emit(contract, "CampaignCreated")
      .withArgs(1n, brand.address, influencer.address, total, feeBps);

    await expect(contract.connect(brand).depositFunds(1n, { value: total }))
      .to.emit(contract, "FundsDeposited")
      .withArgs(1n, brand.address, total);

    const campaignAfterDeposit = await contract.getCampaign(1n);
    expect(campaignAfterDeposit[3]).to.equal(total); // totalEscrowed
    expect(campaignAfterDeposit[7]).to.equal(1n); // Funded

    // Milestone 0 flow
    await expect(contract.connect(influencer).submitProof(1n, "ipfs://proof-m0"))
      .to.emit(contract, "ProofSubmitted")
      .withArgs(1n, 0n, influencer.address, "ipfs://proof-m0");

    await expect(contract.connect(brand).approveMilestone(1n, 0n))
      .to.emit(contract, "MilestoneApproved")
      .withArgs(1n, 0n, brand.address);

    const influencerBeforeM0 = await ethers.provider.getBalance(influencer.address);
    const treasuryBeforeM0 = await ethers.provider.getBalance(treasury.address);

    await expect(contract.connect(brand).releaseFunds(1n))
      .to.emit(contract, "FundsReleased")
      .withArgs(1n, milestones[0], ethers.parseEther("0.9"), ethers.parseEther("0.1"));

    const influencerAfterM0 = await ethers.provider.getBalance(influencer.address);
    const treasuryAfterM0 = await ethers.provider.getBalance(treasury.address);
    expect(influencerAfterM0 - influencerBeforeM0).to.equal(ethers.parseEther("0.9"));
    expect(treasuryAfterM0 - treasuryBeforeM0).to.equal(ethers.parseEther("0.1"));

    // Milestone 1 flow
    await contract.connect(influencer).submitProof(1n, "ipfs://proof-m1");
    await contract.connect(brand).approveMilestone(1n, 1n);

    const influencerBeforeM1 = await ethers.provider.getBalance(influencer.address);
    const treasuryBeforeM1 = await ethers.provider.getBalance(treasury.address);

    await expect(contract.connect(brand).releaseFunds(1n))
      .to.emit(contract, "FundsReleased")
      .withArgs(1n, milestones[1], ethers.parseEther("1.8"), ethers.parseEther("0.2"));

    const influencerAfterM1 = await ethers.provider.getBalance(influencer.address);
    const treasuryAfterM1 = await ethers.provider.getBalance(treasury.address);
    expect(influencerAfterM1 - influencerBeforeM1).to.equal(ethers.parseEther("1.8"));
    expect(treasuryAfterM1 - treasuryBeforeM1).to.equal(ethers.parseEther("0.2"));

    const campaignAfterAllReleases = await contract.getCampaign(1n);
    expect(campaignAfterAllReleases[4]).to.equal(total); // totalReleased
    expect(campaignAfterAllReleases[7]).to.equal(2n); // Completed
    expect(campaignAfterAllReleases[6]).to.equal(1n); // reputationScore incremented
  });

  it("rejects milestone approval without proof and unauthorized actions", async function () {
    const { brand, influencer, other, contract } = await deployFixture();

    await contract
      .connect(brand)
      .createCampaign(brand.address, influencer.address, [ethers.parseEther("1")], 500n);

    await expect(contract.connect(other).depositFunds(1n, { value: ethers.parseEther("1") }))
      .to.be.revertedWithCustomError(contract, "Unauthorized");

    await expect(contract.connect(brand).approveMilestone(1n, 0n))
      .to.be.revertedWithCustomError(contract, "MilestoneProofMissing");

    await expect(contract.connect(other).submitProof(1n, "ipfs://proof"))
      .to.be.revertedWithCustomError(contract, "Unauthorized");
  });

  it("rejects release when nothing is approved", async function () {
    const { brand, influencer, contract } = await deployFixture();

    await contract
      .connect(brand)
      .createCampaign(brand.address, influencer.address, [ethers.parseEther("1")], 250n);
    await contract.connect(brand).depositFunds(1n, { value: ethers.parseEther("1") });

    await expect(contract.connect(brand).releaseFunds(1n))
      .to.be.revertedWithCustomError(contract, "NothingToRelease");
  });
});
