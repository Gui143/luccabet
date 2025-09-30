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
import { toast } from 'sonner';

const Wallet: React.FC = () => {
  const { user } = useAuth();
  const { pendingBalance, transactions, isLoading, createDeposit, createWithdraw, forceConfirmTransaction } = useWallet();
  
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [showDepositDialog, setShowDepositDialog] = useState(false);
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);
  const [currentDepositTxid, setCurrentDepositTxid] = useState<string | null>(null);
  const [showPixWarning, setShowPixWarning] = useState(false);

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

    try {
      await createWithdraw(amount);
      setShowWithdrawDialog(false);
      setWithdrawAmount('');
    } catch (error) {
      // Error already handled by context
    }
  };

  const handlePixKeyWarning = () => {
    setShowPixWarning(true);
    toast.error('⚠️ SECURITY WARNING: Never enter PIX keys or bank credentials here!');
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
                <div className="text-3xl font-bold text-primary">${user?.balance.toFixed(2)}</div>
              </div>
              <div className="bg-muted p-4 rounded-lg border border-border">
                <div className="text-sm text-muted-foreground mb-1">Pending Balance</div>
                <div className="text-3xl font-bold text-secondary">${pendingBalance.toFixed(2)}</div>
              </div>
              <div className="bg-muted p-4 rounded-lg border border-border">
                <div className="text-sm text-muted-foreground mb-1">Total Balance</div>
                <div className="text-3xl font-bold text-foreground">${(user ? user.balance + pendingBalance : 0).toFixed(2)}</div>
              </div>
            </div>

            {/* Security Warning */}
            {showPixWarning && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Security Warning</AlertTitle>
                <AlertDescription>
                  Never enter PIX keys, bank credentials, or sensitive payment information in this interface.
                  All payment processing should be handled through secure backend services.
                  This is a simulated wallet for demonstration purposes.
                </AlertDescription>
              </Alert>
            )}

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
                    Min: ${WALLET_LIMITS.MIN_DEPOSIT} | Max: ${WALLET_LIMITS.MAX_DEPOSIT}
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
                    Min: ${WALLET_LIMITS.MIN_WITHDRAW} | Max: ${WALLET_LIMITS.MAX_WITHDRAW}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input
                    type="number"
                    placeholder="Enter amount"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    min={WALLET_LIMITS.MIN_WITHDRAW}
                    max={Math.min(WALLET_LIMITS.MAX_WITHDRAW, user?.balance || 0)}
                    className="bg-input"
                  />
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
                          You are about to withdraw ${withdrawAmount}. This action cannot be undone.
                        </DialogDescription>
                      </DialogHeader>
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          In production, withdrawal destination (PIX key, bank account) would be configured in your account settings
                          and processed securely server-side. Never enter sensitive payment credentials in the client.
                        </AlertDescription>
                      </Alert>
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
                    Transaction ID: {currentDepositTxid}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <Alert>
                    <AlertDescription>
                      <strong>SIMULATED PAYMENT</strong><br/>
                      In production, this would show:
                      <ul className="list-disc list-inside mt-2">
                        <li>QR code for PIX payment</li>
                        <li>Payment gateway redirect link</li>
                        <li>Bank transfer instructions</li>
                      </ul>
                    </AlertDescription>
                  </Alert>
                  <div className="bg-muted p-4 rounded-lg text-center">
                    <div className="text-sm text-muted-foreground mb-2">Simulated Payment QR Code</div>
                    <div className="w-48 h-48 bg-card border-2 border-border mx-auto flex items-center justify-center">
                      <span className="text-xs text-muted-foreground">QR Code Placeholder</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      For testing purposes, use the button below to simulate payment confirmation:
                    </p>
                    <Button
                      onClick={() => {
                        if (currentDepositTxid) {
                          forceConfirmTransaction(currentDepositTxid);
                          setShowDepositDialog(false);
                        }
                      }}
                      className="w-full"
                      variant="outline"
                    >
                      🔧 Force Confirm (Test Only)
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
                        {tx.type === 'deposit' || tx.type === 'win' ? '+' : '-'}${tx.amount.toFixed(2)}
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

        {/* Developer Notes */}
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Production Integration Notes</AlertTitle>
          <AlertDescription>
            <strong>This is a simulated wallet for demonstration.</strong> For production:
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Replace WalletAPI methods with real backend endpoints</li>
              <li>Implement secure payment gateway integration (Stripe, PIX, etc.)</li>
              <li>Store all sensitive data server-side with encryption</li>
              <li>Add proper authentication and authorization</li>
              <li>Implement webhook handlers for payment confirmations</li>
              <li>Add KYC/AML compliance checks</li>
              <li>Set up proper transaction monitoring and fraud detection</li>
            </ul>
          </AlertDescription>
        </Alert>
      </div>
    </Layout>
  );
};

export default Wallet;
