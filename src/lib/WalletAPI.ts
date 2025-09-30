/**
 * WalletAPI - Abstraction layer for wallet operations
 * 
 * PRODUCTION INTEGRATION:
 * Replace these simulated functions with real API calls to your backend:
 * 
 * Real endpoints should be:
 * POST /api/deposit/create - {userId, amount} → {txid, paymentUrl, qrCode}
 * POST /api/deposit/confirm - {txid} webhook → {status, amount}
 * POST /api/withdraw/create - {userId, amount, pixKey} → {txid}
 * POST /api/withdraw/confirm - {txid} webhook → {status}
 * GET /api/transactions - {userId} → [{txid, type, amount, status, timestamp}]
 * 
 * SECURITY WARNING:
 * - Never store API keys or secrets in client code
 * - All sensitive operations must go through authenticated backend endpoints
 * - PIX keys and bank credentials should NEVER be stored in localStorage
 * - Use HTTPS only in production
 */

export interface Transaction {
  txid: string;
  userId: string;
  type: 'deposit' | 'withdraw' | 'bet' | 'win';
  amount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  timestamp: number;
  metadata?: any;
}

export interface DepositResult {
  txid: string;
  paymentUrl: string;
  qrCode?: string;
  expiresAt: number;
}

export interface WithdrawResult {
  txid: string;
  status: 'pending' | 'processing';
  estimatedTime: string;
}

// Simulated delay to mimic network requests
const simulateDelay = (ms: number = 500) => new Promise(resolve => setTimeout(resolve, ms));

// Generate realistic transaction ID
const generateTxid = () => `TX${Date.now()}${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

export class WalletAPI {
  /**
   * Create a deposit request
   * PRODUCTION: POST /api/deposit/create
   */
  static async createDeposit(userId: string, amount: number): Promise<DepositResult> {
    await simulateDelay(800);
    
    const txid = generateTxid();
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes
    
    // In production, this would return real payment gateway URL/QR code
    return {
      txid,
      paymentUrl: `https://payment-gateway.example.com/pay/${txid}`,
      qrCode: `00020126580014BR.GOV.BCB.PIX0136${txid}520400005303986540${amount}5802BR5913Example6009SAO PAULO`,
      expiresAt
    };
  }

  /**
   * Confirm deposit (simulates webhook callback)
   * PRODUCTION: This would be called by payment gateway webhook
   */
  static async confirmDeposit(txid: string): Promise<{ status: 'completed' | 'failed'; amount: number }> {
    await simulateDelay(1000);
    
    // Simulate 95% success rate
    const success = Math.random() > 0.05;
    
    return {
      status: success ? 'completed' : 'failed',
      amount: 0 // Amount would come from the transaction record
    };
  }

  /**
   * Create a withdraw request
   * PRODUCTION: POST /api/withdraw/create
   * WARNING: Never send raw PIX keys from client - use backend validation
   */
  static async createWithdraw(userId: string, amount: number, pixKey?: string): Promise<WithdrawResult> {
    await simulateDelay(800);
    
    // SECURITY CHECK: Warn if PIX key is provided client-side
    if (pixKey) {
      console.warn('⚠️ SECURITY WARNING: PIX keys should be stored server-side only!');
    }
    
    const txid = generateTxid();
    
    return {
      txid,
      status: 'pending',
      estimatedTime: '1-24 hours'
    };
  }

  /**
   * Process withdraw (simulates backend processing)
   * PRODUCTION: This would be handled by backend worker/cron
   */
  static async processWithdraw(txid: string): Promise<{ status: 'completed' | 'failed' }> {
    await simulateDelay(2000);
    
    // Simulate 90% success rate
    const success = Math.random() > 0.1;
    
    return {
      status: success ? 'completed' : 'failed'
    };
  }

  /**
   * Get transaction history
   * PRODUCTION: GET /api/transactions?userId={userId}
   */
  static async getTransactions(userId: string): Promise<Transaction[]> {
    await simulateDelay(300);
    
    const transactions = localStorage.getItem('wallet_transactions');
    if (!transactions) return [];
    
    const allTxs: Transaction[] = JSON.parse(transactions);
    return allTxs.filter(tx => tx.userId === userId).reverse();
  }

  /**
   * Save transaction to storage
   * PRODUCTION: This would be handled by backend database
   */
  static saveTransaction(transaction: Transaction): void {
    const transactions = localStorage.getItem('wallet_transactions');
    const allTxs: Transaction[] = transactions ? JSON.parse(transactions) : [];
    allTxs.push(transaction);
    localStorage.setItem('wallet_transactions', JSON.stringify(allTxs));
  }
}

// Wallet limits and constraints (should be fetched from backend in production)
export const WALLET_LIMITS = {
  MIN_DEPOSIT: 10,
  MAX_DEPOSIT: 10000,
  MIN_WITHDRAW: 20,
  MAX_WITHDRAW: 50000,
  DAILY_WITHDRAW_LIMIT: 100000,
  MAX_PENDING_TRANSACTIONS: 5
};
