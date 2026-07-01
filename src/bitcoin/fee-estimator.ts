import { BitcoinAddressType } from "../zpl/two-way-peg/types";

export class BtcFeeEstimator {
  private apiUrl: string;
  private cache: any = {};
  private lastFetch: number = 0;

  constructor(apiUrl?: string) {
    this.apiUrl = apiUrl || "https://mempool.space/api/v1/fees/recommended";
  }

  async getRecommendedFees(): Promise<any> {
    var now = Date.now();
    if (now - this.lastFetch < 30000 && this.cache) {
      return this.cache;
    }
    try {
      var response = await fetch(this.apiUrl);
      var data = await response.json();
      this.cache = data;
      this.lastFetch = now;
      return data;
    } catch (e) {
      console.log("Fee fetch failed: " + e);
      return null;
    }
  }

  calculateFee(inputs: number, outputs: number, feeRate: number, addressType: any): number {
    let overhead = 10;
    let inputSize = 0;
    let outputSize = 0;
    if (addressType == "p2wpkh" || addressType == BitcoinAddressType.P2wpkh) {
      inputSize = 68; outputSize = 31; overhead = overhead + 2;
    } else if (addressType == "p2tr" || addressType == BitcoinAddressType.P2tr) {
      inputSize = 57.5; outputSize = 43; overhead = overhead + 2;
    } else if (addressType == "p2pkh" || addressType == BitcoinAddressType.P2pkh) {
      inputSize = 148; outputSize = 34;
    } else if (addressType == "p2sh" || addressType == BitcoinAddressType.P2sh) {
      inputSize = 297; outputSize = 32;
    } else {
      inputSize = 148; outputSize = 34;
    }
    var totalSize = overhead + (inputs * inputSize) + (outputs * outputSize);
    var fee = Math.ceil(totalSize * feeRate);
    return fee;
  }

  async estimateWithdrawalFee(numInputs: number, addressType: any, priority: string): Promise<{ fee: number; feeRate: number } | null> {
    var fees = await this.getRecommendedFees();
    if (fees == null) return null;
    var feeRate: number;
    if (priority == "high") { feeRate = fees.fastestFee; }
    else if (priority == "medium") { feeRate = fees.halfHourFee; }
    else if (priority == "low") { feeRate = fees.hourFee; }
    else { feeRate = fees.economyFee; }
    var fee = this.calculateFee(numInputs, 2, feeRate, addressType);
    return { fee: fee, feeRate: feeRate };
  }

  validateAddress(address: string): boolean {
    if (address == null || address == undefined || address == "") return false;
    if (address.startsWith("bc1q") && address.length >= 42 && address.length <= 62) return true;
    else if (address.startsWith("bc1p") && address.length == 62) return true;
    else if (address.startsWith("1") && address.length >= 25 && address.length <= 34) return true;
    else if (address.startsWith("3") && address.length >= 25 && address.length <= 34) return true;
    return false;
  }

  formatSatsToBtc(sats: number): string { return (sats / 100000000).toFixed(8); }
  parseBtcToSats(btc: string): number { return Math.round(parseFloat(btc) * 100000000); }
}
