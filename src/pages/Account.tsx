import React, { useState } from 'react';
import { User, Mail, TrendingUp, Gift } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import Layout from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { formatBRL } from '@/lib/formatCurrency';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const Account: React.FC = () => {
  const { user, getBetHistory } = useAuth();
  const bets = getBetHistory();
  
  const [redeemCode, setRedeemCode] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);

  if (!user) return null;

  const totalWagered = bets.reduce((sum, bet) => sum + bet.amount, 0);
  const totalProfit = bets.reduce((sum, bet) => sum + bet.profit, 0);

  const handleRedeemCode = async () => {
    if (!redeemCode.trim()) {
      toast.error('Digite um código');
      return;
    }

    setIsRedeeming(true);
    
    const { data, error } = await supabase.functions.invoke('redeem-code', {
      body: { code: redeemCode.trim() }
    });

    if (error) {
      toast.error(error.message || 'Erro ao resgatar código');
    } else if (data?.error) {
      toast.error(data.error);
    } else if (data?.success) {
      toast.success(`Código resgatado! +€ ${Number(data.bonus).toFixed(2)} adicionados ao seu saldo`);
      setRedeemCode('');
      // Reload page to update balance
      window.location.reload();
    }

    setIsRedeeming(false);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold mb-2">Conta</h2>
          <p className="text-muted-foreground">Gerencie seu perfil e saldo</p>
        </div>

        <Card className="card-gradient border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-6 w-6 text-primary" />
              Informações do Perfil
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm text-muted-foreground mb-1">Nome de Usuário</div>
              <div className="text-lg font-semibold">{user.username}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1 flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email
              </div>
              <div className="text-lg font-semibold">{user.email}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">ID da Conta</div>
              <div className="text-sm font-mono bg-muted p-2 rounded">{user.id}</div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-gradient border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-primary" />
              Estatísticas
            </CardTitle>
            <CardDescription>Resumo do seu desempenho em apostas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <div className="text-sm text-muted-foreground mb-1">Total de Apostas</div>
                <div className="text-2xl font-bold">{bets.length}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Total Apostado</div>
                <div className="text-2xl font-bold text-primary">{formatBRL(totalWagered)}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Lucro/Prejuízo</div>
                <div className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {totalProfit >= 0 ? '+' : ''}{formatBRL(totalProfit)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-gradient border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-6 w-6 text-primary" />
              Resgatar Código
            </CardTitle>
            <CardDescription>Insira um código promocional para receber bônus</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="promo-code">Código Promocional</Label>
              <Input
                id="promo-code"
                value={redeemCode}
                onChange={(e) => setRedeemCode(e.target.value.toUpperCase())}
                placeholder="Digite seu código"
                className="mt-1"
              />
            </div>
            <Button 
              onClick={handleRedeemCode} 
              disabled={isRedeeming}
              className="w-full glow-primary"
            >
              {isRedeeming ? 'Processando...' : 'Resgatar'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Account;
