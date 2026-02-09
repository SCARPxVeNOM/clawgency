import { ethers, network, run } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  const treasury = process.env.AGENCY_TREASURY?.trim() || deployer.address;

  console.log(`Network: ${network.name}`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Agency treasury owner: ${treasury}`);

  const CampaignEscrowV2 = await ethers.getContractFactory("CampaignEscrowV2");
  const contract = await CampaignEscrowV2.deploy(treasury);
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log(`CampaignEscrowV2 deployed to: ${address}`);

  if ((network.name === "bscTestnet" || network.name === "bscMainnet") && process.env.ETHERSCAN_API_KEY) {
    console.log("Waiting for confirmations before verify...");
    const tx = contract.deploymentTransaction();
    if (tx) {
      await tx.wait(6);
    }

    try {
      await run("verify:verify", {
        address,
        constructorArguments: [treasury]
      });
      console.log("Verification succeeded.");
    } catch (error) {
      console.error("Verification skipped/failed:", error);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
