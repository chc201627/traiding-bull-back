"use stric";
require("dotenv").config();

const TronWeb = require("tronweb");
const TronStation = require("tronstation");

const ENERGY_DELEGATOR_ADDRESS = process.env.ENERGY_DELEGATOR_ADDRESS;
const ENERGY_DELEGATOR_PK = process.env.ENERGY_DELEGATOR_PK;
const tronWeb = new TronWeb({
  fullHost: process.env.TRON_HOST,
  headers: { "TRON-PRO-API-KEY": process.env.TRON_API_KEY },
});
const tronStation = new TronStation(
  new TronWeb(
    process.env.TRON_HOST,
    process.env.TRON_HOST,
    process.env.TRON_HOST,
    "DEF781B45777F63DC6D52314C2369D2B904F2C14C4E35C7C970EDF098E1844B5"
  )
);
const delegatorTronWeb = new TronWeb({
  fullHost: process.env.TRON_HOST,
  headers: { "TRON-PRO-API-KEY": process.env.TRON_API_KEY },
  privateKey: ENERGY_DELEGATOR_PK,
});
const tronApi = require("api")("@tron/v4.5.2#n6ldl7kbtxkq");

const MAX_ENERGY_FOR_USDT_TRANSFER =
  process.env.MAX_ENERGY_FOR_USDT_TRANSFER || 30000;
module.exports = {
  MAX_ENERGY_FOR_USDT_TRANSFER,
};

/**
 * takes  all the energy from the receiverAddress by unfreezing staked trx
 * @param {*} receiverAddress
 */
module.exports.takeEnergy = async (receiverAddress) => {
  if (
    (await getDelegatedResource(ENERGY_DELEGATOR_ADDRESS, receiverAddress))
      .length > 0
  ) {
    // tx is built
    const tx = await delegatorTronWeb.transactionBuilder.unfreezeBalance(
      "ENERGY",
      ENERGY_DELEGATOR_ADDRESS,
      receiverAddress,
      1
    ); // last arg (1) involves multi-signature use-case
    // tx is signed
    const signedtx = await delegatorTronWeb.trx.sign(tx, ENERGY_DELEGATOR_PK);
    // tx is sent to the tron network
    const receipt = await delegatorTronWeb.trx.sendRawTransaction(signedtx);

    // energy is taken - trx is unfrozen
    console.log("hash: " + receipt.txid);
    return receipt;
  }
};

/**
 * Get all resource delegations fromAddress toAddress
 * @param {string} fromAddress
 * @param {string} toAddress
 */
async function getDelegatedResource(fromAddress, toAddress) {
  return await tronApi.getdelegatedresource({
    fromAddress: fromAddress,
    toAddress: toAddress,
  });
}

/**
 * Gives energy to receiverAddress from energy delegator, trx must remain frozen at least 3 days
 * @param {string} receiverAddress
 * @param {number} energyToGive
 */
module.exports.giveEnergy = async (receiverAddress, energyToGive) => {
  // console.log({ receiverAddress, energyToGive });
  console.log(tronWeb.toHex(ENERGY_DELEGATOR_ADDRESS));
  const resources = await tronWeb.trx.getAccountResources(
    ENERGY_DELEGATOR_ADDRESS
  );

  console.log("resources", { resources });
  const energyPerTRXFrozen =
    resources.TotalEnergyLimit / resources.TotalEnergyWeight;
  console.log("energyPerTRXFrozen", { energyPerTRXFrozen });
  const trxToFreeze = Math.trunc(energyToGive / energyPerTRXFrozen);
  console.log(
    "The amount of energy obtained",
    47_943 / (resources.TotalEnergyWeight * 90_000_000_000)
  );
  // Account activation
  const receiverAccount = await getTronAccount(receiverAddress);
  if (!receiverAccount.balance) {
    await activateAccount(receiverAddress);
  }
  console.log("receiverAccount", { receiverAccount, trxToFreeze });
  try {
    console.log({
      sun: Math.floor(tronWeb.toSun(trxToFreeze)),
      days: 3,
      energy: "ENERGY",
      ENERGY_DELEGATOR_ADDRESS,
      receiverAddress,
    });
    const tx = await delegatorTronWeb.transactionBuilder.freezeBalance(
      Math.floor(tronWeb.toSun(trxToFreeze)),
      3,
      "ENERGY",
      ENERGY_DELEGATOR_ADDRESS,
      receiverAddress
    );
    // Minimum 3 days trx must remain frozen
    console.log("tx", { tx });
    // tx is signed
    const signedtx = await delegatorTronWeb.trx.sign(tx, ENERGY_DELEGATOR_PK);
    // tx is sent to the tron network
    console.log("signedtx", { signedtx });
    const receipt = await delegatorTronWeb.trx.sendRawTransaction(signedtx);
    console.log("receipt", { receipt });
    return receipt;
  } catch (error) {
    console.log("error", { error });
  }

  // energy is delegated - trx is frozen
};

/**
 * Sends SUN from fromAddress to toAddress
 * Precondition: fromAddress has enough resources for SUN transfer
 * @param {string} fromAddress
 * @param {string} fromAddressPK
 * @param {string} toAddress
 * @param {number} sun
 */
async function sendSunToAccount(fromAddress, fromAddressPK, toAddress, sun) {
  console.log("Sending ", sun, " from ", fromAddress, " to ", toAddress);
  const tradeobj = await delegatorTronWeb.transactionBuilder.sendTrx(
    toAddress,
    sun,
    fromAddress
  );
  const signedtxn = await delegatorTronWeb.trx.sign(tradeobj, fromAddressPK);
  const receipt = await delegatorTronWeb.trx
    .sendRawTransaction(signedtxn)
    .then((output) => {
      console.log("- Output:", output, "\n");
    });
  console.log(receipt);
}

/**
 * Activates toAddress by sending 1 SUN from energy delegator
 * @param {string} toAddress
 */
async function activateAccount(toAddress) {
  console.log("Activating by sending 1 sun: ", toAddress);
  await sendSunToAccount(
    ENERGY_DELEGATOR_ADDRESS,
    ENERGY_DELEGATOR_PK,
    toAddress,
    1
  );
}

/**
 * Gets Tron Account from address
 * @param {string} address
 * @returns
 */
async function getTronAccount(address) {
  console.log("Tron account of ", address);
  return await tronWeb.trx.getAccount(address);
}

/**
 * Takes into account burnable trx
 * @param {string} address
 * @returns
 */
module.exports.getAccountTotalEnergy = async (address) => {
  const accountResources = await tronWeb.trx.getAccountResources(address);

  const accountBalanceSun = await tronWeb.trx.getBalance(address);

  const energyPerTRXBurned = await tronStation.energy.trx2BurnedEnergy(1);

  const accountEnergy = accountResources.EnergyLimit
    ? accountResources.EnergyLimit
    : 0;
  return (
    tronWeb.fromSun(accountBalanceSun) * energyPerTRXBurned + accountEnergy
  );
};

module.exports.signatureValidation = async (
  signedValue,
  cleanValue,
  address,
  deadline
) => {
  if (!deadlineValid(deadline)) {
    console.log("the signature is dead");
    return false;
  }
  console.log("sign value ", cleanValue);

  var HexStr = tronWeb.toHex(cleanValue);
  console.log("sign 1 ", HexStr);

  try {
    const isValid = await tronWeb.trx.verifyMessage(
      HexStr,
      signedValue,
      address
    );
    console.log(`The sginature validation  is  ${isValid}`);
    return isValid;
  } catch (err) {
    console.log(`The sginature validation  has some error ${err}`);

    return false;
  }
};

const deadlineValid = (deadline) => {
  const deadlineTime = new Date(deadline);
  const currentTime = new Date();
  console.log("dt:", deadlineTime, "ct", currentTime);

  if (currentTime > deadlineTime) {
    return false;
  }
  return true;
};
