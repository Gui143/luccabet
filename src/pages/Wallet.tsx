import React, { useState } from 'react';
import { Wallet as WalletIcon, Plus, Minus, Clock, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
    if (isNaN(amount) || amount <= 0) { toast.error('Digite um valor válido'); return; }
    try {
      const result = await createDeposit(amount);
      setCurrentDepositTxid(result.txid);
      setShowDepositDialog(true);
      setDepositAmount('');
    } catch (error) {}
  };

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) { toast.error('Digite um valor válido'); return; }
    if (!pixKey.trim()) { toast.error('Digite sua chave PIX'); return; }
    try {
      const result = await createWithdraw(amount);
      setShowWithdrawDialog(false);
      setReceiptData({ type: 'withdraw', amount, txid: result.txid, pixKey });
      setShowReceiptModal(true);
      setWithdrawAmount('');
      setPixKey('');
    } catch (error) {}
  };

  const handleConfirmDeposit = () => {
    if (currentDepositTxid) {
      forceConfirmTransaction(currentDepositTxid);
      setShowDepositDialog(false);
      setReceiptData({ type: 'deposit', amount: parseFloat(depositAmount), txid: currentDepositTxid });
      setShowReceiptModal(true);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-5 w-5 text-success" />;
      case 'failed': return <XCircle className="h-5 w-5 text-destructive" />;
      default: return <Clock className="h-5 w-5 text-muted-foreground" />;
    }
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-6">
        <Card className="card-gradient border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <WalletIcon className="h-6 w-6 text-primary" />
              Carteira
            </CardTitle>
            <CardDescription>Gerencie seu saldo e transações</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-muted p-4 rounded-lg border border-border">
                <div className="text-sm text-muted-foreground mb-1">Saldo Disponível</div>
                <div className="text-3xl font-bold text-primary">{formatBRL(user?.balance || 0)}</div>
              </div>
              <div className="bg-muted p-4 rounded-lg border border-border">
                <div className="text-sm text-muted-foreground mb-1">Saldo Pendente</div>
                <div className="text-3xl font-bold text-primary">{formatBRL(pendingBalance)}</div>
              </div>
              <div className="bg-muted p-4 rounded-lg border border-border">
                <div className="text-sm text-muted-foreground mb-1">Saldo Total</div>
                <div className="text-3xl font-bold text-foreground">{formatBRL(user ? user.balance + pendingBalance : 0)}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Plus className="h-5 w-5 text-success" /> Depósito
                  </CardTitle>
                  <CardDescription>Mín: R$ 1 — Sem limite máximo</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input type="number" placeholder="Valor do depósito" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} min={WALLET_LIMITS.MIN_DEPOSIT} max={WALLET_LIMITS.MAX_DEPOSIT} className="bg-input" />
                  <div className="flex gap-2">
                    {[50, 100, 250, 500].map(amount => (
                      <Button key={amount} onClick={() => setDepositAmount(amount.toString())} variant="outline" size="sm" className="flex-1">
                        €{amount}
                      </Button>
                    ))}
                  </div>
                  <Button onClick={handleDeposit} className="w-full" disabled={isLoading}>Depositar</Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Minus className="h-5 w-5 text-destructive" /> Saque
                  </CardTitle>
                  <CardDescription>Sem limites — saque qualquer valor</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input type="number" placeholder="Valor do saque" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} className="bg-input" />
                  <Input type="text" placeholder="Chave PIX (CPF, Email ou Telefone)" value={pixKey} onChange={(e) => setPixKey(e.target.value)} className="bg-input" />
                  <Dialog open={showWithdrawDialog} onOpenChange={setShowWithdrawDialog}>
                    <DialogTrigger asChild>
                      <Button className="w-full" variant="outline" disabled={isLoading}>Solicitar Saque</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Confirmar Saque</DialogTitle>
                        <DialogDescription>Você está prestes a sacar R$ {withdrawAmount} para a chave PIX: {pixKey}</DialogDescription>
                      </DialogHeader>
                      <div className="flex gap-4">
                        <Button variant="outline" onClick={() => setShowWithdrawDialog(false)} className="flex-1">Cancelar</Button>
                        <Button onClick={handleWithdraw} className="flex-1">Confirmar</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            </div>

            <Dialog open={showDepositDialog} onOpenChange={setShowDepositDialog}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Complete seu Depósito</DialogTitle>
                  <DialogDescription>Escaneie o QR code para completar o depósito</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="bg-muted p-6 rounded-lg text-center">
                    <div className="text-sm text-muted-foreground mb-3">QR Code PIX</div>
                    <div className="w-48 h-48 bg-white mx-auto flex items-center justify-center rounded-lg border-4 border-primary">
                      <div className="text-center p-4">
                        <div className="text-xs text-black font-mono break-all">{currentDepositTxid?.slice(0, 32)}</div>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-3">Valor: {formatBRL(parseFloat(depositAmount))}</p>
                  </div>
                  <Button onClick={handleConfirmDeposit} className="w-full">Confirmar Depósito</Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle>Histórico de Transações</CardTitle>
            <CardDescription>Suas transações recentes</CardDescription>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">Nenhuma transação ainda</div>
            ) : (
              <div className="space-y-2">
                {transactions.map((tx) => (
                  <div key={tx.txid} className="flex items-center justify-between p-4 bg-muted rounded-lg border border-border">
                    <div className="flex items-center gap-4">
                      {getStatusIcon(tx.status)}
                      <div>
                        <div className="font-medium capitalize">{tx.type === 'deposit' ? 'Depósito' : tx.type === 'withdraw' ? 'Saque' : tx.type}</div>
                        <div className="text-sm text-muted-foreground">{new Date(tx.timestamp).toLocaleString('pt-BR')}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-lg font-bold ${tx.type === 'deposit' || tx.type === 'win' ? 'text-success' : 'text-destructive'}`}>
                        {tx.type === 'deposit' || tx.type === 'win' ? '+' : '-'}{formatBRL(tx.amount)}
                      </div>
                      <div className="text-sm text-muted-foreground capitalize">{tx.status === 'completed' ? 'Concluído' : tx.status === 'pending' ? 'Pendente' : tx.status}</div>
                      {tx.status === 'pending' && (
                        <Button onClick={() => forceConfirmTransaction(tx.txid)} size="sm" variant="outline" className="mt-2">Confirmar</Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <ReceiptModal isOpen={showReceiptModal} onClose={() => setShowReceiptModal(false)} type={receiptData?.type} amount={receiptData?.amount || 0} txid={receiptData?.txid || ''} pixKey={receiptData?.pixKey} />
    </Layout>
  );
};

export default Wallet;
