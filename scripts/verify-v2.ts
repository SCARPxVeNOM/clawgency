import { network, run } from "hardhat";

async function main() {
  const contractAddress =
    network.name === "bscMainnet"
      ? process.env.CONTRACT_ADDRESS_MAINNET
      : process.env.CONTRACT_ADDRESS_TESTNET;
  const treasury = process.env.AGENCY_TREASURY;

  if (!contractAddress) {
    throw new Error("Set CONTRACT_ADDRESS_TESTNET or CONTRACT_ADDRESS_MAINNET before verification.");
  }
  if (!treasury) {
    throw new Error("Set AGENCY_TREASURY before verification.");
  }

  await run("verify:verify", {
    address: contractAddress,
    constructorArguments: [treasury]
  });

  console.log(`Verified ${contractAddress} on ${network.name}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
