import * as borsh from "@coral-xyz/borsh";
import { Structure } from "@solana/buffer-layout";
import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";

export enum BitcoinAddressType {
  /// Pay-to-Taproot (P2TR) address type (`SegWit` version 1).
  P2tr = 0,

  /// Pay-to-Witness-PubKey-Hash (P2WPKH) address type (`SegWit`).
  P2wpkh = 1,

  /// Pay-to-Witness-Script-Hash (P2WSH) address type (`SegWit`).
  P2wsh = 2,

  /// Pay-to-PubKey-Hash (P2PKH) address type (Legacy address format).
  P2pkh = 3,

  /// Pay-to-Script-Hash (P2SH) address type (Legacy address format).
  P2sh = 4,
}

/* ==========================================
 * Accounts Schema for Deserialization
 * ========================================== */
export interface TwoWayPegConfiguration {
  publicKey: PublicKey;
  superOperatorCertificate: PublicKey;
  zeusColdReserveRecoveryPublicKey: Uint8Array;
  zeusColdReserveRecoveryLockTime: number;
  layerFeeCollector: PublicKey;
  chadbufferAuthority: PublicKey;
  cpiIdentity: PublicKey;
  layerCaProgramId: PublicKey;
  bitcoinSpvProgramId: PublicKey;
  liquidityManagementProgramId: PublicKey;
  bucketOpenFeeAmount: BN;
  bucketReactivationFeeAmount: BN;
  withdrawalFeeAmount: BN;
  minerFeeRate: number;
  maxUserWithdrawalQuota: BN;
  userWithdrawalWindow: BN;
}

export const TwoWayPegConfigurationSchema: Structure<TwoWayPegConfiguration> =
  borsh.struct([
    borsh.publicKey("superOperatorCertificate"),
    borsh.array(borsh.u8(), 32, "zeusColdReserveRecoveryPublicKey"),
    borsh.u16("zeusColdReserveRecoveryLockTime"),
    borsh.publicKey("layerFeeCollector"),
    borsh.publicKey("chadbufferAuthority"),
    borsh.publicKey("cpiIdentity"),
    borsh.publicKey("layerCaProgramId"),
    borsh.publicKey("bitcoinSpvProgramId"),
    borsh.publicKey("liquidityManagementProgramId"),
    borsh.u64("bucketOpenFeeAmount"),
    borsh.u64("bucketReactivationFeeAmount"),
    borsh.u64("withdrawalFeeAmount"),
    borsh.u32("minerFeeRate"),
    borsh.u64("maxUserWithdrawalQuota"),
    borsh.i64("userWithdrawalWindow"),
  ]);

export interface ColdReserveBucket {
  publicKey: PublicKey;
  reserveSetting: PublicKey;
  owner: PublicKey;
  // Bitcoin Cold Reserve X-Only Public Key
  taprootXOnlyPublicKey: Uint8Array;
  tapTweakHash: Uint8Array;
  createdAt: BN;
  // Guardian X-Only PublicKey
  keyPathSpendPublicKey: Uint8Array;
  recoveryParameters: ReserveRecoveryParameter[];
}

export interface ReserveRecoveryParameter {
  scriptPathSpendPublicKey: Uint8Array;
  lockTime: BN;
}

export const ColdReserveBucketSchema: Structure<ColdReserveBucket> =
  borsh.struct([
    borsh.publicKey("reserveSetting"),
    borsh.publicKey("owner"),
    borsh.array(borsh.u8(), 32, "taprootXOnlyPublicKey"),
    borsh.array(borsh.u8(), 32, "tapTweakHash"),
    borsh.i64("createdAt"),
    borsh.array(borsh.u8(), 32, "keyPathSpendPublicKey"),
    borsh.vec(
      borsh.struct([
        borsh.array(borsh.u8(), 32, "scriptPathSpendPublicKey"),
        borsh.i64("lockTime"),
      ]),
      "recoveryParameters"
    ),
  ]);

export interface HotReserveBucket {
  publicKey: PublicKey;
  owner: PublicKey;
  reserveSetting: PublicKey;
  status: number;
  // Hot Reserve Bucket X-Only Public Keys
  taprootXOnlyPublicKey: Uint8Array;
  tapTweakHash: Uint8Array;
  // Guardian X-Only PublicKey
  keyPathSpendPublicKey: Uint8Array;
  // User X-Only PublicKey
  scriptPathSpendPublicKey: Uint8Array;
  lockTime: BN;
  createdAt: BN;
  expiredAt: BN;
}

export enum HotReserveBucketStatus {
  Activated = 0,
  Deactivated = 1,
}

export const HotReserveBucketSchema: Structure<HotReserveBucket> = borsh.struct(
  [
    borsh.publicKey("owner"),
    borsh.publicKey("reserveSetting"),
    borsh.u8("status"),
    borsh.array(borsh.u8(), 32, "taprootXOnlyPublicKey"),
    borsh.array(borsh.u8(), 32, "tapTweakHash"),
    borsh.array(borsh.u8(), 32, "keyPathSpendPublicKey"),
    borsh.array(borsh.u8(), 32, "scriptPathSpendPublicKey"),
    borsh.u64("lockTime"),
    borsh.i64("createdAt"),
    borsh.i64("expiredAt"),
  ]
);

export interface EntityDerivedReserve {
  publicKey: PublicKey;
  reserveSetting: PublicKey;
  owner: PublicKey;
  createdAt: BN;
  keyPathSpendPublicKey: Uint8Array;
  recoveryParameters: ReserveRecoveryParameter[];
}

export const EntityDerivedReserveSchema: Structure<EntityDerivedReserve> =
  borsh.struct([
    borsh.publicKey("reserveSetting"),
    borsh.publicKey("owner"),
    borsh.i64("createdAt"),
    borsh.array(borsh.u8(), 32, "keyPathSpendPublicKey"),
    borsh.vec(
      borsh.struct([
        borsh.array(borsh.u8(), 32, "scriptPathSpendPublicKey"),
        borsh.i64("lockTime"),
      ]),
      "recoveryParameters"
    ),
  ]);

export enum EntityDerivedReserveAddressStatus {
  Activated = 0,
  Deactivated = 1,
}

export interface EntityDerivedReserveAddress {
  publicKey: PublicKey;
  assetOwner: PublicKey;
  entityDerivedReserve: PublicKey;
  status: number;
  addressBytes: Uint8Array;
  addressType: number;
  createdAt: BN;
  expiredAt: BN;
  reserveUser: PublicKey | null;
}

export const EntityDerivedReserveAddressSchema: Structure<EntityDerivedReserveAddress> =
  borsh.struct([
    borsh.publicKey("assetOwner"),
    borsh.publicKey("entityDerivedReserve"),
    borsh.u8("status"),
    borsh.array(borsh.u8(), 32, "addressBytes"),
    borsh.u8("addressType"),
    borsh.i64("createdAt"),
    borsh.i64("expiredAt"),
    borsh.option(borsh.publicKey(), "reserveUser"),
  ]);

export interface UserSetting {
  owner: PublicKey;
  createdAt: BN;
  updatedAt: BN;
  withdrawalWindowStartedAt: BN;
  accumulatedWithdrawalAmount: BN;
  hasUnlimitedWithdrawalQuota: boolean;
}

export const UserSettingSchema: Structure<UserSetting> = borsh.struct([
  borsh.publicKey("owner"),
  borsh.i64("createdAt"),
  borsh.i64("updatedAt"),
  borsh.i64("withdrawalWindowStartedAt"),
  borsh.u64("accumulatedWithdrawalAmount"),
  borsh.bool("hasUnlimitedWithdrawalQuota"),
]);

/* ========================================== */

/* ==========================================
 * Instruction Schema for Serialization
 * ========================================== */
export interface CreateHotReserveBucket {
  discriminator: number;
  scriptPathSpendPublicKey: Uint8Array;
  lockTime: BN;
  validityPeriod: number;
}

export const CreateHotReserveBucketSchema: Structure<CreateHotReserveBucket> =
  borsh.struct([
    borsh.u8("discriminator"),
    borsh.array(borsh.u8(), 32, "scriptPathSpendPublicKey"),
    borsh.u64("lockTime"),
    borsh.u32("validityPeriod"),
  ]);

export interface ReactivateHotReserveBucket {
  discriminator: number;
  validityPeriod: number;
}

export const ReactivateHotReserveBucketSchema: Structure<ReactivateHotReserveBucket> =
  borsh.struct([borsh.u8("discriminator"), borsh.u32("validityPeriod")]);

export interface AddWithdrawalRequest {
  discriminator: number;
  receiverAddress: Uint8Array;
  currentSlot: BN;
  withdrawalAmount: BN;
}

export const AddWithdrawalRequestSchema: Structure<AddWithdrawalRequest> =
  borsh.struct([
    borsh.u8("discriminator"),
    borsh.array(borsh.u8(), 32, "receiverAddress"),
    borsh.u64("currentSlot"),
    borsh.u64("withdrawalAmount"),
  ]);

export interface DeprecateWithdrawalRequest {
  discriminator: number;
}

export const DeprecateWithdrawalRequestSchema: Structure<DeprecateWithdrawalRequest> =
  borsh.struct([borsh.u8("discriminator")]);

export interface AddWithdrawalRequestWithAddressType {
  discriminator: number;
  receiverAddress: Uint8Array;
  receiverAddressType: number;
  currentSlot: BN;
  withdrawalAmount: BN;
}

export const AddWithdrawalRequestWithAddressTypeSchema: Structure<AddWithdrawalRequestWithAddressType> =
  borsh.struct([
    borsh.u8("discriminator"),
    borsh.array(borsh.u8(), 32, "receiverAddress"),
    borsh.u8("receiverAddressType"),
    borsh.u64("currentSlot"),
    borsh.u64("withdrawalAmount"),
  ]);

export interface AddWithdrawalRequestWithVaultUserCertificate {
  discriminator: number;
  receiverAddress: Uint8Array;
  receiverAddressType: number;
  currentSlot: BN;
  withdrawalAmount: BN;
}

export const AddWithdrawalRequestWithVaultUserCertificateSchema: Structure<AddWithdrawalRequestWithVaultUserCertificate> =
  borsh.struct([
    borsh.u8("discriminator"),
    borsh.array(borsh.u8(), 32, "receiverAddress"),
    borsh.u8("receiverAddressType"),
    borsh.u64("currentSlot"),
    borsh.u64("withdrawalAmount"),
  ]);

export interface CreateEntityDerivedReserveAddress {
  discriminator: number;
}

export const CreateEntityDerivedReserveAddressSchema: Structure<CreateEntityDerivedReserveAddress> =
  borsh.struct([borsh.u8("discriminator")]);

export interface MigrateHotReserveBucketToEntityDerivedReserveAddress {
  discriminator: number;
}

export const MigrateHotReserveBucketToEntityDerivedReserveAddressSchema: Structure<MigrateHotReserveBucketToEntityDerivedReserveAddress> =
  borsh.struct([borsh.u8("discriminator")]);

/* ========================================== */
