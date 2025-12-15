import React, { useState, useEffect } from 'react';
import { X, TrendingUp, Users, DollarSign, Activity, Plus, Trash2, Edit, Trophy, Shield, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CEOPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CBFDGame {
  id: string;
  team_a: string;
  team_b: string;
  odd: number;
  championship: string;
  is_active: boolean;
  match_date: string | null;
}

interface CBFDTeam {
  id: string;
  name: string;
}

interface CBFDChampionship {
  id: string;
  name: string;
}

const CEOPanel: React.FC<CEOPanelProps> = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [username, setUsername] = useState('');
  const [creditAmount, setCreditAmount] = useState('');
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const [isCrediting, setIsCrediting] = useState(false);
  
  // CBFD state
  const [cbfdGames, setCbfdGames] = useState<CBFDGame[]>([]);
  const [cbfdTeams, setCbfdTeams] = useState<CBFDTeam[]>([]);
  const [cbfdChampionships, setCbfdChampionships] = useState<CBFDChampionship[]>([]);
  
  // Form states
  const [newTeamName, setNewTeamName] = useState('');
  const [newChampionshipName, setNewChampionshipName] = useState('');
  const [selectedTeamA, setSelectedTeamA] = useState('');
  const [selectedTeamB, setSelectedTeamB] = useState('');
  const [selectedChampionship, setSelectedChampionship] = useState('');
  const [newOdd, setNewOdd] = useState('');
  const [matchDate, setMatchDate] = useState('');
  const [matchTime, setMatchTime] = useState('');
  
  const [isAddingTeam, setIsAddingTeam] = useState(false);
  const [isAddingChampionship, setIsAddingChampionship] = useState(false);
  const [isAddingGame, setIsAddingGame] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      setProgress(0);
      
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setLoading(false);
            loadAllData();
            return 100;
          }
          return prev + 4;
        });
      }, 40);

      return () => clearInterval(interval);
    }
  }, [isOpen]);

  const loadAllData = async () => {
    await Promise.all([
      loadOnlineUsers(),
      loadCBFDGames(),
      loadCBFDTeams(),
      loadCBFDChampionships()
    ]);
  };

  const loadOnlineUsers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('username, email, balance, is_online, last_seen')
      .eq('is_online', true)
      .order('last_seen', { ascending: false });

    if (!error && data) {
      setOnlineUsers(data);
    }
  };

  const loadCBFDGames = async () => {
    const { data, error } = await supabase
      .from('cbfd_games')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setCbfdGames(data);
    }
  };

  const loadCBFDTeams = async () => {
    const { data, error } = await supabase
      .from('cbfd_teams')
      .select('*')
      .order('name', { ascending: true });

    if (!error && data) {
      setCbfdTeams(data);
    }
  };

  const loadCBFDChampionships = async () => {
    const { data, error } = await supabase
      .from('cbfd_championships')
      .select('*')
      .order('name', { ascending: true });

    if (!error && data) {
      setCbfdChampionships(data);
    }
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
      toast.error(error.message || 'Falha ao creditar usuário');
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

  // CBFD Teams handlers
  const handleAddTeam = async () => {
    if (!newTeamName.trim()) {
      toast.error('Digite o nome do time');
      return;
    }

    setIsAddingTeam(true);
    const { error } = await supabase
      .from('cbfd_teams')
      .insert({ name: newTeamName.trim() });

    if (error) {
      toast.error('Erro ao adicionar time');
    } else {
      toast.success('Time adicionado!');
      setNewTeamName('');
      loadCBFDTeams();
    }
    setIsAddingTeam(false);
  };

  const handleDeleteTeam = async (id: string) => {
    const { error } = await supabase.from('cbfd_teams').delete().eq('id', id);
    if (error) {
      toast.error('Erro ao remover time');
    } else {
      toast.success('Time removido');
      loadCBFDTeams();
    }
  };

  // CBFD Championships handlers
  const handleAddChampionship = async () => {
    if (!newChampionshipName.trim()) {
      toast.error('Digite o nome do campeonato');
      return;
    }

    setIsAddingChampionship(true);
    const { error } = await supabase
      .from('cbfd_championships')
      .insert({ name: newChampionshipName.trim() });

    if (error) {
      toast.error('Erro ao adicionar campeonato');
    } else {
      toast.success('Campeonato adicionado!');
      setNewChampionshipName('');
      loadCBFDChampionships();
    }
    setIsAddingChampionship(false);
  };

  const handleDeleteChampionship = async (id: string) => {
    const { error } = await supabase.from('cbfd_championships').delete().eq('id', id);
    if (error) {
      toast.error('Erro ao remover campeonato');
    } else {
      toast.success('Campeonato removido');
      loadCBFDChampionships();
    }
  };

  // CBFD Games handlers
  const handleAddGame = async () => {
    if (!selectedTeamA || !selectedTeamB || !newOdd || !selectedChampionship) {
      toast.error('Preencha todos os campos');
      return;
    }

    if (selectedTeamA === selectedTeamB) {
      toast.error('Selecione times diferentes');
      return;
    }

    const odd = parseFloat(newOdd);
    if (isNaN(odd) || odd < 1) {
      toast.error('Digite uma odd válida (mínimo 1.00)');
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
    const { error } = await supabase
      .from('cbfd_games')
      .insert({
        team_a: teamA,
        team_b: teamB,
        odd: odd,
        championship: championship,
        match_date: matchDateTime
      });

    if (error) {
      toast.error('Erro ao adicionar partida');
    } else {
      toast.success('Partida CBFD adicionada!');
      setSelectedTeamA('');
      setSelectedTeamB('');
      setNewOdd('');
      setSelectedChampionship('');
      setMatchDate('');
      setMatchTime('');
      loadCBFDGames();
    }
    setIsAddingGame(false);
  };

  const handleDeleteGame = async (id: string) => {
    const { error } = await supabase.from('cbfd_games').delete().eq('id', id);
    if (error) {
      toast.error('Erro ao remover partida');
    } else {
      toast.success('Partida removida');
      loadCBFDGames();
    }
  };

  if (!isOpen) return null;

  if (loading) {
    return (
      <div className="fixed inset-0 z-[100] bg-background/98 backdrop-blur-md flex items-center justify-center p-4">
        <div className="text-center space-y-6 w-full max-w-sm">
          <div className="text-5xl animate-pulse">👑</div>
          <h2 className="text-2xl font-bold text-gradient">Carregando Painel CEO</h2>
          <p className="text-muted-foreground text-sm">Acessando dashboard administrativo...</p>
          <div className="space-y-2">
            <Progress value={progress} className="h-3" />
            <p className="text-sm text-primary">{progress}%</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-background/98 backdrop-blur-sm overflow-y-auto overflow-x-hidden">
      <div className="w-full max-w-7xl mx-auto px-3 py-4 pb-24 sm:px-4 sm:py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gradient flex items-center gap-2">
              👑 <span className="truncate">Painel CEO</span>
            </h1>
            <p className="text-muted-foreground text-xs sm:text-sm">LUCCABET Admin</p>
          </div>
          <Button onClick={onClose} variant="outline" size="icon" className="shrink-0 h-10 w-10">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-4">
          <Card className="border-primary/30 bg-card/80">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="h-4 w-4 text-primary shrink-0" />
                <span className="text-xs text-muted-foreground truncate">Tesouraria</span>
              </div>
              <div className="text-lg sm:text-xl font-bold text-primary">€ 125.450</div>
            </CardContent>
          </Card>
          <Card className="border-primary/30 bg-card/80">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-1">
                <Users className="h-4 w-4 text-primary shrink-0" />
                <span className="text-xs text-muted-foreground truncate">Usuários</span>
              </div>
              <div className="text-lg sm:text-xl font-bold text-primary">1,247</div>
            </CardContent>
          </Card>
        </div>

        {/* SEÇÃO ESPORTIVA CBFD */}
        <Card className="border-secondary/50 mb-4">
          <CardHeader className="p-3 sm:p-4 pb-2">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg text-secondary">
              <Trophy className="h-5 w-5" />
              SEÇÃO ESPORTIVA CBFD
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-2">
            <Tabs defaultValue="partidas" className="w-full">
              <TabsList className="w-full grid grid-cols-3 h-auto gap-1 bg-muted/50 p-1">
                <TabsTrigger value="partidas" className="text-xs sm:text-sm py-2 px-1 data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground">
                  Partidas
                </TabsTrigger>
                <TabsTrigger value="times" className="text-xs sm:text-sm py-2 px-1 data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground">
                  Times
                </TabsTrigger>
                <TabsTrigger value="campeonatos" className="text-xs sm:text-sm py-2 px-1 data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground">
                  Campeonatos
                </TabsTrigger>
              </TabsList>

              {/* PARTIDAS TAB */}
              <TabsContent value="partidas" className="mt-4 space-y-4">
                <div className="grid gap-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Time A</Label>
                      <Select value={selectedTeamA} onValueChange={setSelectedTeamA}>
                        <SelectTrigger className="mt-1 h-10">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {cbfdTeams.map((team) => (
                            <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Time B</Label>
                      <Select value={selectedTeamB} onValueChange={setSelectedTeamB}>
                        <SelectTrigger className="mt-1 h-10">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {cbfdTeams.map((team) => (
                            <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Campeonato</Label>
                      <Select value={selectedChampionship} onValueChange={setSelectedChampionship}>
                        <SelectTrigger className="mt-1 h-10">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {cbfdChampionships.map((champ) => (
                            <SelectItem key={champ.id} value={champ.id}>{champ.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Odd</Label>
                      <Input
                        type="number"
                        value={newOdd}
                        onChange={(e) => setNewOdd(e.target.value)}
                        placeholder="Ex: 2.50"
                        step="0.01"
                        min="1"
                        className="mt-1 h-10"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Data</Label>
                      <Input
                        type="date"
                        value={matchDate}
                        onChange={(e) => setMatchDate(e.target.value)}
                        className="mt-1 h-10"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Horário</Label>
                      <Input
                        type="time"
                        value={matchTime}
                        onChange={(e) => setMatchTime(e.target.value)}
                        className="mt-1 h-10"
                      />
                    </div>
                  </div>
                  <Button onClick={handleAddGame} disabled={isAddingGame} className="w-full h-10 glow-primary">
                    <Plus className="h-4 w-4 mr-2" />
                    {isAddingGame ? 'Adicionando...' : 'Adicionar Partida'}
                  </Button>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Partidas ({cbfdGames.length})</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {cbfdGames.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-4 text-center">Nenhuma partida</p>
                    ) : (
                      cbfdGames.map((game) => (
                        <div key={game.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate">{game.team_a} vs {game.team_b}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {game.championship} • Odd: {Number(game.odd).toFixed(2)}x
                              {game.match_date && ` • ${new Date(game.match_date).toLocaleDateString('pt-BR')} ${new Date(game.match_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`}
                            </p>
                          </div>
                          <Button variant="destructive" size="icon" onClick={() => handleDeleteGame(game.id)} className="h-8 w-8 shrink-0">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* TIMES TAB */}
              <TabsContent value="times" className="mt-4 space-y-4">
                <div className="flex gap-2">
                  <Input
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    placeholder="Nome do time"
                    className="flex-1 h-10"
                  />
                  <Button onClick={handleAddTeam} disabled={isAddingTeam} className="shrink-0 h-10 glow-primary">
                    <Plus className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">Adicionar</span>
                  </Button>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Times CBFD ({cbfdTeams.length})
                  </h4>
                  <div className="grid gap-2 max-h-48 overflow-y-auto">
                    {cbfdTeams.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-4 text-center">Nenhum time cadastrado</p>
                    ) : (
                      cbfdTeams.map((team) => (
                        <div key={team.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <span className="text-sm font-medium truncate">{team.name}</span>
                          <Button variant="destructive" size="icon" onClick={() => handleDeleteTeam(team.id)} className="h-8 w-8 shrink-0">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* CAMPEONATOS TAB */}
              <TabsContent value="campeonatos" className="mt-4 space-y-4">
                <div className="flex gap-2">
                  <Input
                    value={newChampionshipName}
                    onChange={(e) => setNewChampionshipName(e.target.value)}
                    placeholder="Nome do campeonato"
                    className="flex-1 h-10"
                  />
                  <Button onClick={handleAddChampionship} disabled={isAddingChampionship} className="shrink-0 h-10 glow-primary">
                    <Plus className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">Adicionar</span>
                  </Button>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    <Trophy className="h-4 w-4" />
                    Campeonatos ({cbfdChampionships.length})
                  </h4>
                  <div className="grid gap-2 max-h-48 overflow-y-auto">
                    {cbfdChampionships.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-4 text-center">Nenhum campeonato</p>
                    ) : (
                      cbfdChampionships.map((champ) => (
                        <div key={champ.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <span className="text-sm font-medium truncate">{champ.name}</span>
                          <Button variant="destructive" size="icon" onClick={() => handleDeleteChampionship(champ.id)} className="h-8 w-8 shrink-0">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Credit User & Online Users */}
        <div className="grid grid-cols-1 gap-4 mb-4">
          <Card className="border-border">
            <CardHeader className="p-3 sm:p-4 pb-2">
              <CardTitle className="text-base">Creditar Saldo</CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-2 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="username" className="text-xs">Usuário</Label>
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Nome de usuário"
                    className="mt-1 h-10"
                  />
                </div>
                <div>
                  <Label htmlFor="amount" className="text-xs">Valor (€)</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={creditAmount}
                    onChange={(e) => setCreditAmount(e.target.value)}
                    placeholder="Valor"
                    className="mt-1 h-10"
                    step="0.01"
                  />
                </div>
              </div>
              <Button onClick={handleCreditUser} disabled={isCrediting} className="w-full h-10 glow-primary">
                {isCrediting ? 'Processando...' : 'Creditar Usuário'}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="p-3 sm:p-4 pb-2">
              <CardTitle className="text-base">Usuários Online ({onlineUsers.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-2">
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {onlineUsers.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">Nenhum usuário online</p>
                ) : (
                  onlineUsers.map((user, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{user.username}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-primary">€ {parseFloat(user.balance).toFixed(2)}</p>
                        <span className="text-xs text-green-500">● Online</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CEOPanel;