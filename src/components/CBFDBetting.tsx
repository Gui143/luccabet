import React, { useState, useEffect } from 'react';
import { Trophy, Calendar, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { formatEURShort } from '@/lib/formatCurrency';

interface CBFDGame {
  id: string;
  team_a: string;
  team_b: string;
  odd: number;
  odd_a: number;
  odd_draw: number;
  odd_b: number;
  championship: string;
  is_active: boolean;
  match_date: string | null;
}

const CBFDBetting: React.FC = () => {
  const { user, updateBalance } = useAuth();
  const [games, setGames] = useState<CBFDGame[]>([]);
  const [selectedGame, setSelectedGame] = useState<CBFDGame | null>(null);
  const [betType, setBetType] = useState<string>('');
  const [betAmount, setBetAmount] = useState<string>('');
  const [isPlacingBet, setIsPlacingBet] = useState(false);
  const [showBetDialog, setShowBetDialog] = useState(false);

  useEffect(() => {
    loadGames();

    const channel = supabase
      .channel('cbfd-games-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cbfd_games'
        },
        () => loadGames()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadGames = async () => {
    const { data, error } = await supabase
      .from('cbfd_games')
      .select('*')
      .eq('is_active', true)
      .order('match_date', { ascending: true });

    if (!error && data) {
      setGames(data as CBFDGame[]);
    }
  };

  const openBetDialog = (game: CBFDGame) => {
    setSelectedGame(game);
    setBetType('');
    setBetAmount('');
    setShowBetDialog(true);
  };

  const getSelectedOdd = (): number => {
    if (!selectedGame || !betType) return 0;
    if (betType === 'team_a') return selectedGame.odd_a;
    if (betType === 'draw') return selectedGame.odd_draw;
    if (betType === 'team_b') return selectedGame.odd_b;
    return 0;
  };

  const getSelectedTeamLabel = (): string => {
    if (!selectedGame || !betType) return '';
    if (betType === 'team_a') return selectedGame.team_a;
    if (betType === 'draw') return 'Empate';
    if (betType === 'team_b') return selectedGame.team_b;
    return '';
  };

  const handlePlaceBet = async () => {
    if (!user || !selectedGame || !betType || !betAmount) {
      toast.error('Preencha todos os campos');
      return;
    }

    const amount = parseFloat(betAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Digite um valor válido');
      return;
    }

    if (amount > user.balance) {
      toast.error('Saldo insuficiente');
      return;
    }

    setIsPlacingBet(true);

    try {
      const selectedOdd = getSelectedOdd();
      const potentialWin = amount * selectedOdd;

      // Deduct balance first
      const { error: balanceError } = await supabase
        .from('profiles')
        .update({ balance: user.balance - amount })
        .eq('id', user.id);

      if (balanceError) {
        throw new Error('Erro ao debitar saldo');
      }

      // Create bet record with bet_type
      const { error: betError } = await supabase
        .from('cbfd_bets')
        .insert({
          user_id: user.id,
          game_id: selectedGame.id,
          amount,
          odd: selectedOdd,
          selected_team: getSelectedTeamLabel(),
          bet_type: betType,
          potential_win: potentialWin,
          status: 'open'
        });

      if (betError) {
        // Rollback balance
        await supabase
          .from('profiles')
          .update({ balance: user.balance })
          .eq('id', user.id);
        throw new Error('Erro ao registrar aposta');
      }

      // Update local balance
      await updateBalance(-amount);

      toast.success(`Aposta de € ${amount.toFixed(2)} em ${getSelectedTeamLabel()} registrada!`);
      setShowBetDialog(false);
      setSelectedGame(null);
      setBetType('');
      setBetAmount('');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao fazer aposta');
    } finally {
      setIsPlacingBet(false);
    }
  };

  if (games.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
        <Trophy className="h-5 w-5 sm:h-6 sm:w-6 text-secondary" />
        APOSTE EM TIMES VIRTUAIS
      </h3>

      <div className="grid gap-3 sm:gap-4">
        {games.map((game) => (
          <Card key={game.id} className="bet-card overflow-hidden">
            <CardContent className="p-3 sm:p-6">
              <div className="flex flex-col gap-3">
                {/* Match info */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="w-2 h-2 bg-success rounded-full animate-pulse shrink-0"></span>
                  <span className="text-xs sm:text-sm text-success font-medium">DISPONÍVEL</span>
                  <span className="text-xs text-muted-foreground">• {game.championship}</span>
                </div>

                {/* Teams */}
                <div className="font-semibold text-base sm:text-lg">
                  {game.team_a} <span className="text-muted-foreground">vs</span> {game.team_b}
                </div>

                {/* Date/Time */}
                {game.match_date && (
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    {new Date(game.match_date).toLocaleDateString('pt-BR')} às{' '}
                    {new Date(game.match_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}

                {/* Odds Display */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border">
                  <div className="text-center p-2 rounded-lg bg-muted/50">
                    <div className="text-lg sm:text-xl font-bold text-primary">{Number(game.odd_a).toFixed(2)}</div>
                    <div className="text-[10px] sm:text-xs text-muted-foreground truncate">{game.team_a}</div>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-muted/50">
                    <div className="text-lg sm:text-xl font-bold text-muted-foreground">{Number(game.odd_draw).toFixed(2)}</div>
                    <div className="text-[10px] sm:text-xs text-muted-foreground">Empate</div>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-muted/50">
                    <div className="text-lg sm:text-xl font-bold text-secondary">{Number(game.odd_b).toFixed(2)}</div>
                    <div className="text-[10px] sm:text-xs text-muted-foreground truncate">{game.team_b}</div>
                  </div>
                </div>

                {/* Bet Button */}
                <Button 
                  onClick={() => openBetDialog(game)} 
                  className="w-full glow-primary h-10 sm:h-11 text-sm sm:text-base"
                  disabled={!user}
                >
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Fazer Aposta
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Bet Dialog */}
      <Dialog open={showBetDialog} onOpenChange={setShowBetDialog}>
        <DialogContent className="max-w-md mx-4">
          <DialogHeader>
            <DialogTitle className="text-lg">Fazer Aposta</DialogTitle>
            <DialogDescription>
              {selectedGame?.team_a} vs {selectedGame?.team_b}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            {/* Bet Type Selection */}
            <div className="space-y-2">
              <Label>Escolha o Resultado</Label>
              <RadioGroup value={betType} onValueChange={setBetType}>
                <div className="flex items-center space-x-2 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="team_a" id="bet_team_a" />
                  <Label htmlFor="bet_team_a" className="cursor-pointer flex-1 flex justify-between">
                    <span>{selectedGame?.team_a}</span>
                    <span className="font-bold text-primary">{Number(selectedGame?.odd_a || 0).toFixed(2)}x</span>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="draw" id="bet_draw" />
                  <Label htmlFor="bet_draw" className="cursor-pointer flex-1 flex justify-between">
                    <span>Empate</span>
                    <span className="font-bold text-muted-foreground">{Number(selectedGame?.odd_draw || 0).toFixed(2)}x</span>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="team_b" id="bet_team_b" />
                  <Label htmlFor="bet_team_b" className="cursor-pointer flex-1 flex justify-between">
                    <span>{selectedGame?.team_b}</span>
                    <span className="font-bold text-secondary">{Number(selectedGame?.odd_b || 0).toFixed(2)}x</span>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label>Valor da Aposta (€)</Label>
              <Input
                type="number"
                value={betAmount}
                onChange={(e) => setBetAmount(e.target.value)}
                placeholder="Ex: 10.00"
                min="0.01"
                step="0.01"
              />
              {user && (
                <p className="text-xs text-muted-foreground">
                  Saldo disponível: {formatEURShort(user.balance)}
                </p>
              )}
            </div>

            {/* Potential Win */}
            {betType && betAmount && parseFloat(betAmount) > 0 && selectedGame && (
              <div className="p-3 rounded-lg bg-secondary/20 border border-secondary/30">
                <p className="text-sm text-muted-foreground">Ganho Potencial:</p>
                <p className="text-xl font-bold text-secondary">
                  € {(parseFloat(betAmount) * getSelectedOdd()).toFixed(2)}
                </p>
              </div>
            )}

            {/* Submit */}
            <Button 
              onClick={handlePlaceBet} 
              disabled={isPlacingBet || !betType || !betAmount}
              className="w-full glow-primary"
            >
              {isPlacingBet ? 'Processando...' : 'Confirmar Aposta'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CBFDBetting;