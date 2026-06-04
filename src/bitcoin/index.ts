import ecc from "@bitcoinerlab/secp256k1";
import { PublicKey } from "@solana/web3.js";
import {
  initEccLib,
  Network,
  networks,
  payments,
  Psbt,
  script,
} from "bitcoinjs-lib";
import { toXOnly } from "bitcoinjs-lib/src/psbt/bip371";
import { Taptree } from "bitcoinjs-lib/src/types";
import { toHex } from "uint8array-tools";

import { BitcoinAddressType } from "../zpl/two-way-peg/types";
import { UTXO } from "./types";
import {
  estimatedTransactionVBytes,
  getTransactionVBytesPrediction,
} from "./utils";

export * from "./types";

initEccLib(ecc);

const DUST_AMOUNT = 546;

/**
 * Calculate the hot reserve bucket address based on the cold reserve address's internal key and the user's unlocking script.
 * * the key_path_spend_public_key and script_path_spend_public_key must be tweaked public keys.
 * @param {Buffer} keyPathSpendPublic_key - cold reserve address's internal key (must be tweaked public key)
 * @param {Buffer} scriptPathSpendPublic_key - user's unlocking script (must be tweaked public key)
 * @param {number} lockTime - the lock time of the hot reserve address
 * @param {bitcoin.Network} network - the network to use
 * @return - the hot reserve address and the script
 */
export function deriveHotReserveAddress(
  // tweaked pubkey that could directly spend the UTXO, usually the address of zeus node operator
  keyPathSpendPublic_key: Buffer,
  // user's unlocking script
  scriptPathSpendPublic_key: Buffer,
  lockTime: number,
  network: Network
): {
  address: string;
  script: Buffer;
  hash: Buffer | undefined;
  output: Buffer | undefined;
  pubkey: Buffer | undefined;
} {
  // bitcoin csv encoding sample
  // * ref: https://github.com/bitcoinjs/bitcoinjs-lib/blob/151173f05e26a9af7c98d8d1e3f90e97185955f1/test/integration/csv.spec.ts#L61
  const targetScript = `${toHex(script.number.encode(lockTime))} OP_CHECKSEQUENCEVERIFY OP_DROP ${toXOnly(scriptPathSpendPublic_key).toString("hex")} OP_CHECKSIG`;

  const tap = script.fromASM(targetScript);

  const script_p2tr = payments.p2tr({
    internalPubkey: toXOnly(keyPathSpendPublic_key),
    scriptTree: {
      output: tap,
    },
    network,
  });

  if (!script_p2tr.address) {
    throw new Error("Failed to calculate the address");
  }

  return {
    address: script_p2tr.address,
    script: tap,
    hash: script_p2tr.hash,
    output: script_p2tr.output,
    pubkey: script_p2tr.pubkey,
  };
}

const isSpendable = (
  utxo: UTXO,
  satoshisPerVBytes: number,
  addressType: BitcoinAddressType = BitcoinAddressType.P2tr
): boolean => {
  const { input: inputVBytes } = getTransactionVBytesPrediction(addressType);
  return (
    BigInt(Math.round(utxo.satoshis)) >
    BigInt(Math.ceil(satoshisPerVBytes * inputVBytes))
  );
};

// Build tap tree following the same logic as zpl build_tap_tree
function buildTapTree(taps: { output: Buffer }[]): Taptree {
  switch (taps.length) {
    case 1:
      return taps[0];
    case 2:
      return [taps[0], taps[1]];
    case 3:
      return [[taps[0], taps[1]], taps[2]];
    case 4:
      return [
        [taps[0], taps[1]],
        [taps[2], taps[3]],
      ];
    case 5:
      return [
        [
          [taps[0], taps[1]],
          [taps[2], taps[3]],
        ],
        taps[4],
      ];
    case 6:
      return [
        [
          [taps[0], taps[1]],
          [taps[2], taps[3]],
        ],
        [taps[4], taps[5]],
      ];
    case 7:
      return [
        [
          [taps[0], taps[1]],
          [taps[2], taps[3]],
        ],
        [[taps[4], taps[5]], taps[6]],
      ];
    case 8:
      return [
        [
          [taps[0], taps[1]],
          [taps[2], taps[3]],
        ],
        [
          [taps[4], taps[5]],
          [taps[6], taps[7]],
        ],
      ];
    default:
      throw new Error(
        `Too many recovery keys. Maximum 8 allowed, got ${taps.length}`
      );
  }
}

export function deriveEntityDerivedReserveAddress(
  assetOwner: PublicKey,
  // tweaked pubkey that could directly spend the UTXO, usually the address of zeus node operator
  keyPathSpendPublicKey: Buffer,
  recoveryParameters: {
    scriptPathSpendPublicKey: Buffer;
    lockTime: number;
  }[],
  network: Network
): {
  address: string;
  hash: Buffer | undefined;
  output: Buffer | undefined;
  pubkey: Buffer | undefined;
} {
  if (recoveryParameters.length === 0) {
    throw new Error("Recovery parameters cannot be empty");
  }

  const opRetAsm = `OP_RETURN ${assetOwner.toBuffer().toString("hex")}`;
  const opRetLeaf = script.fromASM(opRetAsm);

  // bitcoin csv encoding sample
  // * ref: https://github.com/bitcoinjs/bitcoinjs-lib/blob/151173f05e26a9af7c98d8d1e3f90e97185955f1/test/integration/csv.spec.ts#L61
  const csvLeaves = recoveryParameters.map((param) => {
    const csvAsm = `${toHex(script.number.encode(param.lockTime))} OP_CHECKSEQUENCEVERIFY OP_DROP ${toXOnly(param.scriptPathSpendPublicKey).toString("hex")} OP_CHECKSIG`;
    return { output: script.fromASM(csvAsm) };
  });

  const allTaps = [{ output: opRetLeaf }, ...csvLeaves];

  const scriptTree = buildTapTree(allTaps);

  const script_p2tr = payments.p2tr({
    internalPubkey: toXOnly(keyPathSpendPublicKey),
    scriptTree,
    network,
  });

  if (script_p2tr.address === undefined) {
    throw new Error("Failed to calculate the address");
  }

  return {
    address: script_p2tr.address,
    hash: script_p2tr.hash,
    output: script_p2tr.output,
    pubkey: script_p2tr.pubkey,
  };
}

/**
 *
 * @param utxos available utxos
 * @param reserveAddress reserve address in p2tr format
 * @param amount amount to deposit (satoshis)
 * @param userXOnlyPubKey userXOnlyPubKey
 * @param feeRate fee rate in satoshis per vbyte
 * @param network network
 * @returns
 */
export const buildDepositTransaction = (
  utxos: UTXO[],
  reserveAddress: string,
  amount: number,
  userXOnlyPubKey: Buffer,
  feeRate: number,
  network: networks.Network,
  addressType: BitcoinAddressType = BitcoinAddressType.P2tr
): {
  psbt: Psbt;
  returnAmount: number;
  usedUTXOs: UTXO[];
} => {
  if (utxos.length === 0) {
    throw new Error("No UTXOs available");
  }

  if (feeRate < 1) {
    throw new Error("Invalid satoshisPerVBytes");
  }

  const sortedUTXOs = utxos.toSorted((a, b) => a.satoshis - b.satoshis);

  const spendableUTXOs = sortedUTXOs.filter((utxo) =>
    isSpendable(utxo, feeRate)
  );

  if (spendableUTXOs.length === 0) {
    throw new Error("No spendable UTXOs available");
  }

  const maxSpendableAmount = estimateMaxSpendableAmount(utxos, feeRate);

  if (maxSpendableAmount < amount) {
    throw new Error("Insufficient balance");
  }

  const isDepositAll = amount === maxSpendableAmount;

  const { output, address } = payments.p2tr({
    internalPubkey: userXOnlyPubKey,
    network: network,
  });

  if (!output) {
    throw new Error("Invalid output");
  }

  if (!address) {
    throw new Error("Invalid address");
  }

  const psbt = new Psbt({ network }).setVersion(2);

  let totalVBytes = estimatedTransactionVBytes(
    addressType,
    0,
    isDepositAll ? 1 : 2
  );
  let preparedAmount = BigInt(0);

  const usedUTXOs: UTXO[] = [];
  for (const utxo of spendableUTXOs) {
    psbt.addInput({
      hash: utxo.transaction_id,
      index: utxo.transaction_index,
      witnessUtxo: {
        script: output,
        value: utxo.satoshis,
      },
      tapInternalKey: userXOnlyPubKey,
    });
    preparedAmount += BigInt(utxo.satoshis);
    usedUTXOs.push(utxo);
    totalVBytes = estimatedTransactionVBytes(
      addressType,
      usedUTXOs.length,
      isDepositAll ? 1 : 2
    );
    if (preparedAmount >= BigInt(amount) + BigInt(totalVBytes * feeRate)) {
      break;
    }
  }

  const returnAmount = Number(
    preparedAmount -
      BigInt(amount) -
      BigInt(feeRate) * BigInt(Math.ceil(totalVBytes))
  );

  if (returnAmount < 0) {
    throw new Error("Insufficient balance for fee");
  }

  psbt.addOutput({
    address: reserveAddress,
    value: amount,
  });

  if (returnAmount != 0 && returnAmount > DUST_AMOUNT) {
    psbt.addOutput({
      address: address,
      value: returnAmount,
    });
  }

  psbt.setMaximumFeeRate(feeRate + 1);

  return {
    psbt,
    returnAmount: Number(returnAmount),
    usedUTXOs,
  };
};

/**
 *
 * @param utxos available utxos
 * @param feeRate fee rate in satoshis per vbyte
 * @returns spendable amount in satoshis
 */
export const estimateMaxSpendableAmount = (
  utxos: UTXO[],
  feeRate: number,
  addressType: BitcoinAddressType = BitcoinAddressType.P2tr
): number => {
  if (utxos.length === 0) {
    return 0;
  }

  const spendableUTXOs = utxos.filter((utxo) => isSpendable(utxo, feeRate));

  if (spendableUTXOs.length === 0) {
    return 0;
  }

  const totalSpendableAmount = spendableUTXOs.reduce(
    (acc, utxo) => acc + BigInt(utxo.satoshis),
    BigInt(0)
  );

  const totalVBytes = estimatedTransactionVBytes(
    addressType,
    spendableUTXOs.length,
    1 // Spend all means only 1 output
  );

  const maxSpendableAmount =
    totalSpendableAmount - BigInt(feeRate) * BigInt(Math.ceil(totalVBytes));

  return Number(maxSpendableAmount);
};
