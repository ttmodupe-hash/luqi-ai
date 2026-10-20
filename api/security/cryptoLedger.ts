import * as crypto from 'crypto';

export interface AuditBlock {
  index: number;
  timestamp: string;
  actor: string; // User ID, Admin ID, or Agent Name (e.g. "System Administrator", "Sovereign Operator")
  action: string; // e.g., "APPROVE_SARS_PAYMENT", "DEPLOY_CODE_PR", "MULTI_AGENT_CONSENSUS_EXECUTION"
  payloadHash: string;
  previousHash: string;
  currentBlockHash: string;
}

export class SovereignCryptoLedger {
  private static ledgerChain: AuditBlock[] = [];

  static {
    // Initialize Genesis Block if empty
    if (SovereignCryptoLedger.ledgerChain.length === 0) {
      SovereignCryptoLedger.initializeGenesisBlock();
    }
  }

  private static initializeGenesisBlock() {
    const genesisData = {
      genesisNote: 'Luqi-AI Sovereign Zero-Trust Security Enclave Genesis Block',
      sovereigntyAnchor: 'South Africa / Pan-African Node FG-8-I-3-ZA',
      initializedAt: '2026-01-01T00:00:00.000Z',
    };
    const payloadHash = crypto.createHash('sha256').update(JSON.stringify(genesisData)).digest('hex');
    const previousHash = '0000000000000000000000000000000000000000000000000000000000000000';
    const rawBlockString = `0:2026-01-01T00:00:00.000Z:Sovereign Operator:GENESIS_ENCLAVE_INIT:${payloadHash}:${previousHash}`;
    const currentBlockHash = crypto.createHash('sha256').update(rawBlockString).digest('hex');

    SovereignCryptoLedger.ledgerChain.push({
      index: 0,
      timestamp: '2026-01-01T00:00:00.000Z',
      actor: 'Sovereign Operator',
      action: 'GENESIS_ENCLAVE_INIT',
      payloadHash,
      previousHash,
      currentBlockHash,
    });
  }

  /**
   * Appends an immutable cryptographic block to the ledger chain.
   */
  public static sealAction(actor: string, action: string, dataPayload: any): AuditBlock {
    const index = this.ledgerChain.length;
    const timestamp = new Date().toISOString();
    const payloadString = typeof dataPayload === 'string' ? dataPayload : JSON.stringify(dataPayload);
    const payloadHash = crypto.createHash('sha256').update(payloadString).digest('hex');

    const previousHash =
      index === 0
        ? '0000000000000000000000000000000000000000000000000000000000000000'
        : this.ledgerChain[index - 1].currentBlockHash;

    const rawBlockString = `${index}:${timestamp}:${actor}:${action}:${payloadHash}:${previousHash}`;
    const currentBlockHash = crypto.createHash('sha256').update(rawBlockString).digest('hex');

    const block: AuditBlock = {
      index,
      timestamp,
      actor,
      action,
      payloadHash,
      previousHash,
      currentBlockHash,
    };

    this.ledgerChain.push(block);
    return block;
  }

  /**
   * Verifies the cryptographic integrity of the entire chain to detect tampering.
   */
  public static verifyChainIntegrity(): {
    isValid: boolean;
    totalBlocks: number;
    failedBlockIndex?: number;
    latestBlockHash: string;
  } {
    if (this.ledgerChain.length <= 1) {
      return {
        isValid: true,
        totalBlocks: this.ledgerChain.length,
        latestBlockHash: this.ledgerChain[0]?.currentBlockHash || '',
      };
    }

    for (let i = 1; i < this.ledgerChain.length; i++) {
      const current = this.ledgerChain[i];
      const previous = this.ledgerChain[i - 1];

      // 1. Previous hash link check
      if (current.previousHash !== previous.currentBlockHash) {
        return {
          isValid: false,
          totalBlocks: this.ledgerChain.length,
          failedBlockIndex: i,
          latestBlockHash: current.currentBlockHash,
        };
      }

      // 2. Hash recalculation check
      const rawBlockString = `${current.index}:${current.timestamp}:${current.actor}:${current.action}:${current.payloadHash}:${current.previousHash}`;
      const recalculatedHash = crypto.createHash('sha256').update(rawBlockString).digest('hex');
      if (current.currentBlockHash !== recalculatedHash) {
        return {
          isValid: false,
          totalBlocks: this.ledgerChain.length,
          failedBlockIndex: i,
          latestBlockHash: current.currentBlockHash,
        };
      }
    }

    return {
      isValid: true,
      totalBlocks: this.ledgerChain.length,
      latestBlockHash: this.ledgerChain[this.ledgerChain.length - 1].currentBlockHash,
    };
  }

  /**
   * Retrieves all blocks in the ledger chain
   */
  public static getLedgerChain(): AuditBlock[] {
    return [...this.ledgerChain];
  }
}
