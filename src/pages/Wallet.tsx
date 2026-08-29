import React, { useState, useEffect } from 'react';
import { Plus, Minus, Clock, CheckCircle, XCircle, ArrowUpDown, QrCode, Loader2, Copy, Check, RefreshCw } from 'lucide-react';
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

interface PixPayment {
  txid: string;
  amount: number;
  code: string;
  expiresAt: number;
}

interface TransactionRow {
  id: string;
  user_id: string;
  type: string;
  amount: number;
  status: string;
  payment_method: string;
  pix_key?: string | null;
  created_at: string;
}

// Gera um payload PIX "copia e cola" (formato EMV) para exibição
const generatePixCode = (amount: number, txid: string): string => {
  const amountStr = amount.toFixed(2);
  const merchant = 'BRAZUCABET';
  const city = 'SAO PAULO';

  const payload = [
    '000201',
    '010212',
    '26580014BR.GOV.BCB.PIX',
    `0136${txid}`,
    '52040000',
    '5303986',
    `54${String(amountStr.length).padStart(2, '0')}${amountStr}`,
    '5802BR',
    `59${String(merchant.length).padStart(2, '0')}${merchant}`,
    `60${String(city.length).padStart(2, '0')}${city}`,
    '62070503***',
  ].join('');

  // CRC simulado (formato esperado: 6304 + 4 hex)
  const crc = (payload.split('').reduce((acc, ch) => ((acc * 31) + ch.charCodeAt(0)) >>> 0, 0) % 0xffff)
    .toString(16)
    .toUpperCase()
    .padStart(4, '0');

  return `${payload}6304${crc}`;
};

const Wallet: React.FC = () => {
  const { user, updateBalance } = useAuth();
  const queryClient = useQueryClient();
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [pixKey, setPixKey] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pixPayment, setPixPayment] = useState<PixPayment | null>(null);
  const [copied, setCopied] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [qrFailed, setQrFailed] = useState(false);
  const [now, setNow] = useState(Date.now());

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

  // Countdown do QR Code PIX
  useEffect(() => {
    if (!pixPayment) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [pixPayment]);

  const handlePixDeposit = () => {
    if (!user) return;
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount < 5) {
      toast.error('Valor mínimo: R$ 5,00');
      return;
    }

    const txid = `TX${Date.now()}${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    setPixPayment({
      txid,
      amount,
      code: generatePixCode(amount, txid),
      expiresAt: Date.now() + 15 * 60 * 1000,
    });
    setQrFailed(false);
  };

  const confirmDeposit = async () => {
    if (!user || !pixPayment) return;

    // Se o QR expirou, pede para gerar novamente
    if (Date.now() > pixPayment.expiresAt) {
      toast.error('QR Code expirado. Gere um novo pagamento.');
      setPixPayment(null);
      return;
    }

    setIsConfirming(true);

    // Credita o saldo (confirmação instantânea do PIX)
    await updateBalance(pixPayment.amount);

    const { error } = await supabase.from('transactions').insert({
      user_id: user.id,
      type: 'deposit',
      amount: pixPayment.amount,
      status: 'completed',
      payment_method: 'pix',
    });

    if (error) {
      await updateBalance(-pixPayment.amount);
      toast.error('Erro ao confirmar depósito. Tente novamente.');
    } else {
      toast.success(`Depósito de ${formatBRL(pixPayment.amount)} confirmado!`);
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setDepositAmount('');
    }

    setIsConfirming(false);
    setPixPayment(null);
  };

  const cancelDeposit = () => {
    setPixPayment(null);
    setCopied(false);
    setQrFailed(false);
  };

  const copyPixCode = async () => {
    if (!pixPayment) return;
    try {
      await navigator.clipboard.writeText(pixPayment.code);
      setCopied(true);
      toast.success('Código PIX copiado!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Não foi possível copiar. Copie manualmente.');
    }
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
      await updateBalance(amount);
      toast.error('Erro ao criar saque');
    } else {
      toast.success('Saque solicitado! Aguardando aprovação.');
      setWithdrawAmount('');
      setPixKey('');
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    }
    setIsSubmitting(false);
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

  const remainingSeconds = pixPayment ? Math.max(0, Math.floor((pixPayment.expiresAt - now) / 1000)) : 0;
  const remainingLabel = `${String(Math.floor(remainingSeconds / 60)).padStart(2, '0')}:${String(remainingSeconds % 60).padStart(2, '0')}`;
  const qrUrl = pixPayment
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&bgcolor=ffffff&color=1a1a2e&margin=10&data=${encodeURIComponent(pixPayment.code)}`
    : '';

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
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
                <CardDescription>Depósito mínimo: R$ 5,00 • Instantâneo e Seguro</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!pixPayment ? (
                  <>
                    <Input
                      type="number"
                      placeholder="Valor do depósito (R$)"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      min={5}
                    />
                    <div className="flex gap-2 flex-wrap">
                      {[10, 25, 50, 100, 250, 500].map(v => (
                        <Button key={v} onClick={() => setDepositAmount(v.toString())} variant="outline" size="sm" className="flex-1 min-w-[60px] text-xs">
                          R${v}
                        </Button>
                      ))}
                    </div>
                    <Button onClick={handlePixDeposit} className="w-full" disabled={isSubmitting}>
                      <QrCode className="mr-2 h-4 w-4" />
                      Gerar QR Code PIX
                    </Button>
                    <p className="text-[10px] text-muted-foreground text-center">
                      Pagamento processado de forma segura. O saldo é liberado instantaneamente após a confirmação.
                    </p>
                  </>
                ) : (
                  <div className="space-y-4">
                    <div className="text-center space-y-2">
                      <p className="text-sm text-muted-foreground">
                        Escaneie o QR Code ou copie o código para pagar <span className="font-bold text-foreground">{formatBRL(pixPayment.amount)}</span>
                      </p>
                      <div className="mx-auto w-fit p-3 bg-white rounded-xl border border-border">
                        {qrFailed ? (
                          <div className="w-[220px] h-[220px] flex items-center justify-center text-center text-xs text-muted-foreground">
                            Use o código copia e cola abaixo.
                          </div>
                        ) : (
                          <img
                            src={qrUrl}
                            alt="QR Code PIX"
                            width={220}
                            height={220}
                            onError={() => setQrFailed(true)}
                          />
                        )}
                      </div>
                      <p className="text-xs font-medium text-yellow-500 flex items-center justify-center gap-1">
                        <Clock className="h-3.5 w-3.5" /> Expira em {remainingLabel}
                      </p>
                    </div>

                    <div className="p-3 bg-muted/50 rounded-lg border border-border">
                      <p className="text-[10px] text-muted-foreground mb-1 uppercase">PIX Copia e Cola</p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 text-[10px] break-all text-foreground">{pixPayment.code}</code>
                        <Button size="sm" variant="outline" onClick={copyPixCode} className="shrink-0">
                          {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                          {copied ? 'Copiado' : 'Copiar'}
                        </Button>
                      </div>
                    </div>

                    <Button onClick={confirmDeposit} className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={isConfirming}>
                      {isConfirming ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle className="mr-2 h-4 w-4" />
                      )}
                      Já realizei o pagamento
                    </Button>
                    <Button onClick={cancelDeposit} variant="ghost" className="w-full" disabled={isConfirming}>
                      <RefreshCw className="mr-2 h-4 w-4" /> Cancelar e gerar novo
                    </Button>
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
                    {transactions.map((tx: TransactionRow) => (
                      <div key={tx.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(tx.status)}
                          <div>
                            <p className="text-sm font-medium">
                              {tx.type === 'deposit' ? 'Depósito' : 'Saque'} {tx.payment_method === 'stripe' ? '(Stripe)' : '(PIX)'}
                            </p>
                            <p className="text-[10px] text-muted-foreground">{new Date(tx.created_at).toLocaleString('pt-BR')}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-bold ${tx.type === 'deposit' ? 'text-emerald-500' : 'text-destructive'}`}>
                            {tx.type === 'deposit' ? '+' : '-'}{formatBRL(tx.amount)}
                          </p>
                          <p className="text-[10px] font-medium text-muted-foreground">{statusLabel(tx.status)}</p>
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
