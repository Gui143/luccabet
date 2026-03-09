import React, { useEffect, useState } from 'react';
import { Crown } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { getVipLevel, getNextVipLevel, getVipProgress, VIP_LEVELS } from '@/lib/vipLevels';
import { formatBRL } from '@/lib/formatCurrency';

interface VipBadgeProps {
  compact?: boolean;
  userId?: string;
  totalWagered?: number;
}

const VipBadge: React.FC<VipBadgeProps> = ({ compact = false, userId, totalWagered: propWagered }) => {
  const { user } = useAuth();
  const [totalWagered, setTotalWagered] = useState(propWagered ?? 0);

  useEffect(() => {
    if (propWagered !== undefined) {
      setTotalWagered(propWagered);
      return;
    }
    const id = userId || user?.id;
    if (!id) return;

    // Sum all bets from game_wins as a proxy for wagered amount
    supabase
      .from('game_wins')
      .select('bet_amount')
      .eq('user_id', id)
      .then(({ data }) => {
        if (data) {
          setTotalWagered(data.reduce((s, r) => s + Number(r.bet_amount), 0));
        }
      });
  }, [userId, user?.id, propWagered]);

  const level = getVipLevel(totalWagered);
  const next = getNextVipLevel(totalWagered);
  const progress = getVipProgress(totalWagered);

  if (compact) {
    return (
      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border ${level.badgeClass}`}>
        <Crown className="w-3 h-3" />
        {level.name}
      </span>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-bold border ${level.badgeClass}`}>
          <Crown className="w-3.5 h-3.5" />
          {level.name}
        </span>
        <span className="text-xs text-muted-foreground">Nível VIP</span>
      </div>
      <Progress value={progress} className="h-2" />
      {next ? (
        <p className="text-xs text-muted-foreground">
          Faltam {formatBRL(next.minWagered - totalWagered)} apostados para o nível <span className="font-bold">{next.name}</span>
        </p>
      ) : (
        <p className="text-xs text-muted-foreground font-bold">Nível máximo atingido! 💎</p>
      )}
    </div>
  );
};

export default VipBadge;
