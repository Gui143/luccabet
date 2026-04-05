import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, DollarSign, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatBRL } from '@/lib/formatCurrency';
import { toast } from 'sonner';

interface Transaction {
  id: string;
  user_id: string;
  type: string;
  amount: number;
  status: string;
  payment_method: string;
  pix_key: string | null;
  created_at: string;
  profiles?: { username: string; balance: number };
}

const TransactionsAdmin: React.FC = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'deposit' | 'withdrawal'>('pending');

  useEffect(() => { loadTransactions(); }, [filter]);

  useEffect(() => {
    const channel = supabase
      .channel('admin-transactions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => loadTransactions())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const loadTransactions = async () => {
    let query = supabase.from('transactions').select('*, profiles!transactions_user_id_fkey(username, balance)').order('created_at', { ascending: false }).limit(100);
    
    if (filter === 'pending') query = query.eq('status', 'pending');
    else if (filter === 'deposit') query = query.eq('type', 'deposit');
    else if (filter === 'withdrawal') query = query.eq('type', 'withdrawal');

    const { data } = await query;
    setTransactions((data as Transaction[]) || []);
    setLoading(false);
  };

  const handleAction = async (tx: Transaction, action: 'approved' | 'rejected') => {
    if (!user) return;

    // For deposits: if approved, credit balance
    if (action === 'approved' && tx.type === 'deposit') {
      const currentBalance = tx.profiles?.balance || 0;
      await supabase.from('profiles').update({ balance: currentBalance + tx.amount }).eq('id', tx.user_id);
    }

    // For withdrawals: if rejected, refund
    if (action === 'rejected' && tx.type === 'withdrawal') {
      const currentBalance = tx.profiles?.balance || 0;
      await supabase.from('profiles').update({ balance: currentBalance + tx.amount }).eq('id', tx.user_id);
    }

    await supabase.from('transactions').update({
      status: action === 'approved' ? 'completed' : 'rejected',
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    }).eq('id', tx.id);

    toast.success(action === 'approved' ? 'Transação aprovada!' : 'Transação rejeitada');
    loadTransactions();
  };

  const pendingCount = transactions.filter(t => t.status === 'pending').length;

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      pending: 'bg-yellow-500/20 text-yellow-400',
      completed: 'bg-emerald-500/20 text-emerald-400',
      approved: 'bg-emerald-500/20 text-emerald-400',
      rejected: 'bg-red-500/20 text-red-400',
      processing: 'bg-blue-500/20 text-blue-400',
    };
    const labels: Record<string, string> = {
      pending: 'Pendente', completed: 'Concluído', approved: 'Aprovado', rejected: 'Rejeitado', processing: 'Processando',
    };
    return <Badge className={`text-[10px] ${map[status] || ''}`}>{labels[status] || status}</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-primary" />
          <h3 className="font-bold">Transações</h3>
          {pendingCount > 0 && <Badge className="bg-yellow-500 text-black text-[10px]">{pendingCount} pendente{pendingCount > 1 ? 's' : ''}</Badge>}
        </div>
        <div className="flex gap-1">
          {(['pending', 'all', 'deposit', 'withdrawal'] as const).map(f => (
            <Button key={f} variant={filter === f ? 'default' : 'outline'} size="sm" className="text-xs" onClick={() => setFilter(f)}>
              {f === 'pending' ? 'Pendentes' : f === 'all' ? 'Todos' : f === 'deposit' ? 'Depósitos' : 'Saques'}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : transactions.length === 0 ? (
        <p className="text-center text-muted-foreground py-8 text-sm">Nenhuma transação encontrada</p>
      ) : (
        <div className="space-y-2">
          {transactions.map(tx => (
            <Card key={tx.id} className="border-border">
              <CardContent className="p-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${tx.type === 'deposit' ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
                      <DollarSign className={`h-5 w-5 ${tx.type === 'deposit' ? 'text-emerald-400' : 'text-red-400'}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold">{tx.profiles?.username || 'Usuário'}</span>
                        {statusBadge(tx.status)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {tx.type === 'deposit' ? 'Depósito' : 'Saque'} • {tx.payment_method.toUpperCase()}
                        {tx.pix_key && ` • ${tx.pix_key}`}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{new Date(tx.created_at).toLocaleString('pt-BR')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-lg font-bold ${tx.type === 'deposit' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {tx.type === 'deposit' ? '+' : '-'}{formatBRL(tx.amount)}
                    </span>
                    {tx.status === 'pending' && (
                      <div className="flex gap-1">
                        <Button onClick={() => handleAction(tx, 'approved')} size="sm" className="h-7 bg-emerald-600 hover:bg-emerald-700 text-xs">
                          <CheckCircle className="h-3 w-3 mr-1" /> Aprovar
                        </Button>
                        <Button onClick={() => handleAction(tx, 'rejected')} size="sm" variant="destructive" className="h-7 text-xs">
                          <XCircle className="h-3 w-3 mr-1" /> Rejeitar
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default TransactionsAdmin;
