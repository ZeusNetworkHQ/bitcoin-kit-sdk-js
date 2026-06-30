# Zeus Stack SDK

Official TypeScript/JavaScript SDK for Zeus Network's Bitcoin-to-zBTC cross-chain protocol on Solana. Built with rolldown for optimal performance in Node.js and browser environments.

## Features

- **Cross-Chain Protocol**: Transfer Bitcoin to zBTC on Solana seamlessly
- **Complete Bitcoin Integration**: PSBT construction, address derivation, and UTXO management
- **Solana Program Interaction**: Account fetching, instruction building, and PDA derivation
- **TypeScript Support**: Full type safety with comprehensive TypeScript definitions
- **Dual Output**: ESM/CJS support for both Node.js and browser environments
- **Hot & Entity-Derived Reserves**: Support for different reserve address types
- **Fee Estimation**: Accurate Bitcoin network fee calculation

## Usage

```sh
npm install @zeus-network/zeus-stack-sdk
# or
pnpm add @zeus-network/zeus-stack-sdk
# or
yarn add @zeus-network/zeus-stack-sdk
```

### Client Example

```ts
import { TwoWayPegClient } from "@zeus-network/zeus-stack-sdk";

// Initialize client with Solana connection and ZPL program ID
const client = new TwoWayPegClient(connection, programId);
```

#### Account

```ts
// Fetch the two-way-peg configuration account
const twoWayPegConfig = await client.accounts.getConfiguration();
console.log(twoWayPegConfig.layerFeeCollector.toString());
```

#### Instruction

```ts
// Build a withdrawal request instruction
const withdrawalIx = client.instructions.buildAddWithdrawalRequestIx(
  amountToWithdraw,
  new BN(Date.now() / 1000),
  getReceiverXOnlyPubkey(receiverAddress, receiverAddressType),
  solanaPubkey,
  twoWayPegConfiguration.layerFeeCollector,
  sortedGuardian.address,
  new PublicKey(networkConfig.liquidityManagementProgramId),
  sdk.liquidityManagementClient.pdas.deriveConfigurationAddress(),
  vaultAta,
  sdk.liquidityManagementClient.pdas.derivePositionAddress(
    vaultAta,
    solanaPubkey
  )
);

const tx = new Transaction().add(withdrawalIx);
```

#### Program Derived Address (PDA)

```ts
// Derive an interaction PDA address
// For deposits: seed1 = transaction_id, seed2 = v_out
// For withdrawals: seed1 = receiver_address, seed2 = slot
const interactionPda = client.pdas.deriveInteraction(
  receiverBitcoinAddress,
  new BN(currentSlot)
);
console.log(`Interaction PDA: ${interactionPda.toString()}`);
```

### Flow Example

#### Create Entity Derived Reserve Address

```ts
import { TwoWayPegClient } from "@zeus-network/zeus-stack-sdk";

const client = new TwoWayPegClient(connection, programId);

const twoWayPegConfiguration = await client.accounts.getConfiguration();

const edrList = await client.accounts.getEntityDerivedReserves();

const edr = edrList.find(
  ({ reserveSetting }) => reserveSetting.toBase58() === selectedGuardian.address
);

const ix = client.instructions.buildCreateEntityDerivedReserveAddressIx(
  solanaPubkey,
  edr.reserveSetting,
  new PublicKey(selectedGuardian.guardianCertificate),
  twoWayPegConfiguration.layerFeeCollector,
  edr.publicKey,
  BitcoinAddressType.P2tr
);

const tx = new Transaction().add(ix);
```

#### Deposit

```ts
import { TwoWayPegClient } from "@zeus-network/zeus-stack-sdk";
import { buildDepositTransaction } from "@zeus-network/zeus-stack-sdk/bitcoin";

const client = new TwoWayPegClient(connection, programId);

const configuration = await client.accounts.getConfiguration();

const feeRate = configuration.minerFeeRate;

const edras =
  await client.accounts.getEntityDerivedReserveAddressesBySolanaPubkey(
    solanaPubkey
  );

// NOTE: selection logic depends on your DApp logic
const targetEdra = edras[0];

const { address: reserveAddress } = bitcoin.payments.p2tr({
  pubkey: Buffer.from(edraAccount.addressBytes),
  network: convertBitcoinNetwork(bitcoinNetwork),
});

const { psbt, usedUTXOs } = buildDepositTransaction(
  bitcoinUTXOs,
  reserveAddress,
  btcToSatoshi(depositAmount),
  userXOnlyPublicKey,
  feeRate,
  convertBitcoinNetwork(bitcoinNetwork)
);
```

##### Signing and Broadcasting

After constructing the deposit PSBT as shown above, complete the deposit flow with the following steps:

1. **Sign the PSBT:**
   Use your Bitcoin wallet (such as Ledger, Sparrow, or any compatible wallet software) to sign the generated PSBT. The signing process proves ownership of the inputs and authorizes the spend.

2. **Broadcast the Transaction:**
   Once the PSBT is fully signed, broadcast the finalized transaction to the Bitcoin network. You can use your wallet, a Bitcoin node, or a third-party API/service to submit the raw transaction hex.

> Note: The SDK does not handle signing or broadcasting. You must use your own wallet infrastructure or integrate with external services for these steps.

## Architecture

The Zeus Stack SDK is built with a modular architecture:

### Core Components

- **TwoWayPegClient** - Manages Bitcoin ↔ Solana cross-chain operations
- **LiquidityManagementClient** - Handles liquidity pools and reserves
- **Bitcoin Utilities** - PSBT construction, address derivation, fee estimation

### Module Structure

```
@zeus-network/zeus-stack-sdk
├── /                          # Core clients and utilities
├── /two-way-peg/types         # Two-way peg type definitions
├── /liquidity-management/types # Liquidity management types
└── /bitcoin                   # Bitcoin utilities and helpers
```

## Network Support

- **Bitcoin**: Mainnet and Regtest
- **Solana**: Mainnet Beta and Devnet
- **Cross-chain**: Full zBTC protocol support

## Requirements

- Node.js 18+
- Solana Web3.js ^1.98.2
- Solana SPL Token ^0.4.13

## Version Compatibility

| SDK Version | ZPL Version |
| ----------- | ----------- |
| 0.11.x      | 0.15+       |

## Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details on:

- Development setup
- Code style guidelines
- Testing requirements
- Submission process

## License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## Links

- [Zeus Network](https://zeusnetwork.xyz)
- [GitHub Issues](https://github.com/ZeusNetworkHQ/zeus-stack-sdk-js/issues)

