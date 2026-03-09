import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Users, DollarSign, Gamepad2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatBRL } from '@/lib/formatCurrency';

const COLORS = ['hsl(350,90%,55%)', 'hsl(200,90%,60%)', 'hsl(45,90%,55%)', 'hsl(142,76%,45%)', 'hsl(280,80%,60%)'];

const AdminDashboard: React.FC = () => {
  const [houseProfit, setHouseProfit] = useState(0);
  const [activeUsers24h, setActiveUsers24h] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  const [gameStats, setGameStats] = useState<{ name: string; bets: number; volume: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    // Active users in last 24h
    const yesterday = new Date(Date.now() - 86400000).toISOString();
    
    const [usersRes, activeRes, winsRes, cbfdBetsRes] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('last_seen', yesterday),
      supabase.from('game_wins').select('game_name, bet_amount, win_amount'),
      supabase.from('cbfd_bets').select('amount, status, potential_win'),
    ]);

    setTotalUsers(usersRes.count || 0);
    setActiveUsers24h(activeRes.count || 0);

    // Calculate house profit from casino games
    let casinoLosses = 0; // money house lost (user wins)
    let casinoGains = 0; // money house gained (user bets)
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

    // CBFD bets
    if (cbfdBetsRes.data) {
      let cbfdGains = 0;
      let cbfdLosses = 0;
      for (const b of cbfdBetsRes.data) {
        cbfdGains += Number(b.amount);
        if (b.status === 'won') cbfdLosses += Number(b.potential_win);
      }
      casinoGains += cbfdGains;
      casinoLosses += cbfdLosses;
      if (!gameMap['Futebol CBFD']) gameMap['Futebol CBFD'] = { bets: 0, volume: 0 };
      gameMap['Futebol CBFD'].bets += cbfdBetsRes.data.length;
      gameMap['Futebol CBFD'].volume += cbfdGains;
    }

    setHouseProfit(casinoGains - casinoLosses);
    setGameStats(Object.entries(gameMap).map(([name, d]) => ({ name, ...d })).sort((a, b) => b.volume - a.volume));
    setLoading(false);
  };

  if (loading) return <p className="text-muted-foreground text-center py-8">Carregando dashboard...</p>;

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
              <Users className="w-4 h-4 text-primary" />
              <span className="text-[10px] text-muted-foreground uppercase">Ativos 24h</span>
            </div>
            <p className="text-lg font-bold">{activeUsers24h}</p>
          </CardContent>
        </Card>
        <Card className="card-gradient border-border">
          <CardContent className="pt-4 pb-3 px-3">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground uppercase">Total Usuários</span>
            </div>
            <p className="text-lg font-bold">{totalUsers}</p>
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
