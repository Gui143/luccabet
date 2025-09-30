import React, { useState } from 'react';
import { Wallet as WalletIcon, Plus, Minus, AlertTriangle, Clock, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import Layout from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { useWallet } from '@/contexts/WalletContext';
import { WALLET_LIMITS } from '@/lib/WalletAPI';
import { formatBRL } from '@/lib/formatCurrency';
import { toast } from 'sonner';
import ReceiptModal from '@/components/ReceiptModal';

const Wallet: React.FC = () => {
  const { user } = useAuth();
  const { pendingBalance, transactions, isLoading, createDeposit, createWithdraw, forceConfirmTransaction } = useWallet();
  
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [pixKey, setPixKey] = useState('');
  const [showDepositDialog, setShowDepositDialog] = useState(false);
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);
  const [currentDepositTxid, setCurrentDepositTxid] = useState<string | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);

  const handleDeposit = async () => {
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    try {
      const result = await createDeposit(amount);
      setCurrentDepositTxid(result.txid);
      setShowDepositDialog(true);
      setDepositAmount('');
    } catch (error) {
      // Error already handled by context
    }
  };

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (!pixKey.trim()) {
      toast.error('Please enter your PIX key');
      return;
    }

    try {
      const result = await createWithdraw(amount);
      setShowWithdrawDialog(false);
      setReceiptData({
        type: 'withdraw',
        amount,
        txid: result.txid,
        pixKey,
      });
      setShowReceiptModal(true);
      setWithdrawAmount('');
      setPixKey('');
    } catch (error) {
      // Error already handled by context
    }
  };

  const handleConfirmDeposit = () => {
    if (currentDepositTxid) {
      forceConfirmTransaction(currentDepositTxid);
      setShowDepositDialog(false);
      setReceiptData({
        type: 'deposit',
        amount: parseFloat(depositAmount),
        txid: currentDepositTxid,
      });
      setShowReceiptModal(true);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-success" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-destructive" />;
      case 'processing':
        return <Clock className="h-5 w-5 text-secondary" />;
      default:
        return <Clock className="h-5 w-5 text-muted-foreground" />;
    }
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-6">
        <Card className="card-gradient border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <WalletIcon className="h-6 w-6 text-primary" />
              Wallet
            </CardTitle>
            <CardDescription>Manage your balance and transactions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Balance Display */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-muted p-4 rounded-lg border border-border">
                <div className="text-sm text-muted-foreground mb-1">Available Balance</div>
                <div className="text-3xl font-bold text-primary">{formatBRL(user?.balance || 0)}</div>
              </div>
              <div className="bg-muted p-4 rounded-lg border border-border">
                <div className="text-sm text-muted-foreground mb-1">Pending Balance</div>
                <div className="text-3xl font-bold text-primary">{formatBRL(pendingBalance)}</div>
              </div>
              <div className="bg-muted p-4 rounded-lg border border-border">
                <div className="text-sm text-muted-foreground mb-1">Total Balance</div>
                <div className="text-3xl font-bold text-foreground">{formatBRL(user ? user.balance + pendingBalance : 0)}</div>
              </div>
            </div>


            {/* Deposit/Withdraw Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Deposit */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Plus className="h-5 w-5 text-success" />
                    Deposit
                  </CardTitle>
                  <CardDescription>
                    Min: R$ {WALLET_LIMITS.MIN_DEPOSIT} | Max: R$ {WALLET_LIMITS.MAX_DEPOSIT}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input
                    type="number"
                    placeholder="Enter amount"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    min={WALLET_LIMITS.MIN_DEPOSIT}
                    max={WALLET_LIMITS.MAX_DEPOSIT}
                    className="bg-input"
                  />
                  <div className="flex gap-2">
                    {[50, 100, 250, 500].map(amount => (
                      <Button
                        key={amount}
                        onClick={() => setDepositAmount(amount.toString())}
                        variant="outline"
                        size="sm"
                        className="flex-1"
                      >
                        ${amount}
                      </Button>
                    ))}
                  </div>
                  <Button
                    onClick={handleDeposit}
                    className="w-full glow-primary"
                    disabled={isLoading}
                  >
                    Create Deposit
                  </Button>
                </CardContent>
              </Card>

              {/* Withdraw */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Minus className="h-5 w-5 text-destructive" />
                    Withdraw
                  </CardTitle>
                  <CardDescription>
                    Min: R$ {WALLET_LIMITS.MIN_WITHDRAW} | Max: R$ {WALLET_LIMITS.MAX_WITHDRAW}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm text-muted-foreground mb-2 block">Amount</label>
                    <Input
                      type="number"
                      placeholder="Enter amount"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      min={WALLET_LIMITS.MIN_WITHDRAW}
                      max={Math.min(WALLET_LIMITS.MAX_WITHDRAW, user?.balance || 0)}
                      className="bg-input"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-2 block">PIX Key</label>
                    <Input
                      type="text"
                      placeholder="CPF, Email, or Phone"
                      value={pixKey}
                      onChange={(e) => setPixKey(e.target.value)}
                      className="bg-input"
                    />
                  </div>
                  <Dialog open={showWithdrawDialog} onOpenChange={setShowWithdrawDialog}>
                    <DialogTrigger asChild>
                      <Button
                        className="w-full glow-secondary bg-secondary hover:bg-secondary/90"
                        disabled={isLoading}
                      >
                        Request Withdrawal
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Confirm Withdrawal</DialogTitle>
                        <DialogDescription>
                          You are about to withdraw R$ {withdrawAmount} to PIX key: {pixKey}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="flex gap-4">
                        <Button variant="outline" onClick={() => setShowWithdrawDialog(false)} className="flex-1">
                          Cancel
                        </Button>
                        <Button onClick={handleWithdraw} className="flex-1">
                          Confirm
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            </div>

            {/* Deposit Instructions Dialog */}
            <Dialog open={showDepositDialog} onOpenChange={setShowDepositDialog}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Complete Your Deposit</DialogTitle>
                  <DialogDescription>
                    Scan the QR code to complete your deposit
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="bg-muted p-6 rounded-lg text-center">
                    <div className="text-sm text-muted-foreground mb-3">PIX QR Code</div>
                    <div className="w-48 h-48 bg-white mx-auto flex items-center justify-center rounded-lg border-4 border-primary">
                      <div className="text-center p-4">
                        <div className="text-xs text-black font-mono break-all">
                          {currentDepositTxid?.slice(0, 32)}
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-3">
                      Amount: {formatBRL(parseFloat(depositAmount))}
                    </p>
                  </div>
                  <Alert>
                    <AlertDescription className="text-xs">
                      <strong>Demo Mode:</strong> This is a simulated QR code. In production, this would be a real PIX QR code.
                    </AlertDescription>
                  </Alert>
                  <div className="space-y-2">
                    <Button
                      onClick={handleConfirmDeposit}
                      className="w-full glow-primary"
                    >
                      Confirm Deposit
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        {/* Transaction History */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle>Transaction History</CardTitle>
            <CardDescription>Your recent wallet transactions</CardDescription>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No transactions yet
              </div>
            ) : (
              <div className="space-y-2">
                {transactions.map((tx) => (
                  <div
                    key={tx.txid}
                    className="flex items-center justify-between p-4 bg-muted rounded-lg border border-border"
                  >
                    <div className="flex items-center gap-4">
                      {getStatusIcon(tx.status)}
                      <div>
                        <div className="font-medium capitalize">{tx.type}</div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(tx.timestamp).toLocaleString()}
                        </div>
                        <div className="text-xs text-muted-foreground">{tx.txid}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-lg font-bold ${
                        tx.type === 'deposit' || tx.type === 'win' ? 'text-success' : 'text-destructive'
                      }`}>
                        {tx.type === 'deposit' || tx.type === 'win' ? '+' : '-'}{formatBRL(tx.amount)}
                      </div>
                      <div className="text-sm text-muted-foreground capitalize">{tx.status}</div>
                      {tx.status === 'pending' && (
                        <Button
                          onClick={() => forceConfirmTransaction(tx.txid)}
                          size="sm"
                          variant="outline"
                          className="mt-2"
                        >
                          Force Confirm
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

      </div>

      <ReceiptModal
        isOpen={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
        type={receiptData?.type}
        amount={receiptData?.amount || 0}
        txid={receiptData?.txid || ''}
        pixKey={receiptData?.pixKey}
      />
    </Layout>
  );
};

export default Wallet;
