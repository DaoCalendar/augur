import { ethers } from 'ethers';

export class EthersFastSubmitWallet extends ethers.Wallet {
  private nonce = 0;

  static async create(
    privateKey: ethers.utils.Arrayish,
    provider: ethers.providers.Provider
  ): Promise<EthersFastSubmitWallet> {
    const wallet = new EthersFastSubmitWallet(privateKey, provider);
    const nonce = await provider.getTransactionCount(wallet.address, 'pending');
    wallet.setNonce(nonce);
    return wallet;
  }

  setNonce(nonce: number): void {
    this.nonce = nonce;
  }

  // If we ever have a use case for a different kind of message signing split this into `signMessage` (new) and `signBinaryMessage` (below)
  signMessage(message: ethers.utils.Arrayish | string): Promise<string> {
    const hashmessage = ethers.utils.arrayify(message);
    return Promise.resolve(super.signMessage(hashmessage));
  }

  sendTransaction(
    transaction: ethers.providers.TransactionRequest
  ): Promise<ethers.providers.TransactionResponse> {
    transaction = ethers.utils.shallowCopy(transaction);
    transaction.nonce = this.nonce;
    transaction.from = this.address;
    this.nonce++;

    return this.provider.estimateGas(transaction).then(gasEstimate => {
      // https://github.com/ethers-io/ethers.js/issues/321
      delete transaction.from;
      return ethers.utils
        .populateTransaction(transaction, this.provider, this.address)
        .then(tx => {
          return this.sign(tx).then(signedTransaction => {
            return this.provider.sendTransaction(signedTransaction);
          });
        });
    });
  }
}
