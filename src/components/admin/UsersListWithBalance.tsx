import React, { useState, useEffect } from 'react';
import { Users, DollarSign, Plus, Minus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatBRLShort } from '@/lib/formatCurrency';

interface UserProfile {
  id: string;
  username: string;
  email: string;
  balance: number;
  is_online: boolean;
}

const UsersListWithBalance: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [addAmount, setAddAmount] = useState('');
  const [removeAmount, setRemoveAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, username, email, balance, is_online')
      .order('username', { ascending: true });
    if (data) setUsers(data as UserProfile[]);
  };

  const handleAddBalance = async () => {
    if (!selectedUser) return;
    const amount = parseFloat(addAmount);
    if (isNaN(amount) || amount <= 0) { toast.error('Valor inválido'); return; }

    setIsProcessing(true);
    const newBalance = selectedUser.balance + amount;
    const { error } = await supabase
      .from('profiles')
      .update({ balance: newBalance })
      .eq('id', selectedUser.id);

    if (error) toast.error('Erro ao adicionar saldo');
    else {
      toast.success(`+${formatBRLShort(amount)} para ${selectedUser.username}`);
      setSelectedUser({ ...selectedUser, balance: newBalance });
      setAddAmount('');
      loadUsers();
    }
    setIsProcessing(false);
  };

  const handleRemoveBalance = async () => {
    if (!selectedUser) return;
    const amount = parseFloat(removeAmount);
    if (isNaN(amount) || amount <= 0) { toast.error('Valor inválido'); return; }
    if (amount > selectedUser.balance) { toast.error('Saldo insuficiente para remover'); return; }

    setIsProcessing(true);
    const newBalance = selectedUser.balance - amount;
    const { error } = await supabase
      .from('profiles')
      .update({ balance: newBalance })
      .eq('id', selectedUser.id);

    if (error) toast.error('Erro ao remover saldo');
    else {
      toast.success(`-${formatBRLShort(amount)} de ${selectedUser.username}`);
      setSelectedUser({ ...selectedUser, balance: newBalance });
      setRemoveAmount('');
      loadUsers();
    }
    setIsProcessing(false);
  };

  const filtered = users.filter(u =>
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar usuário..."
            className="h-9 pl-9"
          />
        </div>
        <h4 className="font-medium text-sm flex items-center gap-2">
          <Users className="h-4 w-4" />
          Usuários ({filtered.length})
        </h4>
        {filtered.map((u) => (
          <div key={u.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">
                {u.username}
                {u.is_online && <span className="ml-1 inline-block w-2 h-2 rounded-full bg-primary" />}
              </p>
              <p className="text-xs text-muted-foreground truncate">{u.email}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <p className="text-sm font-bold text-primary">{formatBRLShort(Number(u.balance))}</p>
              <Button
                size="icon"
                variant="outline"
                onClick={() => setSelectedUser(u)}
                className="h-8 w-8"
              >
                <DollarSign className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <DialogContent className="max-w-sm mx-4">
          <DialogHeader>
            <DialogTitle>Gerenciar Saldo - {selectedUser?.username}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">Saldo Atual</p>
              <p className="text-2xl font-bold text-primary">{formatBRLShort(Number(selectedUser?.balance || 0))}</p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-primary">Adicionar Saldo</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={addAmount}
                  onChange={(e) => setAddAmount(e.target.value)}
                  placeholder="Valor"
                  min="0.01"
                  step="0.01"
                  className="h-10"
                />
                <Button
                  onClick={handleAddBalance}
                  disabled={isProcessing}
                  className="shrink-0 h-10 glow-primary"
                >
                  <Plus className="h-4 w-4 mr-1" /> Adicionar
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-destructive">Remover Saldo</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={removeAmount}
                  onChange={(e) => setRemoveAmount(e.target.value)}
                  placeholder="Valor"
                  min="0.01"
                  step="0.01"
                  className="h-10"
                />
                <Button
                  onClick={handleRemoveBalance}
                  disabled={isProcessing}
                  variant="destructive"
                  className="shrink-0 h-10"
                >
                  <Minus className="h-4 w-4 mr-1" /> Remover
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default UsersListWithBalance;
