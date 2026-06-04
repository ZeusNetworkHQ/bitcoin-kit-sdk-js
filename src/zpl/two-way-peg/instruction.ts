import {
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from "@solana/web3.js";
import BN from "bn.js";

import LiquidityManagementPdas from "../liquidity-management/pda";
import TwoWayPegPdas from "./pda";
import {
  AddWithdrawalRequestSchema,
  AddWithdrawalRequestWithAddressTypeSchema,
  AddWithdrawalRequestWithVaultUserCertificateSchema,
  BitcoinAddressType,
  CreateEntityDerivedReserveAddressSchema,
  CreateHotReserveBucketSchema,
  DeprecateWithdrawalRequestSchema,
  MigrateHotReserveBucketToEntityDerivedReserveAddressSchema,
  ReactivateHotReserveBucketSchema,
} from "./types";

class TwoWayPegInstructions {
  constructor(
    private programId: PublicKey,
    private pdas: TwoWayPegPdas
  ) {}

  buildCreateHotReserveBucketIx(
    unlockBlockHeight: number,
    validityPeriod: number,
    solanaPubkey: PublicKey,
    userBitcoinXOnlyPublicKey: Buffer,
    hotReserveBitcoinXOnlyPublicKey: Buffer,
    reserveSettingPda: PublicKey,
    guardianCertificatePda: PublicKey,
    coldReserveBucketPda: PublicKey,
    layerFeeCollectorPda: PublicKey
  ) {
    const instructionData = Buffer.alloc(CreateHotReserveBucketSchema.span);
    CreateHotReserveBucketSchema.encode(
      {
        discriminator: 11,
        scriptPathSpendPublicKey: Uint8Array.from(userBitcoinXOnlyPublicKey),
        lockTime: new BN(unlockBlockHeight),
        validityPeriod,
      },
      instructionData
    );

    const configurationPda = this.pdas.deriveConfigurationAddress();

    const hotReserveBucketPda = this.pdas.deriveHotReserveBucketAddress(
      hotReserveBitcoinXOnlyPublicKey
    );

    const ix = new TransactionInstruction({
      keys: [
        { pubkey: solanaPubkey, isSigner: true, isWritable: true },
        { pubkey: configurationPda, isSigner: false, isWritable: false },
        { pubkey: reserveSettingPda, isSigner: false, isWritable: false },
        { pubkey: guardianCertificatePda, isSigner: false, isWritable: false },
        { pubkey: coldReserveBucketPda, isSigner: false, isWritable: false },
        { pubkey: hotReserveBucketPda, isSigner: false, isWritable: true },
        {
          pubkey: layerFeeCollectorPda,
          isSigner: false,
          isWritable: true,
        },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: true },
      ],
      programId: this.programId,
      data: instructionData,
    });

    return ix;
  }

  buildReactivateHotReserveBucketIx(
    validityPeriod: number,
    solanaPubkey: PublicKey,
    hotReserveBucketPda: PublicKey,
    layerFeeCollectorPda: PublicKey
  ) {
    const instructionData = Buffer.alloc(ReactivateHotReserveBucketSchema.span);

    ReactivateHotReserveBucketSchema.encode(
      {
        discriminator: 13,
        validityPeriod,
      },
      instructionData
    );

    const configurationPda = this.pdas.deriveConfigurationAddress();

    const ix = new TransactionInstruction({
      keys: [
        {
          pubkey: solanaPubkey,
          isSigner: true,
          isWritable: true,
        },
        { pubkey: configurationPda, isSigner: false, isWritable: false },
        { pubkey: hotReserveBucketPda, isSigner: false, isWritable: true },
        {
          pubkey: layerFeeCollectorPda,
          isSigner: false,
          isWritable: true,
        },
        {
          pubkey: SystemProgram.programId,
          isSigner: false,
          isWritable: false,
        },
      ],
      programId: this.programId,
      data: instructionData,
    });

    return ix;
  }

  buildAddWithdrawalRequestIx(
    amount: BN,
    currentSlot: BN,
    receiverBitcoinAddress: Buffer,
    solanaPubkey: PublicKey,
    layerFeeCollectorPda: PublicKey,
    reserveSettingPda: PublicKey,
    liquidityManagementProgramId: PublicKey,
    liquidityManagementConfigurationPda: PublicKey,
    vaultSettingPda: PublicKey,
    positionPda: PublicKey
  ) {
    const withdrawalRequestPda = this.pdas.deriveWithdrawalRequestAddress(
      receiverBitcoinAddress,
      currentSlot
    );

    const interactionPda = this.pdas.deriveInteraction(
      receiverBitcoinAddress,
      currentSlot
    );

    const instructionData = Buffer.alloc(AddWithdrawalRequestSchema.span);
    AddWithdrawalRequestSchema.encode(
      {
        discriminator: 131,
        receiverAddress: Uint8Array.from(receiverBitcoinAddress),
        currentSlot,
        withdrawalAmount: amount,
      },
      instructionData
    );

    const twoWayPegProgramCPIIdentity = this.pdas.deriveCpiIdentityAddress();

    const configurationPda = this.pdas.deriveConfigurationAddress();

    const ix = new TransactionInstruction({
      keys: [
        { pubkey: solanaPubkey, isSigner: true, isWritable: true },
        {
          pubkey: twoWayPegProgramCPIIdentity,
          isSigner: false,
          isWritable: false,
        },
        { pubkey: configurationPda, isSigner: false, isWritable: false },
        { pubkey: reserveSettingPda, isSigner: false, isWritable: true },
        { pubkey: vaultSettingPda, isSigner: false, isWritable: false },
        { pubkey: withdrawalRequestPda, isSigner: false, isWritable: true },
        { pubkey: interactionPda, isSigner: false, isWritable: true },
        { pubkey: positionPda, isSigner: false, isWritable: true },
        {
          pubkey: layerFeeCollectorPda,
          isSigner: false,
          isWritable: true,
        },
        {
          pubkey: liquidityManagementConfigurationPda,
          isSigner: false,
          isWritable: false,
        },
        {
          pubkey: liquidityManagementProgramId,
          isSigner: false,
          isWritable: false,
        },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: this.programId,
      data: instructionData,
    });

    return ix;
  }

  buildDeprecateWithdrawalRequestIx(
    liquidityManagementProgramId: PublicKey,
    requester: PublicKey,
    reserveSettingPda: PublicKey,
    withdrawalRequestPda: PublicKey
  ) {
    const instructionData = Buffer.alloc(DeprecateWithdrawalRequestSchema.span);
    DeprecateWithdrawalRequestSchema.encode(
      {
        discriminator: 132,
      },
      instructionData
    );

    const liquidityManagementPdas = new LiquidityManagementPdas(
      liquidityManagementProgramId
    );
    const twoWayPegProgramCPIIdentity = this.pdas.deriveCpiIdentityAddress();
    const configurationPda = this.pdas.deriveConfigurationAddress();
    const liquidityManagementConfigurationPda =
      liquidityManagementPdas.deriveConfigurationAddress();
    const vaultSettingPda =
      liquidityManagementPdas.deriveVaultSettingAddress(reserveSettingPda);
    const positionPda = liquidityManagementPdas.derivePositionAddress(
      vaultSettingPda,
      requester
    );

    const ix = new TransactionInstruction({
      keys: [
        { pubkey: requester, isSigner: true, isWritable: true },
        {
          pubkey: twoWayPegProgramCPIIdentity,
          isSigner: false,
          isWritable: false,
        },
        { pubkey: configurationPda, isSigner: false, isWritable: false },
        { pubkey: reserveSettingPda, isSigner: false, isWritable: false },
        { pubkey: vaultSettingPda, isSigner: false, isWritable: false },
        { pubkey: withdrawalRequestPda, isSigner: false, isWritable: true },
        { pubkey: positionPda, isSigner: false, isWritable: true },
        {
          pubkey: liquidityManagementConfigurationPda,
          isSigner: false,
          isWritable: false,
        },
        {
          pubkey: liquidityManagementProgramId,
          isSigner: false,
          isWritable: false,
        },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: this.programId,
      data: instructionData,
    });

    return ix;
  }

  buildAddWithdrawalRequestWithAddressTypeIx(
    amount: BN,
    currentSlot: BN,
    receiverBitcoinAddress: Buffer,
    receiverAddressType: BitcoinAddressType,
    solanaPubkey: PublicKey,
    layerFeeCollectorPda: PublicKey,
    reserveSettingPda: PublicKey,
    liquidityManagementProgramId: PublicKey,
    liquidityManagementConfigurationPda: PublicKey,
    vaultSettingPda: PublicKey,
    positionPda: PublicKey
  ) {
    const withdrawalRequestPda = this.pdas.deriveWithdrawalRequestAddress(
      receiverBitcoinAddress,
      currentSlot
    );

    const interactionPda = this.pdas.deriveInteraction(
      receiverBitcoinAddress,
      currentSlot
    );

    const userSettingPda = this.pdas.deriveUserSetting(solanaPubkey);

    const instructionData = Buffer.alloc(
      AddWithdrawalRequestWithAddressTypeSchema.span
    );
    AddWithdrawalRequestWithAddressTypeSchema.encode(
      {
        discriminator: 133,
        receiverAddress: Uint8Array.from(receiverBitcoinAddress),
        receiverAddressType,
        currentSlot,
        withdrawalAmount: amount,
      },
      instructionData
    );

    const twoWayPegProgramCPIIdentity = this.pdas.deriveCpiIdentityAddress();

    const configurationPda = this.pdas.deriveConfigurationAddress();

    const ix = new TransactionInstruction({
      keys: [
        { pubkey: solanaPubkey, isSigner: true, isWritable: true },
        {
          pubkey: twoWayPegProgramCPIIdentity,
          isSigner: false,
          isWritable: false,
        },
        { pubkey: configurationPda, isSigner: false, isWritable: false },
        { pubkey: reserveSettingPda, isSigner: false, isWritable: true },
        { pubkey: vaultSettingPda, isSigner: false, isWritable: false },
        { pubkey: userSettingPda, isSigner: false, isWritable: true },
        { pubkey: withdrawalRequestPda, isSigner: false, isWritable: true },
        { pubkey: interactionPda, isSigner: false, isWritable: true },
        { pubkey: positionPda, isSigner: false, isWritable: true },
        {
          pubkey: layerFeeCollectorPda,
          isSigner: false,
          isWritable: true,
        },
        {
          pubkey: liquidityManagementConfigurationPda,
          isSigner: false,
          isWritable: false,
        },
        {
          pubkey: liquidityManagementProgramId,
          isSigner: false,
          isWritable: false,
        },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: this.programId,
      data: instructionData,
    });

    return ix;
  }

  buildAddWithdrawalRequestWithVaultUserCertificateIx(
    amount: BN,
    currentSlot: BN,
    receiverBitcoinAddress: Buffer,
    receiverAddressType: BitcoinAddressType,
    solanaPubkey: PublicKey,
    layerFeeCollectorPda: PublicKey,
    reserveSettingPda: PublicKey,
    liquidityManagementProgramId: PublicKey,
    liquidityManagementConfigurationPda: PublicKey,
    vaultSettingPda: PublicKey,
    positionPda: PublicKey,
    vaultUserEntity: PublicKey,
    vaultUserCertificatePda: PublicKey,
    vaultUserPda: PublicKey
  ) {
    const withdrawalRequestPda = this.pdas.deriveWithdrawalRequestAddress(
      receiverBitcoinAddress,
      currentSlot
    );

    const interactionPda = this.pdas.deriveInteraction(
      receiverBitcoinAddress,
      currentSlot
    );

    const userSettingPda = this.pdas.deriveUserSetting(solanaPubkey);

    const instructionData = Buffer.alloc(
      AddWithdrawalRequestWithVaultUserCertificateSchema.span
    );
    AddWithdrawalRequestWithVaultUserCertificateSchema.encode(
      {
        discriminator: 135,
        receiverAddress: Uint8Array.from(receiverBitcoinAddress),
        receiverAddressType,
        currentSlot,
        withdrawalAmount: amount,
      },
      instructionData
    );

    const twoWayPegProgramCPIIdentity = this.pdas.deriveCpiIdentityAddress();

    const configurationPda = this.pdas.deriveConfigurationAddress();

    const ix = new TransactionInstruction({
      keys: [
        { pubkey: solanaPubkey, isSigner: true, isWritable: true },
        { pubkey: vaultUserEntity, isSigner: true, isWritable: true },
        {
          pubkey: twoWayPegProgramCPIIdentity,
          isSigner: false,
          isWritable: false,
        },
        { pubkey: configurationPda, isSigner: false, isWritable: false },
        { pubkey: reserveSettingPda, isSigner: false, isWritable: true },
        { pubkey: vaultSettingPda, isSigner: false, isWritable: false },
        { pubkey: userSettingPda, isSigner: false, isWritable: true },
        { pubkey: vaultUserPda, isSigner: false, isWritable: false },
        { pubkey: vaultUserCertificatePda, isSigner: false, isWritable: false },
        { pubkey: withdrawalRequestPda, isSigner: false, isWritable: true },
        { pubkey: interactionPda, isSigner: false, isWritable: true },
        { pubkey: positionPda, isSigner: false, isWritable: true },
        {
          pubkey: layerFeeCollectorPda,
          isSigner: false,
          isWritable: true,
        },
        {
          pubkey: liquidityManagementConfigurationPda,
          isSigner: false,
          isWritable: false,
        },
        {
          pubkey: liquidityManagementProgramId,
          isSigner: false,
          isWritable: false,
        },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: this.programId,
      data: instructionData,
    });

    return ix;
  }

  buildCreateEntityDerivedReserveAddressIx(
    assetOwner: PublicKey,
    reserveSetting: PublicKey,
    guardianCertificate: PublicKey,
    layerFeeCollector: PublicKey,
    entityDerivedReserve: PublicKey,
    addressType: BitcoinAddressType
  ) {
    const instructionData = Buffer.alloc(
      CreateEntityDerivedReserveAddressSchema.span
    );
    CreateEntityDerivedReserveAddressSchema.encode(
      {
        discriminator: 150,
      },
      instructionData
    );

    const configurationPda = this.pdas.deriveConfigurationAddress();

    const entityDerivedReserveAddress =
      this.pdas.deriveEntityDerivedReserveAddress(
        assetOwner,
        entityDerivedReserve,
        addressType
      );

    const ix = new TransactionInstruction({
      keys: [
        { pubkey: assetOwner, isSigner: true, isWritable: true },
        { pubkey: configurationPda, isSigner: false, isWritable: false },
        { pubkey: reserveSetting, isSigner: false, isWritable: false },
        { pubkey: guardianCertificate, isSigner: false, isWritable: false },
        { pubkey: entityDerivedReserve, isSigner: false, isWritable: false },
        {
          pubkey: entityDerivedReserveAddress,
          isSigner: false,
          isWritable: true,
        },
        { pubkey: layerFeeCollector, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: true },
      ],
      programId: this.programId,
      data: instructionData,
    });

    return ix;
  }

  buildMigrateHotReserveBucketToEntityDerivedReserveAddressIx(
    bucketOwner: PublicKey,
    hotReserveBucketPda: PublicKey,
    entityDerivedReservePda: PublicKey
  ) {
    const instructionData = Buffer.alloc(
      MigrateHotReserveBucketToEntityDerivedReserveAddressSchema.span
    );
    MigrateHotReserveBucketToEntityDerivedReserveAddressSchema.encode(
      {
        discriminator: 95,
      },
      instructionData
    );

    const entityDerivedReserveAddress =
      this.pdas.deriveEntityDerivedReserveAddress(
        bucketOwner,
        entityDerivedReservePda,
        BitcoinAddressType.P2tr
      );

    const ix = new TransactionInstruction({
      keys: [
        { pubkey: bucketOwner, isSigner: true, isWritable: true },
        { pubkey: hotReserveBucketPda, isSigner: false, isWritable: true },
        {
          pubkey: entityDerivedReservePda,
          isSigner: false,
          isWritable: false,
        },
        {
          pubkey: entityDerivedReserveAddress,
          isSigner: false,
          isWritable: true,
        },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: this.programId,
      data: instructionData,
    });

    return ix;
  }
}

export default TwoWayPegInstructions;
