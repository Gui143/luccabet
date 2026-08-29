import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Users, DollarSign, Gamepad2, Landmark, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatBRL } from '@/lib/formatCurrency';

const COLORS = ['hsl(350,90%,55%)', 'hsl(200,90%,60%)', 'hsl(45,90%,55%)', 'hsl(142,76%,45%)', 'hsl(280,80%,60%)'];

interface Tx {
  amount: number | string;
  status: string;
  created_at: string;
}

const AdminDashboard: React.FC = () => {
  const [houseProfit, setHouseProfit] = useState(0);
  const [treasury, setTreasury] = useState(0);
  const [totalDeposits, setTotalDeposits] = useState(0);
  const [totalWithdrawals, setTotalWithdrawals] = useState(0);
  const [activeUsers24h, setActiveUsers24h] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  const [gameStats, setGameStats] = useState<{ name: string; bets: number; volume: number }[]>([]);
  const [cashflow, setCashflow] = useState<{ day: string; depositos: number; saques: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString();

    const [usersRes, activeRes, winsRes, sportBetsRes, balancesRes, depositsRes, withdrawalsRes] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('last_seen', yesterday),
      supabase.from('game_wins').select('game_name, bet_amount, win_amount'),
      supabase.from('cbfd_bets').select('amount, status, potential_win'),
      supabase.from('profiles').select('balance'),
      supabase.from('transactions').select('amount, status, created_at').eq('type', 'deposit'),
      supabase.from('transactions').select('amount, status, created_at').eq('type', 'withdrawal'),
    ]);

    setTotalUsers(usersRes.count || 0);
    setActiveUsers24h(activeRes.count || 0);

    // Tesouraria (soma dos saldos dos usuários)
    const totalBalance = (balancesRes.data || []).reduce((sum, p: any) => sum + Number(p.balance || 0), 0);
    setTreasury(totalBalance);

    // Depósitos confirmados e saques
    const deposits: Tx[] = (depositsRes.data as Tx[]) || [];
    const withdrawals: Tx[] = (withdrawalsRes.data as Tx[]) || [];
    setTotalDeposits(deposits.filter(t => t.status === 'completed' || t.status === 'approved').reduce((s, t) => s + Number(t.amount), 0));
    setTotalWithdrawals(withdrawals.filter(t => t.status === 'completed' || t.status === 'approved').reduce((s, t) => s + Number(t.amount), 0));

    // Fluxo de caixa dos últimos 7 dias
    const days: { day: string; depositos: number; saques: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      days.push({ day: key, depositos: 0, saques: 0 });
    }
    const dayKey = (iso: string) => {
      const d = new Date(iso);
      return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    };
    for (const t of deposits) if (t.status === 'completed' || t.status === 'approved') {
      const k = dayKey(t.created_at);
      const row = days.find(d => d.day === k);
      if (row) row.depositos += Number(t.amount);
    }
    for (const t of withdrawals) if (t.status === 'completed' || t.status === 'approved') {
      const k = dayKey(t.created_at);
      const row = days.find(d => d.day === k);
      if (row) row.saques += Number(t.amount);
    }
    setCashflow(days);

    // Lucro da casa (jogos de cassino + esportes)
    let casinoLosses = 0;
    let casinoGains = 0;
    const gameMap: Record<string, { bets: number; volume: number }> = {};

    if (winsRes.data) {
      for (const w of winsRes.data) {
        casinoGains += Number(w.bet_amount);
        casinoLosses += Number(w.win_amount);
        const name = w.game_name || 'Unknown';
        if (!gameMap[name]) gameMap[name] = { bets: 0, volume: 0 };
        gameMap[name].bets++;
        gameMap[name].volume += Number(w.bet_amount);
      }
    }

    if (sportBetsRes.data) {
      let sportGains = 0;
      let sportLosses = 0;
      for (const b of sportBetsRes.data) {
        sportGains += Number(b.amount);
        if (b.status === 'won') sportLosses += Number(b.potential_win);
      }
      casinoGains += sportGains;
      casinoLosses += sportLosses;
      if (!gameMap['Futebol']) gameMap['Futebol'] = { bets: 0, volume: 0 };
      gameMap['Futebol'].bets += sportBetsRes.data.length;
      gameMap['Futebol'].volume += sportGains;
    }

    setHouseProfit(casinoGains - casinoLosses);
    setGameStats(Object.entries(gameMap).map(([name, d]) => ({ name, ...d })).sort((a, b) => b.volume - a.volume));
    setLoading(false);
  };

  if (loading) return <p className="text-muted-foreground text-center py-8">Carregando dashboard...</p>;

  const tooltipStyle = {
    contentStyle: { background: 'hsl(0 0% 7%)', border: '1px solid hsl(0 0% 14%)', borderRadius: 8 },
    labelStyle: { color: 'hsl(0 0% 95%)' },
  };

  return (
    <div className="space-y-4">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="card-gradient border-border">
          <CardContent className="pt-4 pb-3 px-3">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-primary" />
              <span className="text-[10px] text-muted-foreground uppercase">Lucro da Casa</span>
            </div>
            <p className={`text-lg font-bold ${houseProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
              {houseProfit >= 0 ? '+' : ''}{formatBRL(houseProfit)}
            </p>
          </CardContent>
        </Card>
        <Card className="card-gradient border-border">
          <CardContent className="pt-4 pb-3 px-3">
            <div className="flex items-center gap-2 mb-1">
              <Landmark className="w-4 h-4 text-primary" />
              <span className="text-[10px] text-muted-foreground uppercase">Tesouraria</span>
            </div>
            <p className="text-lg font-bold">{formatBRL(treasury)}</p>
          </CardContent>
        </Card>
        <Card className="card-gradient border-border">
          <CardContent className="pt-4 pb-3 px-3">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground uppercase">Total Usuários</span>
            </div>
            <p className="text-lg font-bold">{totalUsers}</p>
            <p className="text-[10px] text-muted-foreground">{activeUsers24h} ativos 24h</p>
          </CardContent>
        </Card>
        <Card className="card-gradient border-border">
          <CardContent className="pt-4 pb-3 px-3">
            <div className="flex items-center gap-2 mb-1">
              <Gamepad2 className="w-4 h-4 text-primary" />
              <span className="text-[10px] text-muted-foreground uppercase">Jogos Ativos</span>
            </div>
            <p className="text-lg font-bold">{gameStats.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Depósitos x Saques */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card className="card-gradient border-border">
          <CardContent className="pt-4 pb-3 px-3">
            <div className="flex items-center gap-2 mb-1">
              <ArrowUpCircle className="w-4 h-4 text-emerald-400" />
              <span className="text-[10px] text-muted-foreground uppercase">Total Depositado</span>
            </div>
            <p className="text-lg font-bold text-emerald-400">+{formatBRL(totalDeposits)}</p>
          </CardContent>
        </Card>
        <Card className="card-gradient border-border">
          <CardContent className="pt-4 pb-3 px-3">
            <div className="flex items-center gap-2 mb-1">
              <ArrowDownCircle className="w-4 h-4 text-destructive" />
              <span className="text-[10px] text-muted-foreground uppercase">Total Sacado</span>
            </div>
            <p className="text-lg font-bold text-destructive">-{formatBRL(totalWithdrawals)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Fluxo de Caixa 7 dias */}
      <Card className="card-gradient border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Fluxo de Caixa (7 dias)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={cashflow}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 14%)" />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'hsl(0 0% 55%)' }} />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(0 0% 55%)' }} />
              <Tooltip {...tooltipStyle} formatter={(v: number) => formatBRL(v)} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="depositos" name="Depósitos" stroke="hsl(142 76% 45%)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="saques" name="Saques" stroke="hsl(350 90% 55%)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Game Volume Bar Chart */}
        <Card className="card-gradient border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Volume por Jogo
            </CardTitle>
          </CardHeader>
          <CardContent>
            {gameStats.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={gameStats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 14%)" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(0 0% 55%)' }} />
                  <YAxis tick={{ fontSize: 10, fill: 'hsl(0 0% 55%)' }} />
                  <Tooltip
                    contentStyle={{ background: 'hsl(0 0% 7%)', border: '1px solid hsl(0 0% 14%)', borderRadius: 8 }}
                    labelStyle={{ color: 'hsl(0 0% 95%)' }}
                    formatter={(v: number) => [formatBRL(v), 'Volume']}
                  />
                  <Bar dataKey="volume" fill="hsl(350 90% 55%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-8">Sem dados</p>
            )}
          </CardContent>
        </Card>

        {/* Bets per Game Pie */}
        <Card className="card-gradient border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Gamepad2 className="w-4 h-4 text-primary" />
              Apostas por Jogo
            </CardTitle>
          </CardHeader>
          <CardContent>
            {gameStats.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={gameStats} dataKey="bets" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {gameStats.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: 'hsl(0 0% 7%)', border: '1px solid hsl(0 0% 14%)', borderRadius: 8 }}
                    formatter={(v: number) => [v, 'Apostas']}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-8">Sem dados</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
