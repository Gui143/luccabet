import React, { useState, useEffect } from 'react';
import { Trophy, Shield, Plus, Trash2, Users, DollarSign, CheckCircle, Calendar, Settings, Gift, ToggleLeft, ToggleRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
  winner_team: string | null;
  settled_at: string | null;
}

interface CBFDTeam {
  id: string;
  name: string;
}

interface CBFDChampionship {
  id: string;
  name: string;
}

interface PromoCode {
  id: string;
  code: string;
  bonus_amount: number;
  expires_at: string | null;
  max_uses: number | null;
  current_uses: number;
  is_active: boolean;
  created_at: string;
}

const MobileAdminPanel: React.FC = () => {
  const [cbfdGames, setCbfdGames] = useState<CBFDGame[]>([]);
  const [cbfdTeams, setCbfdTeams] = useState<CBFDTeam[]>([]);
  const [cbfdChampionships, setCbfdChampionships] = useState<CBFDChampionship[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  
  // Form states
  const [newTeamName, setNewTeamName] = useState('');
  const [newChampionshipName, setNewChampionshipName] = useState('');
  const [selectedTeamA, setSelectedTeamA] = useState('');
  const [selectedTeamB, setSelectedTeamB] = useState('');
  const [selectedChampionship, setSelectedChampionship] = useState('');
  const [oddA, setOddA] = useState('');
  const [oddDraw, setOddDraw] = useState('');
  const [oddB, setOddB] = useState('');
  const [matchDate, setMatchDate] = useState('');
  const [matchTime, setMatchTime] = useState('');
  
  // Credit user
  const [username, setUsername] = useState('');
  const [creditAmount, setCreditAmount] = useState('');
  const [isCrediting, setIsCrediting] = useState(false);

  // Settlement dialog
  const [showSettleDialog, setShowSettleDialog] = useState(false);
  const [settlingGame, setSettlingGame] = useState<CBFDGame | null>(null);
  const [winnerTeam, setWinnerTeam] = useState('');
  const [scoreA, setScoreA] = useState('');
  const [scoreB, setScoreB] = useState('');
  const [isSettling, setIsSettling] = useState(false);

  const [isAddingTeam, setIsAddingTeam] = useState(false);
  const [isAddingChampionship, setIsAddingChampionship] = useState(false);
  const [isAddingGame, setIsAddingGame] = useState(false);

  // Promo code form states
  const [newPromoCode, setNewPromoCode] = useState('');
  const [promoBonus, setPromoBonus] = useState('');
  const [promoExpires, setPromoExpires] = useState('');
  const [promoMaxUses, setPromoMaxUses] = useState('');
  const [isAddingPromo, setIsAddingPromo] = useState(false);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    await Promise.all([
      loadOnlineUsers(),
      loadCBFDGames(),
      loadCBFDTeams(),
      loadCBFDChampionships(),
      loadPromoCodes()
    ]);
  };

  const loadPromoCodes = async () => {
    const { data } = await supabase
      .from('promo_codes')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setPromoCodes(data as PromoCode[]);
  };

  const loadOnlineUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('username, email, balance, is_online')
      .eq('is_online', true)
      .order('last_seen', { ascending: false });
    if (data) setOnlineUsers(data);
  };

  const loadCBFDGames = async () => {
    const { data } = await supabase
      .from('cbfd_games')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setCbfdGames(data);
  };

  const loadCBFDTeams = async () => {
    const { data } = await supabase
      .from('cbfd_teams')
      .select('*')
      .order('name', { ascending: true });
    if (data) setCbfdTeams(data);
  };

  const loadCBFDChampionships = async () => {
    const { data } = await supabase
      .from('cbfd_championships')
      .select('*')
      .order('name', { ascending: true });
    if (data) setCbfdChampionships(data);
  };

  const handleCreditUser = async () => {
    if (!username.trim() || !creditAmount) {
      toast.error('Digite usuário e valor');
      return;
    }

    const amount = parseFloat(creditAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Digite um valor válido');
      return;
    }

    setIsCrediting(true);
    
    const { data, error } = await supabase.functions.invoke('credit-user', {
      body: { username: username.trim(), amount }
    });

    if (error) {
      toast.error(error.message || 'Falha ao creditar');
    } else if (data?.error) {
      toast.error(data.error);
    } else {
      toast.success(`Creditado € ${amount.toFixed(2)} para ${username}`);
      setUsername('');
      setCreditAmount('');
      loadOnlineUsers();
    }

    setIsCrediting(false);
  };

  const handleAddTeam = async () => {
    if (!newTeamName.trim()) {
      toast.error('Digite o nome do time');
      return;
    }

    setIsAddingTeam(true);
    const { error } = await supabase.from('cbfd_teams').insert({ name: newTeamName.trim() });

    if (error) toast.error('Erro ao adicionar time');
    else {
      toast.success('Time adicionado!');
      setNewTeamName('');
      loadCBFDTeams();
    }
    setIsAddingTeam(false);
  };

  const handleDeleteTeam = async (id: string) => {
    const { error } = await supabase.from('cbfd_teams').delete().eq('id', id);
    if (error) toast.error('Erro ao remover time');
    else {
      toast.success('Time removido');
      loadCBFDTeams();
    }
  };

  const handleAddChampionship = async () => {
    if (!newChampionshipName.trim()) {
      toast.error('Digite o nome do campeonato');
      return;
    }

    setIsAddingChampionship(true);
    const { error } = await supabase.from('cbfd_championships').insert({ name: newChampionshipName.trim() });

    if (error) toast.error('Erro ao adicionar campeonato');
    else {
      toast.success('Campeonato adicionado!');
      setNewChampionshipName('');
      loadCBFDChampionships();
    }
    setIsAddingChampionship(false);
  };

  const handleDeleteChampionship = async (id: string) => {
    const { error } = await supabase.from('cbfd_championships').delete().eq('id', id);
    if (error) toast.error('Erro ao remover campeonato');
    else {
      toast.success('Campeonato removido');
      loadCBFDChampionships();
    }
  };

  const handleAddGame = async () => {
    if (!selectedTeamA || !selectedTeamB || !selectedChampionship) {
      toast.error('Preencha todos os campos');
      return;
    }

    if (!oddA.trim() || !oddDraw.trim() || !oddB.trim()) {
      toast.error('Preencha todas as odds');
      return;
    }

    if (selectedTeamA === selectedTeamB) {
      toast.error('Selecione times diferentes');
      return;
    }

    const oddAVal = parseFloat(oddA);
    const oddDrawVal = parseFloat(oddDraw);
    const oddBVal = parseFloat(oddB);

    if (isNaN(oddAVal) || oddAVal < 1 || isNaN(oddDrawVal) || oddDrawVal < 1 || isNaN(oddBVal) || oddBVal < 1) {
      toast.error('Digite odds válidas (mínimo 1.00)');
      return;
    }

    const teamA = cbfdTeams.find(t => t.id === selectedTeamA)?.name || '';
    const teamB = cbfdTeams.find(t => t.id === selectedTeamB)?.name || '';
    const championship = cbfdChampionships.find(c => c.id === selectedChampionship)?.name || '';

    let matchDateTime = null;
    if (matchDate && matchTime) {
      matchDateTime = new Date(`${matchDate}T${matchTime}`).toISOString();
    } else if (matchDate) {
      matchDateTime = new Date(`${matchDate}T12:00`).toISOString();
    }

    setIsAddingGame(true);
    const { error } = await supabase.from('cbfd_games').insert({
      team_a: teamA,
      team_b: teamB,
      odd_a: oddAVal,
      odd_draw: oddDrawVal,
      odd_b: oddBVal,
      odd: oddAVal, // legacy field
      championship,
      match_date: matchDateTime
    });

    if (error) toast.error('Erro ao adicionar partida');
    else {
      toast.success('Partida adicionada!');
      setSelectedTeamA('');
      setSelectedTeamB('');
      setOddA('');
      setOddDraw('');
      setOddB('');
      setSelectedChampionship('');
      setMatchDate('');
      setMatchTime('');
      loadCBFDGames();
    }
    setIsAddingGame(false);
  };

  const handleAddPromoCode = async () => {
    if (!newPromoCode.trim() || !promoBonus) {
      toast.error('Digite código e valor do bônus');
      return;
    }

    const bonus = parseFloat(promoBonus);
    if (isNaN(bonus) || bonus <= 0) {
      toast.error('Digite um valor de bônus válido');
      return;
    }

    setIsAddingPromo(true);
    const { error } = await supabase.from('promo_codes').insert({
      code: newPromoCode.trim().toUpperCase(),
      bonus_amount: bonus,
      expires_at: promoExpires ? new Date(promoExpires).toISOString() : null,
      max_uses: promoMaxUses ? parseInt(promoMaxUses) : null
    });

    if (error) {
      if (error.code === '23505') {
        toast.error('Este código já existe');
      } else {
        toast.error('Erro ao criar código');
      }
    } else {
      toast.success('Código promocional criado!');
      setNewPromoCode('');
      setPromoBonus('');
      setPromoExpires('');
      setPromoMaxUses('');
      loadPromoCodes();
    }
    setIsAddingPromo(false);
  };

  const handleTogglePromoCode = async (id: string, currentState: boolean) => {
    const { error } = await supabase
      .from('promo_codes')
      .update({ is_active: !currentState })
      .eq('id', id);

    if (error) toast.error('Erro ao atualizar código');
    else {
      toast.success(currentState ? 'Código desativado' : 'Código ativado');
      loadPromoCodes();
    }
  };

  const handleDeletePromoCode = async (id: string) => {
    const { error } = await supabase.from('promo_codes').delete().eq('id', id);
    if (error) toast.error('Erro ao remover código');
    else {
      toast.success('Código removido');
      loadPromoCodes();
    }
  };

  const handleDeleteGame = async (id: string) => {
    const { error } = await supabase.from('cbfd_games').delete().eq('id', id);
    if (error) toast.error('Erro ao remover partida');
    else {
      toast.success('Partida removida');
      loadCBFDGames();
    }
  };

  const openSettleDialog = (game: CBFDGame) => {
    setSettlingGame(game);
    setWinnerTeam('');
    setScoreA('');
    setScoreB('');
    setShowSettleDialog(true);
  };

  const handleSettleMatch = async () => {
    if (!settlingGame || !winnerTeam) {
      toast.error('Selecione o vencedor');
      return;
    }

    setIsSettling(true);

    const { data, error } = await supabase.functions.invoke('settle-match', {
      body: {
        game_id: settlingGame.id,
        winner_team: winnerTeam,
        score_a: scoreA ? parseInt(scoreA) : null,
        score_b: scoreB ? parseInt(scoreB) : null
      }
    });

    if (error) {
      toast.error(error.message || 'Erro ao encerrar partida');
    } else if (data?.error) {
      toast.error(data.error);
    } else {
      toast.success(`Partida encerrada! ${data.winners} apostas vencedoras, ${data.losers} perdedoras.`);
      setShowSettleDialog(false);
      loadCBFDGames();
    }

    setIsSettling(false);
  };

  return (
    <div className="space-y-4 pb-20">
      <div className="flex items-center gap-2 mb-4">
        <Settings className="h-6 w-6 text-primary" />
        <h2 className="text-xl font-bold text-gradient">PAINEL ADMIN CBFD</h2>
      </div>

      <Tabs defaultValue="partidas" className="w-full">
        <TabsList className="w-full grid grid-cols-5 h-auto gap-1 bg-muted/50 p-1">
          <TabsTrigger value="partidas" className="text-xs py-2 px-1">
            Partidas
          </TabsTrigger>
          <TabsTrigger value="times" className="text-xs py-2 px-1">
            Times
          </TabsTrigger>
          <TabsTrigger value="campeonatos" className="text-xs py-2 px-1">
            Ligas
          </TabsTrigger>
          <TabsTrigger value="usuarios" className="text-xs py-2 px-1">
            Usuários
          </TabsTrigger>
          <TabsTrigger value="codigos" className="text-xs py-2 px-1">
            Códigos
          </TabsTrigger>
        </TabsList>

        {/* PARTIDAS */}
        <TabsContent value="partidas" className="mt-4 space-y-4">
          <Card className="border-secondary/50">
            <CardHeader className="p-3 pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Trophy className="h-4 w-4" />
                Nova Partida
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Time A</Label>
                  <Select value={selectedTeamA} onValueChange={setSelectedTeamA}>
                    <SelectTrigger className="h-9 mt-1">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {cbfdTeams.map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Time B</Label>
                  <Select value={selectedTeamB} onValueChange={setSelectedTeamB}>
                    <SelectTrigger className="h-9 mt-1">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {cbfdTeams.map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-xs">Campeonato</Label>
                <Select value={selectedChampionship} onValueChange={setSelectedChampionship}>
                  <SelectTrigger className="h-9 mt-1">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {cbfdChampionships.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 3 Odds - Obrigatórias */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-xs">Vitória Casa</Label>
                  <Input
                    type="number"
                    value={oddA}
                    onChange={(e) => setOddA(e.target.value)}
                    placeholder="Ex: 1.85"
                    step="0.01"
                    min="1"
                    required
                    className="h-9 mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Empate</Label>
                  <Input
                    type="number"
                    value={oddDraw}
                    onChange={(e) => setOddDraw(e.target.value)}
                    placeholder="Ex: 3.20"
                    step="0.01"
                    min="1"
                    required
                    className="h-9 mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Vitória Visitante</Label>
                  <Input
                    type="number"
                    value={oddB}
                    onChange={(e) => setOddB(e.target.value)}
                    placeholder="Ex: 2.40"
                    step="0.01"
                    min="1"
                    required
                    className="h-9 mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Data</Label>
                  <Input
                    type="date"
                    value={matchDate}
                    onChange={(e) => setMatchDate(e.target.value)}
                    className="h-9 mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Horário</Label>
                  <Input
                    type="time"
                    value={matchTime}
                    onChange={(e) => setMatchTime(e.target.value)}
                    className="h-9 mt-1"
                  />
                </div>
              </div>

              <Button onClick={handleAddGame} disabled={isAddingGame} className="w-full h-9 glow-primary">
                <Plus className="h-4 w-4 mr-1" />
                Adicionar Partida
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-2">
            <h4 className="font-medium text-sm">Partidas ({cbfdGames.length})</h4>
            {cbfdGames.map((game) => (
              <div key={game.id} className="p-3 bg-muted/50 rounded-lg space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm">{game.team_a} vs {game.team_b}</p>
                    <p className="text-xs text-muted-foreground">
                      {game.championship} • {Number(game.odd).toFixed(2)}x
                    </p>
                    {game.match_date && (
                      <p className="text-xs text-muted-foreground">
                        {new Date(game.match_date).toLocaleDateString('pt-BR')}
                      </p>
                    )}
                  </div>
                  {game.settled_at ? (
                    <span className="text-xs px-2 py-1 bg-muted rounded text-muted-foreground">
                      Encerrada
                    </span>
                  ) : (
                    <div className="flex gap-1 shrink-0">
                      <Button 
                        size="icon" 
                        variant="outline" 
                        onClick={() => openSettleDialog(game)} 
                        className="h-8 w-8"
                      >
                        <CheckCircle className="h-4 w-4 text-success" />
                      </Button>
                      <Button 
                        size="icon" 
                        variant="destructive" 
                        onClick={() => handleDeleteGame(game.id)} 
                        className="h-8 w-8"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* TIMES */}
        <TabsContent value="times" className="mt-4 space-y-4">
          <div className="flex gap-2">
            <Input
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              placeholder="Nome do time"
              className="flex-1 h-10"
            />
            <Button onClick={handleAddTeam} disabled={isAddingTeam} className="shrink-0 h-10 glow-primary">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-2">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Times ({cbfdTeams.length})
            </h4>
            {cbfdTeams.map((team) => (
              <div key={team.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span className="text-sm">{team.name}</span>
                <Button variant="destructive" size="icon" onClick={() => handleDeleteTeam(team.id)} className="h-8 w-8">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* CAMPEONATOS */}
        <TabsContent value="campeonatos" className="mt-4 space-y-4">
          <div className="flex gap-2">
            <Input
              value={newChampionshipName}
              onChange={(e) => setNewChampionshipName(e.target.value)}
              placeholder="Nome do campeonato"
              className="flex-1 h-10"
            />
            <Button onClick={handleAddChampionship} disabled={isAddingChampionship} className="shrink-0 h-10 glow-primary">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-2">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Campeonatos ({cbfdChampionships.length})
            </h4>
            {cbfdChampionships.map((champ) => (
              <div key={champ.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span className="text-sm">{champ.name}</span>
                <Button variant="destructive" size="icon" onClick={() => handleDeleteChampionship(champ.id)} className="h-8 w-8">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* CÓDIGOS PROMOCIONAIS */}
        <TabsContent value="codigos" className="mt-4 space-y-4">
          <Card className="border-secondary/50">
            <CardHeader className="p-3 pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Gift className="h-4 w-4" />
                Novo Código Promocional
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Código</Label>
                  <Input
                    value={newPromoCode}
                    onChange={(e) => setNewPromoCode(e.target.value.toUpperCase())}
                    placeholder="EX: BONUS50"
                    className="h-9 mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Bônus (€)</Label>
                  <Input
                    type="number"
                    value={promoBonus}
                    onChange={(e) => setPromoBonus(e.target.value)}
                    placeholder="50.00"
                    step="0.01"
                    min="0"
                    className="h-9 mt-1"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Expira em</Label>
                  <Input
                    type="date"
                    value={promoExpires}
                    onChange={(e) => setPromoExpires(e.target.value)}
                    className="h-9 mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Limite de Usos</Label>
                  <Input
                    type="number"
                    value={promoMaxUses}
                    onChange={(e) => setPromoMaxUses(e.target.value)}
                    placeholder="Ilimitado"
                    min="1"
                    className="h-9 mt-1"
                  />
                </div>
              </div>
              <Button onClick={handleAddPromoCode} disabled={isAddingPromo} className="w-full h-9 glow-primary">
                <Plus className="h-4 w-4 mr-1" />
                Criar Código
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-2">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <Gift className="h-4 w-4" />
              Códigos ({promoCodes.length})
            </h4>
            {promoCodes.map((promo) => (
              <div key={promo.id} className="p-3 bg-muted/50 rounded-lg space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-mono font-bold text-sm">{promo.code}</p>
                    <p className="text-xs text-muted-foreground">
                      Bônus: € {Number(promo.bonus_amount).toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Usos: {promo.current_uses}{promo.max_uses ? `/${promo.max_uses}` : ' (ilimitado)'}
                    </p>
                    {promo.expires_at && (
                      <p className="text-xs text-muted-foreground">
                        Expira: {new Date(promo.expires_at).toLocaleDateString('pt-BR')}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => handleTogglePromoCode(promo.id, promo.is_active)}
                      className="h-8 w-8"
                    >
                      {promo.is_active ? (
                        <ToggleRight className="h-4 w-4 text-success" />
                      ) : (
                        <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                    <Button
                      size="icon"
                      variant="destructive"
                      onClick={() => handleDeletePromoCode(promo.id)}
                      className="h-8 w-8"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {!promo.is_active && (
                  <span className="text-xs px-2 py-1 bg-destructive/20 text-destructive rounded">
                    Desativado
                  </span>
                )}
              </div>
            ))}
          </div>
        </TabsContent>

        {/* USUÁRIOS */}
        <TabsContent value="usuarios" className="mt-4 space-y-4">
          <Card className="border-border">
            <CardHeader className="p-3 pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Creditar Saldo
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 space-y-3">
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Nome de usuário"
                className="h-10"
              />
              <Input
                type="number"
                value={creditAmount}
                onChange={(e) => setCreditAmount(e.target.value)}
                placeholder="Valor (€)"
                step="0.01"
                className="h-10"
              />
              <Button onClick={handleCreditUser} disabled={isCrediting} className="w-full h-10 glow-primary">
                {isCrediting ? 'Processando...' : 'Creditar'}
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-2">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <Users className="h-4 w-4" />
              Online ({onlineUsers.length})
            </h4>
            {onlineUsers.map((user, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{user.username}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
                <p className="text-sm font-bold text-primary shrink-0">€ {parseFloat(user.balance).toFixed(2)}</p>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Settlement Dialog */}
      <Dialog open={showSettleDialog} onOpenChange={setShowSettleDialog}>
        <DialogContent className="max-w-md mx-4">
          <DialogHeader>
            <DialogTitle className="text-lg">Encerrar Partida</DialogTitle>
            <DialogDescription>
              {settlingGame?.team_a} vs {settlingGame?.team_b}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Vencedor</Label>
              <Select value={winnerTeam} onValueChange={setWinnerTeam}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o vencedor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={settlingGame?.team_a || ''}>{settlingGame?.team_a}</SelectItem>
                  <SelectItem value={settlingGame?.team_b || ''}>{settlingGame?.team_b}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Placar {settlingGame?.team_a}</Label>
                <Input
                  type="number"
                  value={scoreA}
                  onChange={(e) => setScoreA(e.target.value)}
                  placeholder="0"
                  min="0"
                  className="h-10 mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Placar {settlingGame?.team_b}</Label>
                <Input
                  type="number"
                  value={scoreB}
                  onChange={(e) => setScoreB(e.target.value)}
                  placeholder="0"
                  min="0"
                  className="h-10 mt-1"
                />
              </div>
            </div>

            <Button 
              onClick={handleSettleMatch} 
              disabled={isSettling || !winnerTeam}
              className="w-full glow-primary"
            >
              {isSettling ? 'Processando...' : 'Confirmar Resultado'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MobileAdminPanel;
