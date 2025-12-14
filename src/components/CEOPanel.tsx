import React, { useState, useEffect } from 'react';
import { X, TrendingUp, Users, DollarSign, Activity, Plus, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
}

const CEOPanel: React.FC<CEOPanelProps> = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [username, setUsername] = useState('');
  const [creditAmount, setCreditAmount] = useState('');
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const [isCrediting, setIsCrediting] = useState(false);
  
  // CBFD Games state
  const [cbfdGames, setCbfdGames] = useState<CBFDGame[]>([]);
  const [newTeamA, setNewTeamA] = useState('');
  const [newTeamB, setNewTeamB] = useState('');
  const [newOdd, setNewOdd] = useState('');
  const [newChampionship, setNewChampionship] = useState('');
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
            loadOnlineUsers();
            loadCBFDGames();
            return 100;
          }
          return prev + 2;
        });
      }, 50);

      return () => clearInterval(interval);
    }
  }, [isOpen]);

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

  const handleAddCBFDGame = async () => {
    if (!newTeamA.trim() || !newTeamB.trim() || !newOdd || !newChampionship.trim()) {
      toast.error('Preencha todos os campos');
      return;
    }

    const odd = parseFloat(newOdd);
    if (isNaN(odd) || odd < 1) {
      toast.error('Digite uma odd válida (mínimo 1.00)');
      return;
    }

    setIsAddingGame(true);

    const { error } = await supabase
      .from('cbfd_games')
      .insert({
        team_a: newTeamA.trim(),
        team_b: newTeamB.trim(),
        odd: odd,
        championship: newChampionship.trim()
      });

    if (error) {
      toast.error('Erro ao adicionar jogo');
    } else {
      toast.success('Jogo CBFD adicionado!');
      setNewTeamA('');
      setNewTeamB('');
      setNewOdd('');
      setNewChampionship('');
      loadCBFDGames();
    }

    setIsAddingGame(false);
  };

  const handleDeleteGame = async (id: string) => {
    const { error } = await supabase
      .from('cbfd_games')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Erro ao remover jogo');
    } else {
      toast.success('Jogo removido');
      loadCBFDGames();
    }
  };

  if (!isOpen) return null;

  if (loading) {
    return (
      <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex items-center justify-center p-4">
        <div className="text-center space-y-6 max-w-md w-full">
          <div className="text-5xl md:text-6xl animate-pulse text-gradient">👑</div>
          <h2 className="text-2xl md:text-4xl font-bold text-gradient">Carregando Painel CEO</h2>
          <p className="text-muted-foreground text-sm md:text-base">Acessando dashboard administrativo...</p>
          <div className="space-y-2">
            <Progress value={progress} className="h-3" />
            <p className="text-sm text-primary">{progress}%</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm overflow-y-auto">
      <div className="container mx-auto p-3 md:p-6 pb-20">
        {/* Header - Mobile Optimized */}
        <div className="flex items-start justify-between mb-4 md:mb-6 gap-2">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl md:text-4xl font-bold text-gradient flex items-center gap-2 md:gap-3">
              👑 <span className="truncate">Olá CEO</span>
            </h1>
            <p className="text-muted-foreground mt-1 text-xs md:text-base">Painel Executivo - LUCCABET</p>
          </div>
          <Button onClick={onClose} variant="outline" size="icon" className="shrink-0">
            <X className="h-5 w-5 md:h-6 md:w-6" />
          </Button>
        </div>

        {/* Stats Grid - Mobile 2 cols, Desktop 4 cols */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-4 md:mb-6">
          <Card className="border-primary/50 bg-card/50">
            <CardHeader className="p-3 md:p-6 pb-1 md:pb-2">
              <CardTitle className="text-xs md:text-sm flex items-center gap-1 md:gap-2">
                <DollarSign className="h-3 w-3 md:h-4 md:w-4 text-primary" />
                <span className="truncate">Tesouraria</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 md:p-6 pt-0">
              <div className="text-lg md:text-2xl font-bold text-primary">€ 125.450</div>
              <p className="text-[10px] md:text-xs text-muted-foreground mt-1">+12.5% semana</p>
            </CardContent>
          </Card>

          <Card className="border-primary/50 bg-card/50">
            <CardHeader className="p-3 md:p-6 pb-1 md:pb-2">
              <CardTitle className="text-xs md:text-sm flex items-center gap-1 md:gap-2">
                <Users className="h-3 w-3 md:h-4 md:w-4 text-primary" />
                <span className="truncate">Usuários</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 md:p-6 pt-0">
              <div className="text-lg md:text-2xl font-bold text-primary">1,247</div>
              <p className="text-[10px] md:text-xs text-muted-foreground mt-1">+8.2% crescimento</p>
            </CardContent>
          </Card>

          <Card className="border-primary/50 bg-card/50">
            <CardHeader className="p-3 md:p-6 pb-1 md:pb-2">
              <CardTitle className="text-xs md:text-sm flex items-center gap-1 md:gap-2">
                <Activity className="h-3 w-3 md:h-4 md:w-4 text-primary" />
                <span className="truncate">Apostas</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 md:p-6 pt-0">
              <div className="text-lg md:text-2xl font-bold text-primary">342</div>
              <p className="text-[10px] md:text-xs text-muted-foreground mt-1">Tempo real</p>
            </CardContent>
          </Card>

          <Card className="border-primary/50 bg-card/50">
            <CardHeader className="p-3 md:p-6 pb-1 md:pb-2">
              <CardTitle className="text-xs md:text-sm flex items-center gap-1 md:gap-2">
                <TrendingUp className="h-3 w-3 md:h-4 md:w-4 text-primary" />
                <span className="truncate">Receita</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 md:p-6 pt-0">
              <div className="text-lg md:text-2xl font-bold text-primary">€ 8.750</div>
              <p className="text-[10px] md:text-xs text-muted-foreground mt-1">+15.3% vs ontem</p>
            </CardContent>
          </Card>
        </div>

        {/* CBFD Games Management - Mobile Optimized */}
        <Card className="border-border mb-4 md:mb-6">
          <CardHeader className="p-3 md:p-6">
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <TrendingUp className="h-4 w-4 md:h-5 md:w-5 text-secondary" />
              Gerenciar Jogos CBFD
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 md:p-6 pt-0 space-y-4 md:space-y-6">
            {/* Add Game Form - Stack on mobile */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
              <div>
                <Label className="text-xs md:text-sm">Time A</Label>
                <Input
                  value={newTeamA}
                  onChange={(e) => setNewTeamA(e.target.value)}
                  placeholder="Ex: FC Estrela"
                  className="mt-1.5 h-9 md:h-10 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs md:text-sm">Time B</Label>
                <Input
                  value={newTeamB}
                  onChange={(e) => setNewTeamB(e.target.value)}
                  placeholder="Ex: Unidos FC"
                  className="mt-1.5 h-9 md:h-10 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs md:text-sm">Odd</Label>
                <Input
                  type="number"
                  value={newOdd}
                  onChange={(e) => setNewOdd(e.target.value)}
                  placeholder="Ex: 2.50"
                  step="0.01"
                  min="1"
                  className="mt-1.5 h-9 md:h-10 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs md:text-sm">Campeonato</Label>
                <Input
                  value={newChampionship}
                  onChange={(e) => setNewChampionship(e.target.value)}
                  placeholder="Ex: Liga CBFD"
                  className="mt-1.5 h-9 md:h-10 text-sm"
                />
              </div>
              <div className="flex items-end sm:col-span-2 lg:col-span-1">
                <Button
                  onClick={handleAddCBFDGame}
                  disabled={isAddingGame}
                  className="w-full glow-primary h-9 md:h-10 text-sm"
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  {isAddingGame ? 'Adicionando...' : 'Adicionar'}
                </Button>
              </div>
            </div>

            {/* Games List */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm md:text-base">Jogos Cadastrados ({cbfdGames.length})</h4>
              {cbfdGames.length === 0 ? (
                <p className="text-xs md:text-sm text-muted-foreground">Nenhum jogo cadastrado</p>
              ) : (
                <div className="space-y-2 max-h-[180px] md:max-h-[200px] overflow-y-auto">
                  {cbfdGames.map((game) => (
                    <div key={game.id} className="flex items-center justify-between p-2 md:p-3 bg-muted rounded gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-xs md:text-sm truncate">{game.team_a} vs {game.team_b}</p>
                        <p className="text-[10px] md:text-xs text-muted-foreground truncate">{game.championship} • Odd: {Number(game.odd).toFixed(2)}x</p>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteGame(game.id)}
                        className="shrink-0 h-8 w-8 p-0"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Credit User & Online Users - Stack on mobile */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-4 md:mb-6">
          <Card className="border-border">
            <CardHeader className="p-3 md:p-6">
              <CardTitle className="text-base md:text-lg">Creditar Saldo</CardTitle>
            </CardHeader>
            <CardContent className="p-3 md:p-6 pt-0 space-y-3 md:space-y-4">
              <div>
                <Label htmlFor="username" className="text-xs md:text-sm">Usuário</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Digite o nome de usuário"
                  className="mt-1.5 h-9 md:h-10 text-sm"
                />
              </div>
              <div>
                <Label htmlFor="amount" className="text-xs md:text-sm">Valor (€)</Label>
                <Input
                  id="amount"
                  type="number"
                  value={creditAmount}
                  onChange={(e) => setCreditAmount(e.target.value)}
                  placeholder="Digite o valor"
                  className="mt-1.5 h-9 md:h-10 text-sm"
                  step="0.01"
                />
              </div>
              <Button
                onClick={handleCreditUser}
                disabled={isCrediting}
                className="w-full glow-primary h-9 md:h-10 text-sm"
              >
                {isCrediting ? 'Processando...' : 'Creditar Usuário'}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="p-3 md:p-6">
              <CardTitle className="text-base md:text-lg">Usuários Online ({onlineUsers.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-3 md:p-6 pt-0">
              <div className="space-y-2 max-h-[200px] md:max-h-[250px] overflow-y-auto">
                {onlineUsers.length === 0 ? (
                  <p className="text-xs md:text-sm text-muted-foreground">Nenhum usuário online</p>
                ) : (
                  onlineUsers.map((user, i) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-muted rounded gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-xs md:text-sm truncate">{user.username}</p>
                        <p className="text-[10px] md:text-xs text-muted-foreground truncate">{user.email}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs md:text-sm font-bold text-primary">€ {parseFloat(user.balance).toFixed(2)}</p>
                        <span className="text-[10px] md:text-xs text-green-500">● Online</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* System Controls - 2x2 grid on mobile */}
        <Card className="border-border">
          <CardHeader className="p-3 md:p-6">
            <CardTitle className="text-base md:text-lg">Controles do Sistema</CardTitle>
          </CardHeader>
          <CardContent className="p-3 md:p-6 pt-0 grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
            <Button className="w-full justify-center md:justify-start text-xs md:text-sm h-9 md:h-10" variant="outline">
              <Users className="mr-1.5 md:mr-2 h-3.5 w-3.5 md:h-4 md:w-4" />
              Usuários
            </Button>
            <Button className="w-full justify-center md:justify-start text-xs md:text-sm h-9 md:h-10" variant="outline">
              <Activity className="mr-1.5 md:mr-2 h-3.5 w-3.5 md:h-4 md:w-4" />
              Atividade
            </Button>
            <Button className="w-full justify-center md:justify-start text-xs md:text-sm h-9 md:h-10" variant="outline">
              <TrendingUp className="mr-1.5 md:mr-2 h-3.5 w-3.5 md:h-4 md:w-4" />
              Análises
            </Button>
            <Button className="w-full justify-center md:justify-start text-xs md:text-sm h-9 md:h-10" variant="outline">
              <DollarSign className="mr-1.5 md:mr-2 h-3.5 w-3.5 md:h-4 md:w-4" />
              Relatórios
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CEOPanel;