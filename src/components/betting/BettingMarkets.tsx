import React, { useState, useEffect } from 'react';
import { Trophy, Calendar, TrendingUp, ChevronDown, ChevronUp, Target, CornerDownRight, CreditCard, Users2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
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

interface GamePlayer {
  id: string;
  player_id: string;
  team_side: string;
  player: { id: string; name: string; photo_url: string | null };
}

interface BetSelection {
  market_type: string;
  label: string;
  odd: number;
  market_detail: Record<string, any>;
  selected_team: string;
}

const OVER_UNDER_LINES = [0.5, 1.5, 2.5, 3.5, 4.5];
const CORNERS_LINES = [5.5, 7.5, 9.5, 11.5];
const CARDS_LINES = [2.5, 3.5, 4.5, 5.5];

// Generate deterministic odds from game odds
const generateMarketOdds = (game: CBFDGame, seed: number) => {
  const base = (Number(game.odd_a) + Number(game.odd_b)) / 2;
  const hash = (seed * 2654435761) % 100;
  return Math.max(1.05, base * 0.5 + (hash / 100) * 1.5);
};

const BettingMarkets: React.FC = () => {
  const { user, updateBalance } = useAuth();
  const [games, setGames] = useState<CBFDGame[]>([]);
  const [expandedGame, setExpandedGame] = useState<string | null>(null);
  const [expandedMarket, setExpandedMarket] = useState<string | null>(null);
  const [gamePlayers, setGamePlayers] = useState<Record<string, GamePlayer[]>>({});
  
  // Bet slip
  const [showBetSlip, setShowBetSlip] = useState(false);
  const [selectedBet, setSelectedBet] = useState<{ game: CBFDGame; selection: BetSelection } | null>(null);
  const [betAmount, setBetAmount] = useState('');
  const [isPlacingBet, setIsPlacingBet] = useState(false);

  useEffect(() => {
    loadGames();
    const channel = supabase
      .channel('cbfd-games-markets')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cbfd_games' }, () => loadGames())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const loadGames = async () => {
    const { data } = await supabase
      .from('cbfd_games')
      .select('*')
      .eq('is_active', true)
      .order('match_date', { ascending: true });
    if (data) setGames(data as CBFDGame[]);
  };

  const loadGamePlayers = async (gameId: string) => {
    if (gamePlayers[gameId]) return;
    const { data } = await supabase
      .from('cbfd_game_players')
      .select('id, player_id, team_side, player:cbfd_players(id, name, photo_url)')
      .eq('game_id', gameId);
    if (data) {
      setGamePlayers(prev => ({
        ...prev,
        [gameId]: data.map((d: any) => ({
          id: d.id,
          player_id: d.player_id,
          team_side: d.team_side,
          player: Array.isArray(d.player) ? d.player[0] : d.player
        }))
      }));
    }
  };

  const toggleGame = (gameId: string) => {
    if (expandedGame === gameId) {
      setExpandedGame(null);
    } else {
      setExpandedGame(gameId);
      loadGamePlayers(gameId);
    }
  };

  const selectOdd = (game: CBFDGame, selection: BetSelection) => {
    setSelectedBet({ game, selection });
    setBetAmount('');
    setShowBetSlip(true);
  };

  const handlePlaceBet = async () => {
    if (!user || !selectedBet) return;
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
      const potentialWin = amount * selectedBet.selection.odd;

      const { error: balanceError } = await supabase
        .from('profiles')
        .update({ balance: user.balance - amount })
        .eq('id', user.id);
      if (balanceError) throw new Error('Erro ao debitar saldo');

      const { error: betError } = await supabase
        .from('cbfd_bets')
        .insert({
          user_id: user.id,
          game_id: selectedBet.game.id,
          amount,
          odd: selectedBet.selection.odd,
          selected_team: selectedBet.selection.selected_team,
          bet_type: selectedBet.selection.label,
          potential_win: potentialWin,
          status: 'open',
          market_type: selectedBet.selection.market_type,
          market_detail: selectedBet.selection.market_detail
        });

      if (betError) {
        await supabase.from('profiles').update({ balance: user.balance }).eq('id', user.id);
        throw new Error('Erro ao registrar aposta');
      }

      await updateBalance(-amount);
      toast.success(`Aposta de € ${amount.toFixed(2)} registrada!`);
      setShowBetSlip(false);
      setSelectedBet(null);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsPlacingBet(false);
    }
  };

  const OddButton: React.FC<{ label: string; odd: number; onClick: () => void }> = ({ label, odd, onClick }) => (
    <button
      onClick={onClick}
      className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30 hover:bg-primary/10 hover:border-primary/50 transition-all cursor-pointer group"
    >
      <span className="text-sm text-foreground">{label}</span>
      <span className="text-sm font-bold text-primary group-hover:text-primary">{odd.toFixed(2)}</span>
    </button>
  );

  const MarketSection: React.FC<{ title: string; icon: React.ReactNode; marketKey: string; children: React.ReactNode }> = 
    ({ title, icon, marketKey, children }) => (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setExpandedMarket(expandedMarket === marketKey ? null : marketKey)}
        className="w-full flex items-center justify-between p-3 bg-muted/30 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-medium">{title}</span>
        </div>
        {expandedMarket === marketKey ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {expandedMarket === marketKey && (
        <div className="p-3 space-y-2 border-t border-border">
          {children}
        </div>
      )}
    </div>
  );

  if (games.length === 0) return null;

  return (
    <div className="space-y-4">
      <h3 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
        <Trophy className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
        APOSTE EM TIMES VIRTUAIS
      </h3>

      <div className="grid gap-4">
        {games.map((game) => {
          const isExpanded = expandedGame === game.id;
          const players = gamePlayers[game.id] || [];
          const playersA = players.filter(p => p.team_side === 'a');
          const playersB = players.filter(p => p.team_side === 'b');

          return (
            <Card key={game.id} className="overflow-hidden border-border bg-card">
              <CardContent className="p-0">
                {/* Match Header */}
                <div className="p-4 space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="w-2 h-2 bg-success rounded-full animate-pulse shrink-0"></span>
                    <span className="text-xs text-success font-medium">AO VIVO</span>
                    <span className="text-xs text-muted-foreground">• {game.championship}</span>
                    {game.match_date && (
                      <span className="text-xs text-muted-foreground ml-auto flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(game.match_date).toLocaleDateString('pt-BR')} {new Date(game.match_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>

                  <div className="font-bold text-lg">
                    {game.team_a} <span className="text-muted-foreground font-normal">vs</span> {game.team_b}
                  </div>

                  {/* 1X2 Market - Always visible */}
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => selectOdd(game, {
                        market_type: 'match_result', label: game.team_a, odd: Number(game.odd_a),
                        market_detail: { selection: 'team_a' }, selected_team: game.team_a
                      })}
                      className="text-center p-3 rounded-lg border border-border bg-muted/30 hover:bg-primary/10 hover:border-primary/50 transition-all cursor-pointer group"
                    >
                      <div className="text-xs text-muted-foreground truncate mb-1">{game.team_a}</div>
                      <div className="text-xl font-bold text-primary">{Number(game.odd_a).toFixed(2)}</div>
                    </button>
                    <button
                      onClick={() => selectOdd(game, {
                        market_type: 'match_result', label: 'Empate', odd: Number(game.odd_draw),
                        market_detail: { selection: 'draw' }, selected_team: 'Empate'
                      })}
                      className="text-center p-3 rounded-lg border border-border bg-muted/30 hover:bg-primary/10 hover:border-primary/50 transition-all cursor-pointer group"
                    >
                      <div className="text-xs text-muted-foreground mb-1">Empate</div>
                      <div className="text-xl font-bold text-foreground">{Number(game.odd_draw).toFixed(2)}</div>
                    </button>
                    <button
                      onClick={() => selectOdd(game, {
                        market_type: 'match_result', label: game.team_b, odd: Number(game.odd_b),
                        market_detail: { selection: 'team_b' }, selected_team: game.team_b
                      })}
                      className="text-center p-3 rounded-lg border border-border bg-muted/30 hover:bg-primary/10 hover:border-primary/50 transition-all cursor-pointer group"
                    >
                      <div className="text-xs text-muted-foreground truncate mb-1">{game.team_b}</div>
                      <div className="text-xl font-bold text-primary">{Number(game.odd_b).toFixed(2)}</div>
                    </button>
                  </div>

                  {/* Expand button */}
                  <button
                    onClick={() => toggleGame(game.id)}
                    className="w-full flex items-center justify-center gap-2 text-sm text-primary hover:text-primary/80 py-2 transition-colors"
                  >
                    {isExpanded ? (
                      <><ChevronUp className="h-4 w-4" /> Menos mercados</>
                    ) : (
                      <><ChevronDown className="h-4 w-4" /> +6 mercados disponíveis</>
                    )}
                  </button>
                </div>

                {/* Expanded Markets */}
                {isExpanded && (
                  <div className="px-4 pb-4 space-y-2">
                    {/* Over/Under Goals */}
                    <MarketSection title="Gols - Over/Under" icon={<Target className="h-4 w-4 text-primary" />} marketKey={`ou-${game.id}`}>
                      {OVER_UNDER_LINES.map((line, i) => {
                        const overOdd = generateMarketOdds(game, i * 10 + 1);
                        const underOdd = generateMarketOdds(game, i * 10 + 2);
                        return (
                          <div key={line} className="grid grid-cols-2 gap-2">
                            <OddButton
                              label={`Over ${line}`}
                              odd={parseFloat(overOdd.toFixed(2))}
                              onClick={() => selectOdd(game, {
                                market_type: 'over_under', label: `Over ${line} Gols`, odd: parseFloat(overOdd.toFixed(2)),
                                market_detail: { line, selection: 'over' }, selected_team: `Over ${line}`
                              })}
                            />
                            <OddButton
                              label={`Under ${line}`}
                              odd={parseFloat(underOdd.toFixed(2))}
                              onClick={() => selectOdd(game, {
                                market_type: 'over_under', label: `Under ${line} Gols`, odd: parseFloat(underOdd.toFixed(2)),
                                market_detail: { line, selection: 'under' }, selected_team: `Under ${line}`
                              })}
                            />
                          </div>
                        );
                      })}
                    </MarketSection>

                    {/* Both Teams to Score */}
                    <MarketSection title="Ambas Marcam" icon={<TrendingUp className="h-4 w-4 text-primary" />} marketKey={`btts-${game.id}`}>
                      <div className="grid grid-cols-2 gap-2">
                        <OddButton
                          label="Sim"
                          odd={parseFloat(generateMarketOdds(game, 50).toFixed(2))}
                          onClick={() => selectOdd(game, {
                            market_type: 'btts', label: 'Ambas Marcam - Sim', odd: parseFloat(generateMarketOdds(game, 50).toFixed(2)),
                            market_detail: { selection: 'yes' }, selected_team: 'BTTS Sim'
                          })}
                        />
                        <OddButton
                          label="Não"
                          odd={parseFloat(generateMarketOdds(game, 51).toFixed(2))}
                          onClick={() => selectOdd(game, {
                            market_type: 'btts', label: 'Ambas Marcam - Não', odd: parseFloat(generateMarketOdds(game, 51).toFixed(2)),
                            market_detail: { selection: 'no' }, selected_team: 'BTTS Não'
                          })}
                        />
                      </div>
                    </MarketSection>

                    {/* Corners */}
                    <MarketSection title="Escanteios" icon={<CornerDownRight className="h-4 w-4 text-primary" />} marketKey={`corners-${game.id}`}>
                      {CORNERS_LINES.map((line, i) => {
                        const overOdd = generateMarketOdds(game, i * 10 + 30);
                        const underOdd = generateMarketOdds(game, i * 10 + 31);
                        return (
                          <div key={line} className="grid grid-cols-2 gap-2">
                            <OddButton
                              label={`Over ${line}`}
                              odd={parseFloat(overOdd.toFixed(2))}
                              onClick={() => selectOdd(game, {
                                market_type: 'total_corners', label: `Over ${line} Escanteios`, odd: parseFloat(overOdd.toFixed(2)),
                                market_detail: { line, selection: 'over' }, selected_team: `Corners Over ${line}`
                              })}
                            />
                            <OddButton
                              label={`Under ${line}`}
                              odd={parseFloat(underOdd.toFixed(2))}
                              onClick={() => selectOdd(game, {
                                market_type: 'total_corners', label: `Under ${line} Escanteios`, odd: parseFloat(underOdd.toFixed(2)),
                                market_detail: { line, selection: 'under' }, selected_team: `Corners Under ${line}`
                              })}
                            />
                          </div>
                        );
                      })}
                    </MarketSection>

                    {/* Cards */}
                    <MarketSection title="Cartões" icon={<CreditCard className="h-4 w-4 text-primary" />} marketKey={`cards-${game.id}`}>
                      {CARDS_LINES.map((line, i) => {
                        const overOdd = generateMarketOdds(game, i * 10 + 60);
                        const underOdd = generateMarketOdds(game, i * 10 + 61);
                        return (
                          <div key={line} className="grid grid-cols-2 gap-2">
                            <OddButton
                              label={`Over ${line}`}
                              odd={parseFloat(overOdd.toFixed(2))}
                              onClick={() => selectOdd(game, {
                                market_type: 'total_cards', label: `Over ${line} Cartões`, odd: parseFloat(overOdd.toFixed(2)),
                                market_detail: { line, selection: 'over' }, selected_team: `Cards Over ${line}`
                              })}
                            />
                            <OddButton
                              label={`Under ${line}`}
                              odd={parseFloat(underOdd.toFixed(2))}
                              onClick={() => selectOdd(game, {
                                market_type: 'total_cards', label: `Under ${line} Cartões`, odd: parseFloat(underOdd.toFixed(2)),
                                market_detail: { line, selection: 'under' }, selected_team: `Cards Under ${line}`
                              })}
                            />
                          </div>
                        );
                      })}
                    </MarketSection>

                    {/* Scorers */}
                    {(playersA.length > 0 || playersB.length > 0) && (
                      <MarketSection title="Marcador de Gol" icon={<Users2 className="h-4 w-4 text-primary" />} marketKey={`scorers-${game.id}`}>
                        {playersA.length > 0 && (
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground font-medium">{game.team_a}</p>
                            {playersA.map((gp, i) => {
                              const odd = parseFloat(generateMarketOdds(game, i * 3 + 100).toFixed(2));
                              return (
                                <OddButton
                                  key={gp.id}
                                  label={gp.player.name}
                                  odd={odd}
                                  onClick={() => selectOdd(game, {
                                    market_type: 'scorer', label: `${gp.player.name} marca`, odd,
                                    market_detail: { player_id: gp.player_id, player_name: gp.player.name },
                                    selected_team: gp.player.name
                                  })}
                                />
                              );
                            })}
                          </div>
                        )}
                        {playersB.length > 0 && (
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground font-medium">{game.team_b}</p>
                            {playersB.map((gp, i) => {
                              const odd = parseFloat(generateMarketOdds(game, i * 3 + 150).toFixed(2));
                              return (
                                <OddButton
                                  key={gp.id}
                                  label={gp.player.name}
                                  odd={odd}
                                  onClick={() => selectOdd(game, {
                                    market_type: 'scorer', label: `${gp.player.name} marca`, odd,
                                    market_detail: { player_id: gp.player_id, player_name: gp.player.name },
                                    selected_team: gp.player.name
                                  })}
                                />
                              );
                            })}
                          </div>
                        )}
                        {playersA.length === 0 && playersB.length === 0 && (
                          <p className="text-xs text-muted-foreground text-center py-2">Nenhum jogador cadastrado para esta partida</p>
                        )}
                      </MarketSection>
                    )}

                    {/* Exact Score */}
                    <MarketSection title="Resultado Exato" icon={<Trophy className="h-4 w-4 text-primary" />} marketKey={`exact-${game.id}`}>
                      <div className="grid grid-cols-3 gap-2">
                        {[[1,0],[2,0],[2,1],[0,0],[1,1],[2,2],[0,1],[0,2],[1,2]].map(([a, b], i) => {
                          const odd = parseFloat((generateMarketOdds(game, i * 7 + 200) * 2.5).toFixed(2));
                          return (
                            <OddButton
                              key={`${a}-${b}`}
                              label={`${a}-${b}`}
                              odd={odd}
                              onClick={() => selectOdd(game, {
                                market_type: 'exact_score', label: `Placar ${a}-${b}`, odd,
                                market_detail: { score_a: a, score_b: b },
                                selected_team: `${a}-${b}`
                              })}
                            />
                          );
                        })}
                      </div>
                    </MarketSection>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Floating Bet Slip */}
      <Dialog open={showBetSlip} onOpenChange={setShowBetSlip}>
        <DialogContent className="max-w-md mx-4">
          <DialogHeader>
            <DialogTitle>Cupom de Aposta</DialogTitle>
            <DialogDescription>
              {selectedBet?.game.team_a} vs {selectedBet?.game.team_b}
            </DialogDescription>
          </DialogHeader>

          {selectedBet && (
            <div className="space-y-4 pt-2">
              <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium">{selectedBet.selection.label}</p>
                    <p className="text-xs text-muted-foreground">{selectedBet.selection.market_type === 'match_result' ? 'Resultado Final' : selectedBet.selection.market_type.replace('_', ' ').toUpperCase()}</p>
                  </div>
                  <span className="text-2xl font-bold text-primary">{selectedBet.selection.odd.toFixed(2)}</span>
                </div>
              </div>

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
                    Saldo: {formatEURShort(user.balance)}
                  </p>
                )}
              </div>

              {betAmount && parseFloat(betAmount) > 0 && (
                <div className="p-3 rounded-lg bg-success/10 border border-success/20">
                  <p className="text-xs text-muted-foreground">Retorno Potencial</p>
                  <p className="text-xl font-bold text-success">
                    € {(parseFloat(betAmount) * selectedBet.selection.odd).toFixed(2)}
                  </p>
                </div>
              )}

              <Button
                onClick={handlePlaceBet}
                disabled={isPlacingBet || !betAmount || parseFloat(betAmount) <= 0}
                className="w-full glow-primary"
              >
                {isPlacingBet ? 'Processando...' : 'Confirmar Aposta'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BettingMarkets;
