import React, { useState, useEffect, useRef } from 'react';
import { Headphones, Send, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Ticket {
  id: string;
  user_id: string;
  status: string;
  subject: string;
  created_at: string;
  profiles?: { username: string };
}

interface Message {
  id: string;
  ticket_id: string;
  sender_id: string;
  message: string;
  is_admin: boolean;
  created_at: string;
}

const SupportDashboard: React.FC = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { loadTickets(); }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    if (!selectedTicket) return;
    const channel = supabase
      .channel(`admin-support-${selectedTicket.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'support_messages',
        filter: `ticket_id=eq.${selectedTicket.id}`,
      }, (payload) => {
        setMessages(prev => [...prev, payload.new as Message]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedTicket?.id]);

  // Realtime for new tickets
  useEffect(() => {
    const channel = supabase
      .channel('admin-tickets')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, () => {
        loadTickets();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const loadTickets = async () => {
    const { data } = await supabase
      .from('support_tickets')
      .select('*, profiles!support_tickets_user_id_fkey(username)')
      .order('created_at', { ascending: false });
    setTickets((data as Ticket[]) || []);
    setLoading(false);
  };

  const selectTicket = async (ticket: Ticket) => {
    setSelectedTicket(ticket);
    const { data } = await supabase
      .from('support_messages')
      .select('*')
      .eq('ticket_id', ticket.id)
      .order('created_at', { ascending: true });
    setMessages(data || []);

    // Auto-assign if open
    if (ticket.status === 'open' && user) {
      await supabase.from('support_tickets').update({
        status: 'assigned',
        assigned_admin_id: user.id,
      }).eq('id', ticket.id);
      loadTickets();
    }
  };

  const sendAdminMessage = async () => {
    if (!user || !newMessage.trim() || !selectedTicket) return;
    const { error } = await supabase.from('support_messages').insert({
      ticket_id: selectedTicket.id,
      sender_id: user.id,
      message: newMessage.trim(),
      is_admin: true,
    });
    if (error) toast.error('Erro ao enviar');
    else setNewMessage('');
  };

  const closeTicket = async () => {
    if (!selectedTicket) return;
    await supabase.from('support_tickets').update({
      status: 'closed', closed_at: new Date().toISOString(),
    }).eq('id', selectedTicket.id);
    toast.success('Ticket fechado');
    setSelectedTicket(null);
    loadTickets();
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = { open: 'bg-yellow-500/20 text-yellow-400', assigned: 'bg-blue-500/20 text-blue-400', closed: 'bg-muted text-muted-foreground' };
    const labels: Record<string, string> = { open: 'Aberto', assigned: 'Em atendimento', closed: 'Fechado' };
    return <Badge className={`text-[10px] ${map[status] || ''}`}>{labels[status] || status}</Badge>;
  };

  const openCount = tickets.filter(t => t.status === 'open').length;

  if (loading) return <p className="text-center text-muted-foreground py-4">Carregando...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Headphones className="h-5 w-5 text-emerald-500" />
        <h3 className="font-bold">Suporte ao Vivo</h3>
        {openCount > 0 && <Badge className="bg-red-500 text-white text-[10px]">{openCount} novo{openCount > 1 ? 's' : ''}</Badge>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Ticket List */}
        <Card className="md:col-span-1 border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Tickets ({tickets.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[400px]">
              {tickets.map(t => (
                <button
                  key={t.id}
                  onClick={() => selectTicket(t)}
                  className={`w-full text-left p-3 border-b border-border hover:bg-muted/50 transition ${selectedTicket?.id === t.id ? 'bg-muted' : ''}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium truncate">{t.profiles?.username || 'Usuário'}</span>
                    {statusBadge(t.status)}
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(t.created_at).toLocaleString('pt-BR')}
                  </p>
                </button>
              ))}
              {tickets.length === 0 && <p className="text-center text-muted-foreground text-sm py-8">Nenhum ticket</p>}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Chat Area */}
        <Card className="md:col-span-2 border-border">
          {selectedTicket ? (
            <div className="flex flex-col h-[460px]">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <div>
                  <p className="text-sm font-bold">{selectedTicket.profiles?.username}</p>
                  <p className="text-[10px] text-muted-foreground">Ticket #{selectedTicket.id.slice(0, 8)}</p>
                </div>
                <div className="flex gap-2">
                  {selectedTicket.status !== 'closed' && (
                    <Button onClick={closeTicket} variant="outline" size="sm" className="text-xs">
                      <CheckCircle className="h-3 w-3 mr-1" /> Fechar
                    </Button>
                  )}
                </div>
              </div>

              <ScrollArea className="flex-1 p-3" ref={scrollRef}>
                <div className="space-y-2">
                  {messages.map(msg => (
                    <div key={msg.id} className={`flex ${msg.is_admin ? 'justify-end' : 'justify-start'}`}>
                      <div className={`px-3 py-2 rounded-lg max-w-[75%] text-sm ${
                        msg.is_admin ? 'bg-emerald-600 text-white' : 'bg-muted'
                      }`}>
                        <p className="break-words">{msg.message}</p>
                        <p className={`text-[9px] mt-1 ${msg.is_admin ? 'text-white/60' : 'text-muted-foreground'}`}>
                          {new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {selectedTicket.status !== 'closed' && (
                <div className="p-3 border-t border-border">
                  <div className="flex gap-2">
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), sendAdminMessage())}
                      placeholder="Responder..."
                      className="flex-1 text-sm"
                    />
                    <Button onClick={sendAdminMessage} size="icon" className="bg-emerald-600 hover:bg-emerald-700">
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-[460px] text-muted-foreground text-sm">
              Selecione um ticket para responder
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default SupportDashboard;
