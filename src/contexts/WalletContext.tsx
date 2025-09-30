import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'sonner';
import { WalletAPI, Transaction, WALLET_LIMITS } from '@/lib/WalletAPI';
import { useAuth } from './AuthContext';

interface WalletContextType {
  pendingBalance: number;
  transactions: Transaction[];
  isLoading: boolean;
  createDeposit: (amount: number) => Promise<{ txid: string; paymentUrl: string; qrCode?: string }>;
  confirmDeposit: (txid: string) => Promise<void>;
  createWithdraw: (amount: number) => Promise<void>;
  forceConfirmTransaction: (txid: string) => Promise<void>;
  refreshTransactions: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, updateBalance } = useAuth();
  const [pendingBalance, setPendingBalance] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load transactions on mount
  useEffect(() => {
    if (user) {
      refreshTransactions();
    }
  }, [user]);

  const refreshTransactions = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const txs = await WalletAPI.getTransactions(user.id);
      setTransactions(txs);
      
      // Calculate pending balance
      const pending = txs
        .filter(tx => tx.status === 'pending' || tx.status === 'processing')
        .reduce((sum, tx) => {
          if (tx.type === 'deposit') return sum + tx.amount;
          if (tx.type === 'withdraw') return sum - tx.amount;
          return sum;
        }, 0);
      
      setPendingBalance(pending);
    } catch (error) {
      console.error('Failed to load transactions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createDeposit = async (amount: number) => {
    if (!user) throw new Error('User not authenticated');
    
    // Validation
    if (amount < WALLET_LIMITS.MIN_DEPOSIT) {
      toast.error(`Minimum deposit: $${WALLET_LIMITS.MIN_DEPOSIT}`);
      throw new Error('Amount too low');
    }
    
    if (amount > WALLET_LIMITS.MAX_DEPOSIT) {
      toast.error(`Maximum deposit: $${WALLET_LIMITS.MAX_DEPOSIT}`);
      throw new Error('Amount too high');
    }

    setIsLoading(true);
    try {
      const result = await WalletAPI.createDeposit(user.id, amount);
      
      // Save transaction
      const transaction: Transaction = {
        txid: result.txid,
        userId: user.id,
        type: 'deposit',
        amount,
        status: 'pending',
        timestamp: Date.now(),
        metadata: { paymentUrl: result.paymentUrl, expiresAt: result.expiresAt }
      };
      
      WalletAPI.saveTransaction(transaction);
      await refreshTransactions();
      
      toast.success('Deposit created! Complete payment to receive funds.');
      
      return result;
    } catch (error) {
      toast.error('Failed to create deposit');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const confirmDeposit = async (txid: string) => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const result = await WalletAPI.confirmDeposit(txid);
      
      // Find and update transaction
      const tx = transactions.find(t => t.txid === txid);
      if (!tx) throw new Error('Transaction not found');
      
      // Update transaction status
      const allTxs = JSON.parse(localStorage.getItem('wallet_transactions') || '[]');
      const txIndex = allTxs.findIndex((t: Transaction) => t.txid === txid);
      if (txIndex !== -1) {
        allTxs[txIndex].status = result.status;
        localStorage.setItem('wallet_transactions', JSON.stringify(allTxs));
      }
      
      if (result.status === 'completed') {
        updateBalance(tx.amount);
        toast.success(`Deposit confirmed! +$${tx.amount.toFixed(2)}`);
      } else {
        toast.error('Deposit failed. Please try again.');
      }
      
      await refreshTransactions();
    } catch (error) {
      toast.error('Failed to confirm deposit');
    } finally {
      setIsLoading(false);
    }
  };

  const createWithdraw = async (amount: number) => {
    if (!user) throw new Error('User not authenticated');
    
    // Validation
    if (amount < WALLET_LIMITS.MIN_WITHDRAW) {
      toast.error(`Minimum withdrawal: $${WALLET_LIMITS.MIN_WITHDRAW}`);
      throw new Error('Amount too low');
    }
    
    if (amount > WALLET_LIMITS.MAX_WITHDRAW) {
      toast.error(`Maximum withdrawal: $${WALLET_LIMITS.MAX_WITHDRAW}`);
      throw new Error('Amount too high');
    }
    
    if (amount > user.balance) {
      toast.error('Insufficient balance');
      throw new Error('Insufficient balance');
    }

    setIsLoading(true);
    try {
      const result = await WalletAPI.createWithdraw(user.id, amount);
      
      // Deduct from balance immediately
      updateBalance(-amount);
      
      // Save transaction
      const transaction: Transaction = {
        txid: result.txid,
        userId: user.id,
        type: 'withdraw',
        amount,
        status: 'pending',
        timestamp: Date.now(),
        metadata: { estimatedTime: result.estimatedTime }
      };
      
      WalletAPI.saveTransaction(transaction);
      await refreshTransactions();
      
      toast.success(`Withdrawal requested: $${amount.toFixed(2)}`);
      
      // Simulate processing after delay
      setTimeout(async () => {
        const processResult = await WalletAPI.processWithdraw(result.txid);
        
        const allTxs = JSON.parse(localStorage.getItem('wallet_transactions') || '[]');
        const txIndex = allTxs.findIndex((t: Transaction) => t.txid === result.txid);
        if (txIndex !== -1) {
          allTxs[txIndex].status = processResult.status;
          localStorage.setItem('wallet_transactions', JSON.stringify(allTxs));
          
          if (processResult.status === 'failed') {
            // Refund on failure
            updateBalance(amount);
            toast.error('Withdrawal failed. Funds returned to balance.');
          } else {
            toast.success('Withdrawal completed!');
          }
          
          await refreshTransactions();
        }
      }, 5000);
      
    } catch (error) {
      toast.error('Failed to create withdrawal');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const forceConfirmTransaction = async (txid: string) => {
    // Developer/test function to manually confirm transactions
    const tx = transactions.find(t => t.txid === txid);
    if (!tx) return;
    
    if (tx.type === 'deposit') {
      await confirmDeposit(txid);
    } else if (tx.type === 'withdraw') {
      const allTxs = JSON.parse(localStorage.getItem('wallet_transactions') || '[]');
      const txIndex = allTxs.findIndex((t: Transaction) => t.txid === txid);
      if (txIndex !== -1) {
        allTxs[txIndex].status = 'completed';
        localStorage.setItem('wallet_transactions', JSON.stringify(allTxs));
        toast.success('Transaction force confirmed!');
        await refreshTransactions();
      }
    }
  };

  return (
    <WalletContext.Provider
      value={{
        pendingBalance,
        transactions,
        isLoading,
        createDeposit,
        confirmDeposit,
        createWithdraw,
        forceConfirmTransaction,
        refreshTransactions
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within WalletProvider');
  }
  return context;
};
