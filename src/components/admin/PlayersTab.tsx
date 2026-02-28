import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Search, UserCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Player {
  id: string;
  name: string;
  photo_url: string | null;
  is_active: boolean;
}

const PlayersTab: React.FC = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerPhoto, setNewPlayerPhoto] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadPlayers();
  }, []);

  const loadPlayers = async () => {
    const { data } = await supabase
      .from('cbfd_players')
      .select('*')
      .order('name', { ascending: true });
    if (data) setPlayers(data as Player[]);
  };

  const handleAddPlayer = async () => {
    if (!newPlayerName.trim()) {
      toast.error('Digite o nome do jogador');
      return;
    }
    setIsAdding(true);
    const { error } = await supabase.from('cbfd_players').insert({
      name: newPlayerName.trim(),
      photo_url: newPlayerPhoto.trim() || null,
    });
    if (error) toast.error('Erro ao adicionar jogador');
    else {
      toast.success('Jogador adicionado!');
      setNewPlayerName('');
      setNewPlayerPhoto('');
      loadPlayers();
    }
    setIsAdding(false);
  };

  const handleDeletePlayer = async (id: string) => {
    const { error } = await supabase.from('cbfd_players').delete().eq('id', id);
    if (error) toast.error('Erro ao remover jogador');
    else {
      toast.success('Jogador removido');
      loadPlayers();
    }
  };

  const handleToggleActive = async (id: string, current: boolean) => {
    const { error } = await supabase
      .from('cbfd_players')
      .update({ is_active: !current })
      .eq('id', id);
    if (error) toast.error('Erro ao atualizar');
    else loadPlayers();
  };

  const filtered = players.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="space-y-3 p-3 bg-card rounded-lg border border-border">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <UserCircle className="h-4 w-4" />
          Novo Jogador
        </h4>
        <Input
          value={newPlayerName}
          onChange={(e) => setNewPlayerName(e.target.value)}
          placeholder="Nome do jogador"
          className="h-9"
        />
        <Input
          value={newPlayerPhoto}
          onChange={(e) => setNewPlayerPhoto(e.target.value)}
          placeholder="URL da foto (opcional)"
          className="h-9"
        />
        <Button onClick={handleAddPlayer} disabled={isAdding} className="w-full h-9 glow-primary">
          <Plus className="h-4 w-4 mr-1" />
          Adicionar Jogador
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar jogador..."
          className="h-9 pl-9"
        />
      </div>

      <div className="space-y-2">
        <h4 className="font-medium text-sm">Jogadores ({filtered.length})</h4>
        {filtered.map((player) => (
          <div key={player.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {player.photo_url ? (
                <img src={player.photo_url} alt={player.name} className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <UserCircle className="w-8 h-8 text-muted-foreground" />
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{player.name}</p>
                <p className={`text-xs ${player.is_active ? 'text-success' : 'text-muted-foreground'}`}>
                  {player.is_active ? 'Ativo' : 'Inativo'}
                </p>
              </div>
            </div>
            <div className="flex gap-1 shrink-0">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleToggleActive(player.id, player.is_active)}
                className="h-8 text-xs"
              >
                {player.is_active ? 'Desativar' : 'Ativar'}
              </Button>
              <Button
                size="icon"
                variant="destructive"
                onClick={() => handleDeletePlayer(player.id)}
                className="h-8 w-8"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PlayersTab;
