import React, { useState } from 'react';
import { Wallet as WalletIcon, Plus, Minus, Clock, CheckCircle, XCircle, Copy, QrCode, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Layout from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { formatBRL } from '@/lib/formatCurrency';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const PIX_KEY_STATIC = 'brazucabet@pix.com.br';

const Wallet: React.FC = () => {
  const { user, updateBalance } = useAuth();
  const queryClient = useQueryClient();
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [pixKey, setPixKey] = useState('');
  const [showQR, setShowQR] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      return data || [];
    },
    enabled: !!user,
    refetchInterval: 10000,
  });

  const handleDeposit = async () => {
    if (!user) return;
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount < 1) { toast.error('Valor mínimo: R$ 1,00'); return; }

    setIsSubmitting(true);
    const { error } = await supabase.from('transactions').insert({
      user_id: user.id,
      type: 'deposit',
      amount,
      payment_method: 'pix',
    });

    if (error) {
      toast.error('Erro ao criar depósito');
    } else {
      setShowQR(true);
      toast.success('Depósito criado! Aguardando aprovação do admin.');
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    }
    setIsSubmitting(false);
  };

  const handleSimulatePayment = async () => {
    if (!user) return;
    const amount = parseFloat(depositAmount);
    await updateBalance(amount);
    
    // Update most recent pending deposit
    const pendingDeposit = transactions.find(t => t.type === 'deposit' && t.status === 'pending');
    if (pendingDeposit) {
      await supabase.from('transactions').update({ status: 'completed' }).eq('id', pendingDeposit.id);
    }
    
    setShowQR(false);
    setDepositAmount('');
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
    toast.success('✅ Pagamento confirmado! Saldo atualizado.');
  };

  const handleWithdraw = async () => {
    if (!user) return;
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) { toast.error('Digite um valor válido'); return; }
    if (!pixKey.trim()) { toast.error('Digite sua chave PIX'); return; }
    if (amount > user.balance) { toast.error('Saldo insuficiente'); return; }

    setIsSubmitting(true);
    await updateBalance(-amount);
    
    const { error } = await supabase.from('transactions').insert({
      user_id: user.id,
      type: 'withdrawal',
      amount,
      payment_method: 'pix',
      pix_key: pixKey.trim(),
    });

    if (error) {
      await updateBalance(amount); // refund
      toast.error('Erro ao criar saque');
    } else {
      toast.success('Saque solicitado! Aguardando aprovação.');
      setWithdrawAmount('');
      setPixKey('');
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    }
    setIsSubmitting(false);
  };

  const handleCopyKey = () => {
    navigator.clipboard.writeText(PIX_KEY_STATIC);
    toast.success('Chave PIX copiada!');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': case 'approved': return <CheckCircle className="h-4 w-4 text-emerald-500" />;
      case 'rejected': return <XCircle className="h-4 w-4 text-destructive" />;
      default: return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const statusLabel = (s: string) => {
    const map: Record<string, string> = { pending: 'Pendente', completed: 'Concluído', approved: 'Aprovado', rejected: 'Rejeitado', processing: 'Processando' };
    return map[s] || s;
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Balance Cards */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="border-border bg-card">
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground mb-1">Saldo Disponível</p>
              <p className="text-2xl font-bold text-primary">{formatBRL(user?.balance || 0)}</p>
            </CardContent>
          </Card>
          <Card className="border-border bg-card">
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground mb-1">Total de Transações</p>
              <p className="text-2xl font-bold text-foreground">{transactions.length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Deposit/Withdraw Tabs */}
        <Tabs defaultValue="deposit">
          <TabsList className="w-full">
            <TabsTrigger value="deposit" className="flex-1"><Plus className="h-4 w-4 mr-1" /> Depositar</TabsTrigger>
            <TabsTrigger value="withdraw" className="flex-1"><Minus className="h-4 w-4 mr-1" /> Sacar</TabsTrigger>
            <TabsTrigger value="history" className="flex-1"><ArrowUpDown className="h-4 w-4 mr-1" /> Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="deposit">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <QrCode className="h-5 w-5 text-primary" /> Depósito via PIX
                </CardTitle>
                <CardDescription>Depósito mínimo: R$ 1,00</CardDescription>
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
                    />
                    <div className="flex gap-2">
                      {[50, 100, 250, 500, 1000].map(v => (
                        <Button key={v} onClick={() => setDepositAmount(v.toString())} variant="outline" size="sm" className="flex-1 text-xs">
                          R${v}
                        </Button>
                      ))}
                    </div>
                    <Button onClick={handleDeposit} className="w-full" disabled={isSubmitting}>
                      <QrCode className="mr-2 h-4 w-4" /> Gerar PIX
                    </Button>
                  </>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-muted p-4 rounded-lg text-center">
                      <p className="text-sm text-muted-foreground mb-3">QR Code PIX</p>
                      <div className="w-48 h-48 bg-white mx-auto flex items-center justify-center rounded-lg border-4 border-primary">
                        <div className="text-center p-4">
                          <QrCode className="w-24 h-24 text-black mx-auto mb-2" />
                          <p className="text-xs text-black font-mono">{formatBRL(parseFloat(depositAmount))}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 bg-muted p-3 rounded-lg">
                      <Input value={PIX_KEY_STATIC} readOnly className="text-xs" />
                      <Button onClick={handleCopyKey} variant="outline" size="sm"><Copy className="h-4 w-4" /></Button>
                    </div>
                    <Button onClick={handleSimulatePayment} className="w-full bg-emerald-600 hover:bg-emerald-700">
                      ✅ Simular Pagamento Realizado
                    </Button>
                    <Button onClick={() => setShowQR(false)} variant="outline" className="w-full">Cancelar</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="withdraw">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Minus className="h-5 w-5 text-destructive" /> Saque via PIX
                </CardTitle>
                <CardDescription>Saque direto na sua chave PIX • Saldo: {formatBRL(user?.balance || 0)}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  type="number"
                  placeholder="Valor do saque"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                />
                <Input
                  placeholder="Chave PIX (CPF, Email ou Telefone)"
                  value={pixKey}
                  onChange={(e) => setPixKey(e.target.value)}
                />
                <Button onClick={handleWithdraw} className="w-full" variant="outline" disabled={isSubmitting}>
                  Confirmar Saque
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-lg">Histórico de Transações</CardTitle>
              </CardHeader>
              <CardContent>
                {transactions.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground text-sm">Nenhuma transação ainda</p>
                ) : (
                  <div className="space-y-2">
                    {transactions.map((tx: any) => (
                      <div key={tx.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(tx.status)}
                          <div>
                            <p className="text-sm font-medium">{tx.type === 'deposit' ? 'Depósito PIX' : 'Saque PIX'}</p>
                            <p className="text-[10px] text-muted-foreground">{new Date(tx.created_at).toLocaleString('pt-BR')}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-bold ${tx.type === 'deposit' ? 'text-emerald-500' : 'text-destructive'}`}>
                            {tx.type === 'deposit' ? '+' : '-'}{formatBRL(tx.amount)}
                          </p>
                          <p className="text-[10px] text-muted-foreground">{statusLabel(tx.status)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Wallet;
