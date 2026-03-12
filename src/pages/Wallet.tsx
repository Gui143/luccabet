import React, { useState } from 'react';
import { Wallet as WalletIcon, Plus, Minus, Clock, CheckCircle, XCircle, Copy, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Layout from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { useWallet } from '@/contexts/WalletContext';
import { formatBRL } from '@/lib/formatCurrency';
import { toast } from 'sonner';

const PIX_KEY_STATIC = 'brazucabet@pix.com.br';

const Wallet: React.FC = () => {
  const { user } = useAuth();
  const { pendingBalance, transactions, isLoading, createDeposit, createWithdraw, forceConfirmTransaction } = useWallet();

  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [pixKey, setPixKey] = useState('');
  const [showQR, setShowQR] = useState(false);
  const [currentTxid, setCurrentTxid] = useState<string | null>(null);
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);

  const handleGeneratePix = async () => {
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount < 1) { toast.error('Valor mínimo: R$ 1,00'); return; }
    try {
      const result = await createDeposit(amount);
      setCurrentTxid(result.txid);
      setShowQR(true);
    } catch (error) {}
  };

  const handleSimulatePayment = () => {
    if (currentTxid) {
      forceConfirmTransaction(currentTxid);
      setShowQR(false);
      setDepositAmount('');
      setCurrentTxid(null);
      toast.success('✅ Pagamento confirmado! Saldo atualizado.');
    }
  };

  const handleCopyKey = () => {
    navigator.clipboard.writeText(PIX_KEY_STATIC);
    toast.success('Chave PIX copiada!');
  };

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) { toast.error('Digite um valor válido'); return; }
    if (!pixKey.trim()) { toast.error('Digite sua chave PIX'); return; }
    try {
      await createWithdraw(amount);
      setWithdrawSuccess(true);
      setWithdrawAmount('');
      setPixKey('');
      setTimeout(() => setWithdrawSuccess(false), 5000);
    } catch (error) {}
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-5 w-5 text-primary" />;
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
            <CardDescription>Gerencie seu saldo via PIX</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-muted p-4 rounded-lg border border-border">
                <div className="text-sm text-muted-foreground mb-1">Saldo Disponível</div>
                <div className="text-3xl font-bold text-primary">{formatBRL(user?.balance || 0)}</div>
              </div>
              <div className="bg-muted p-4 rounded-lg border border-border">
                <div className="text-sm text-muted-foreground mb-1">Saldo Pendente</div>
                <div className="text-3xl font-bold text-accent">{formatBRL(pendingBalance)}</div>
              </div>
              <div className="bg-muted p-4 rounded-lg border border-border">
                <div className="text-sm text-muted-foreground mb-1">Saldo Total</div>
                <div className="text-3xl font-bold text-foreground">{formatBRL(user ? user.balance + pendingBalance : 0)}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Deposit PIX */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Plus className="h-5 w-5 text-primary" /> Depósito via PIX
                  </CardTitle>
                  <CardDescription>Mínimo: R$ 1,00</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!showQR ? (
                    <>
                      <Input
                        type="number"
                        placeholder="Valor do depósito"
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value)}
                        min={1}
                        className="bg-input"
                      />
                      <div className="flex gap-2">
                        {[50, 100, 250, 500].map(amount => (
                          <Button key={amount} onClick={() => setDepositAmount(amount.toString())} variant="outline" size="sm" className="flex-1">
                            R${amount}
                          </Button>
                        ))}
                      </div>
                      <Button onClick={handleGeneratePix} className="w-full" disabled={isLoading}>
                        <QrCode className="mr-2 h-4 w-4" /> Gerar PIX
                      </Button>
                    </>
                  ) : (
                    <div className="space-y-4">
                      <div className="bg-muted p-4 rounded-lg text-center">
                        <div className="text-sm text-muted-foreground mb-3">QR Code PIX</div>
                        <div className="w-48 h-48 bg-white mx-auto flex items-center justify-center rounded-lg border-4 border-primary">
                          <div className="text-center p-4">
                            <QrCode className="w-24 h-24 text-black mx-auto mb-2" />
                            <div className="text-xs text-black font-mono">{formatBRL(parseFloat(depositAmount))}</div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 bg-muted p-3 rounded-lg">
                        <Input value={PIX_KEY_STATIC} readOnly className="bg-input text-xs" />
                        <Button onClick={handleCopyKey} variant="outline" size="sm">
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <Button onClick={handleSimulatePayment} className="w-full bg-primary hover:bg-primary/90">
                        ✅ Simular Pagamento Realizado
                      </Button>
                      <Button onClick={() => { setShowQR(false); setCurrentTxid(null); }} variant="outline" className="w-full">
                        Cancelar
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Withdraw PIX */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Minus className="h-5 w-5 text-destructive" /> Saque via PIX
                  </CardTitle>
                  <CardDescription>Saque direto na sua chave PIX</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {withdrawSuccess ? (
                    <div className="text-center p-6 bg-primary/10 rounded-lg border border-primary/30">
                      <CheckCircle className="w-12 h-12 text-primary mx-auto mb-3" />
                      <p className="text-lg font-bold text-primary">Saque em processamento</p>
                      <p className="text-sm text-muted-foreground mt-1">Enviaremos via PIX em breve.</p>
                    </div>
                  ) : (
                    <>
                      <Input
                        type="number"
                        placeholder="Valor do saque"
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                        className="bg-input"
                      />
                      <Input
                        type="text"
                        placeholder="Chave PIX (CPF, Email ou Telefone)"
                        value={pixKey}
                        onChange={(e) => setPixKey(e.target.value)}
                        className="bg-input"
                      />
                      <Button onClick={handleWithdraw} className="w-full" variant="outline" disabled={isLoading}>
                        Confirmar Saque
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
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
                        <div className="font-medium capitalize">{tx.type === 'deposit' ? 'Depósito PIX' : tx.type === 'withdraw' ? 'Saque PIX' : tx.type}</div>
                        <div className="text-sm text-muted-foreground">{new Date(tx.timestamp).toLocaleString('pt-BR')}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-lg font-bold ${tx.type === 'deposit' || tx.type === 'win' ? 'text-primary' : 'text-destructive'}`}>
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
    </Layout>
  );
};

export default Wallet;
