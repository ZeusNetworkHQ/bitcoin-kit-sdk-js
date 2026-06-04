import { BitcoinAddressType } from "../zpl/two-way-peg/types";

/**
 * Ref: https://github.com/bitcoinops/bitcoinops.github.io
 */
const SIZE = {
  N_VERSION: 4,
  N_IN: 1,
  N_OUT: 1,
  MARKER_AND_FLAG: 0.5,
  N_LOCKTIME: 4,

  // Input
  OUTPOINT: 36,
  SCRIPT_SIG_LENGTH_SMALL: 1,
  SCRIPT_SIG_LENGTH_BIG: 3,
  P2PKH_SS: 107, // 1 + 72 + 1 + 33
  P2SH_SS: 254, // 1 + 1 + 72 + 1 + 72 + 1 + 1 + (1 + 1 + 33 + 1 + 33 + 1 + 33 + 1 + 1)
  N_SEQUENCE: 4,
  P2WPKH_WITNESS: 27, // (1 + 73 + 34)/4
  P2WSH_WITNESS: 63.5, // (1 + 1 + 73 + 73 + 106)/4
  P2TR_WITNESS: 16.5, // (1 + 65)/4

  // Output
  N_VALUE: 8,
  SCRIPT_PUBKEY_LENGTH: 1,
  P2PKH_SPK: 25, // 1 + 1 + 1 + 20 + 1 + 1
  P2WPKH_SPK: 22, // 1 + 1 + 20
  P2SH_SPK: 23, // 1 + 1 + 20 + 1
  P2WSH_SPK: 34, // 1 + 1 + 32
  P2TR_SPK: 34, // 1 + 1 + 32

  // Common elements
  ECDSA_PUBKEY: 33,
  ECDSA_SIGNATURE: 72,
  ECDSA_SIGNATURE_LOW_R: 71,
  SCHNORR_PUBLIC_KEY: 32,
  SCHNORR_SIGNATURE: 64,
  PUBLIC_KEY_HASH: 20,
  SCRIPT_HASH_P2SH: 20,
  SCRIPT_HASH_P2WSH: 32,
} as const;

export function getTransactionVBytesPrediction(
  addressType: BitcoinAddressType
) {
  switch (addressType) {
    case BitcoinAddressType.P2pkh:
      return {
        input:
          SIZE.OUTPOINT +
          SIZE.SCRIPT_SIG_LENGTH_SMALL +
          SIZE.P2PKH_SS +
          SIZE.N_SEQUENCE,
        output: SIZE.N_VALUE + SIZE.SCRIPT_PUBKEY_LENGTH + SIZE.P2PKH_SPK,
        segWit: false,
      };

    case BitcoinAddressType.P2wpkh:
      return {
        input:
          SIZE.OUTPOINT +
          SIZE.SCRIPT_SIG_LENGTH_SMALL +
          SIZE.P2WPKH_WITNESS +
          SIZE.N_SEQUENCE,
        output: SIZE.N_VALUE + SIZE.SCRIPT_PUBKEY_LENGTH + SIZE.P2WPKH_SPK,
        segWit: true,
      };

    case BitcoinAddressType.P2sh:
      return {
        input:
          SIZE.OUTPOINT +
          SIZE.SCRIPT_SIG_LENGTH_BIG +
          SIZE.P2SH_SS +
          SIZE.N_SEQUENCE,
        output: SIZE.N_VALUE + SIZE.SCRIPT_PUBKEY_LENGTH + SIZE.P2SH_SPK,
        segWit: false,
      };

    case BitcoinAddressType.P2wsh:
      return {
        input:
          SIZE.OUTPOINT +
          SIZE.SCRIPT_SIG_LENGTH_SMALL +
          SIZE.P2WSH_WITNESS +
          SIZE.N_SEQUENCE,
        output: SIZE.N_VALUE + SIZE.SCRIPT_PUBKEY_LENGTH + SIZE.P2WSH_SPK,
        segWit: true,
      };

    case BitcoinAddressType.P2tr:
      return {
        input:
          SIZE.OUTPOINT +
          SIZE.SCRIPT_SIG_LENGTH_SMALL +
          SIZE.P2TR_WITNESS +
          SIZE.N_SEQUENCE,
        output: SIZE.N_VALUE + SIZE.SCRIPT_PUBKEY_LENGTH + SIZE.P2TR_SPK,
        segWit: true,
      };

    default:
      throw new Error("Unsupported address type");
  }
}

export function estimatedTransactionVBytes(
  addressType: BitcoinAddressType,
  inputCount: number,
  outputCount: number
): number {
  const prediction = getTransactionVBytesPrediction(addressType);
  const witnessFlag = prediction.segWit ? SIZE.MARKER_AND_FLAG : 0;

  const overhead =
    SIZE.N_VERSION + // nVersion
    SIZE.N_IN + // number of inputs
    SIZE.N_OUT + // number of outputs
    SIZE.N_LOCKTIME + // nLockTime
    witnessFlag;

  return (
    overhead + prediction.input * inputCount + prediction.output * outputCount
  );
}
