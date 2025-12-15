import React, { useState, useEffect } from 'react';
import { Trophy, Calendar, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  championship: string;
  is_active: boolean;
  match_date: string | null;
}

const CBFDBetting: React.FC = () => {
  const { user, updateBalance } = useAuth();
  const [games, setGames] = useState<CBFDGame[]>([]);
  const [selectedGame, setSelectedGame] = useState<CBFDGame | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [betAmount, setBetAmount] = useState<string>('');
  const [isPlacingBet, setIsPlacingBet] = useState(false);
  const [showBetDialog, setShowBetDialog] = useState(false);

  useEffect(() => {
    loadGames();

    // Listen for realtime updates
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
      setGames(data);
    }
  };

  const openBetDialog = (game: CBFDGame) => {
    setSelectedGame(game);
    setSelectedTeam('');
    setBetAmount('');
    setShowBetDialog(true);
  };

  const handlePlaceBet = async () => {
    if (!user || !selectedGame || !selectedTeam || !betAmount) {
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
      const potentialWin = amount * selectedGame.odd;

      // Deduct balance first
      const { error: balanceError } = await supabase
        .from('profiles')
        .update({ balance: user.balance - amount })
        .eq('id', user.id);

      if (balanceError) {
        throw new Error('Erro ao debitar saldo');
      }

      // Create bet record
      const { error: betError } = await supabase
        .from('cbfd_bets')
        .insert({
          user_id: user.id,
          game_id: selectedGame.id,
          amount,
          odd: selectedGame.odd,
          selected_team: selectedTeam,
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

      toast.success(`Aposta de € ${amount.toFixed(2)} em ${selectedTeam} registrada!`);
      setShowBetDialog(false);
      setSelectedGame(null);
      setSelectedTeam('');
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
        APOSTAS ESPORTIVAS CBFD
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

                {/* Odd and Bet Button */}
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <div className="text-center">
                    <div className="text-xl sm:text-2xl font-bold text-secondary">{Number(game.odd).toFixed(2)}x</div>
                    <div className="text-xs text-muted-foreground">Odd</div>
                  </div>
                  <Button 
                    onClick={() => openBetDialog(game)} 
                    className="glow-primary h-10 sm:h-11 text-sm sm:text-base px-6"
                    disabled={!user}
                  >
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Apostar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Bet Dialog */}
      <Dialog open={showBetDialog} onOpenChange={setShowBetDialog}>
        <DialogContent className="max-w-md mx-4">
          <DialogHeader>
            <DialogTitle className="text-lg">Fazer Aposta CBFD</DialogTitle>
            <DialogDescription>
              {selectedGame?.team_a} vs {selectedGame?.team_b}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            {/* Team Selection */}
            <div className="space-y-2">
              <Label>Selecione o Time Vencedor</Label>
              <RadioGroup value={selectedTeam} onValueChange={setSelectedTeam}>
                <div className="flex items-center space-x-2 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value={selectedGame?.team_a || ''} id="team_a" />
                  <Label htmlFor="team_a" className="cursor-pointer flex-1">{selectedGame?.team_a}</Label>
                </div>
                <div className="flex items-center space-x-2 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value={selectedGame?.team_b || ''} id="team_b" />
                  <Label htmlFor="team_b" className="cursor-pointer flex-1">{selectedGame?.team_b}</Label>
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
            {selectedTeam && betAmount && parseFloat(betAmount) > 0 && selectedGame && (
              <div className="p-3 rounded-lg bg-secondary/20 border border-secondary/30">
                <p className="text-sm text-muted-foreground">Ganho Potencial:</p>
                <p className="text-xl font-bold text-secondary">
                  € {(parseFloat(betAmount) * selectedGame.odd).toFixed(2)}
                </p>
              </div>
            )}

            {/* Submit */}
            <Button 
              onClick={handlePlaceBet} 
              disabled={isPlacingBet || !selectedTeam || !betAmount}
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
