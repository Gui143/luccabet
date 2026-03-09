import React, { useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { formatBRLShort } from '@/lib/formatCurrency';

interface Winner {
  username: string;
  win_amount: number;
  game_name: string;
  multiplier: number;
}

const maskName = (name: string) => {
  if (name.length <= 3) return name + '***';
  return name.slice(0, 3) + '***';
};

const Leaderboard: React.FC = () => {
  const [winners, setWinners] = useState<Winner[]>([]);

  useEffect(() => {
    loadWinners();
  }, []);

  const loadWinners = async () => {
    // Get top wins from last 7 days
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const { data } = await supabase
      .from('game_wins')
      .select('win_amount, game_name, multiplier, user_id')
      .gte('created_at', weekAgo.toISOString())
      .order('win_amount', { ascending: false })
      .limit(10);

    if (!data || data.length === 0) {
      // Show placeholder data for social proof
      setWinners([
        { username: 'Luc***', win_amount: 1250, game_name: 'Aviator', multiplier: 12.5 },
        { username: 'Mar***', win_amount: 890, game_name: 'Blackjack', multiplier: 2.5 },
        { username: 'Ped***', win_amount: 650, game_name: 'Slots', multiplier: 32.0 },
        { username: 'Ana***', win_amount: 420, game_name: 'Aviator', multiplier: 8.4 },
        { username: 'Joa***', win_amount: 380, game_name: 'Mines', multiplier: 3.8 },
      ]);
      return;
    }

    // Fetch profiles for names
    const userIds = [...new Set(data.map(d => d.user_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username')
      .in('id', userIds);

    const profileMap = new Map(profiles?.map(p => [p.id, p.username]) || []);

    setWinners(data.map(d => ({
      username: maskName(profileMap.get(d.user_id) || 'User'),
      win_amount: d.win_amount,
      game_name: d.game_name,
      multiplier: d.multiplier,
    })));
  };

  return (
    <Card className="border-border bg-card/80 backdrop-blur">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Trophy className="h-5 w-5 text-yellow-500" />
          Top Vencedores da Semana
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border">
          {winners.map((w, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-3">
                <span className={`text-sm font-bold w-6 text-center ${
                  i === 0 ? 'text-yellow-400' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-amber-600' : 'text-muted-foreground'
                }`}>
                  {i + 1}º
                </span>
                <div>
                  <p className="text-sm font-medium">{w.username}</p>
                  <p className="text-xs text-muted-foreground">{w.game_name} • {w.multiplier.toFixed(1)}x</p>
                </div>
              </div>
              <span className="text-sm font-bold text-green-400">{formatBRLShort(w.win_amount)}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default Leaderboard;
