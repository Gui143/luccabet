import React, { useState, useEffect, useRef } from 'react';
import { Send, Headphones, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SupportMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  message: string;
  is_admin: boolean;
  created_at: string;
}

const SupportChat: React.FC = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && user) {
      loadOrCreateTicket();
    }
  }, [isOpen, user]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (!ticketId) return;

    const channel = supabase
      .channel(`support-${ticketId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'support_messages',
        filter: `ticket_id=eq.${ticketId}`,
      }, (payload) => {
        setMessages(prev => [...prev, payload.new as SupportMessage]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [ticketId]);

  const loadOrCreateTicket = async () => {
    if (!user) return;
    setIsLoading(true);

    // Find open ticket
    const { data: tickets } = await supabase
      .from('support_tickets')
      .select('id')
      .eq('user_id', user.id)
      .in('status', ['open', 'assigned'])
      .order('created_at', { ascending: false })
      .limit(1);

    let tid: string;
    if (tickets && tickets.length > 0) {
      tid = tickets[0].id;
    } else {
      const { data: newTicket, error } = await supabase
        .from('support_tickets')
        .insert({ user_id: user.id, subject: 'Suporte' })
        .select('id')
        .single();

      if (error || !newTicket) {
        toast.error('Erro ao iniciar suporte');
        setIsLoading(false);
        return;
      }
      tid = newTicket.id;
    }

    setTicketId(tid);

    const { data: msgs } = await supabase
      .from('support_messages')
      .select('*')
      .eq('ticket_id', tid)
      .order('created_at', { ascending: true });

    setMessages(msgs || []);
    setIsLoading(false);
  };

  const sendMessage = async () => {
    if (!user || !newMessage.trim() || !ticketId) return;

    setIsSending(true);
    const { error } = await supabase.from('support_messages').insert({
      ticket_id: ticketId,
      sender_id: user.id,
      message: newMessage.trim(),
      is_admin: false,
    });

    if (error) {
      toast.error('Erro ao enviar mensagem');
    } else {
      setNewMessage('');
    }
    setIsSending(false);
  };

  if (!user) return null;

  return (
    <>
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-20 md:bottom-6 right-4 z-50 rounded-full w-12 h-12 shadow-lg bg-emerald-600 hover:bg-emerald-700"
        size="icon"
      >
        {isOpen ? <X className="h-5 w-5" /> : <Headphones className="h-5 w-5" />}
      </Button>

      {isOpen && (
        <div className="fixed bottom-36 md:bottom-24 right-4 z-50 w-80 sm:w-96 h-[420px] shadow-2xl border border-border bg-card rounded-xl flex flex-col overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-emerald-600">
            <Headphones className="h-5 w-5 text-white" />
            <div className="flex-1">
              <p className="text-sm font-bold text-white">Suporte ao Vivo</p>
              <p className="text-[10px] text-white/70">Geralmente responde em minutos</p>
            </div>
            <Button onClick={() => setIsOpen(false)} variant="ghost" size="icon" className="h-7 w-7 text-white hover:bg-white/20">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <ScrollArea className="flex-1 p-3" ref={scrollRef}>
            <div className="space-y-2">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <Headphones className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p>Olá! Como podemos ajudar?</p>
                  <p className="text-xs mt-1">Envie sua mensagem abaixo.</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.is_admin ? 'justify-start' : 'justify-end'}`}>
                    <div className={`px-3 py-2 rounded-lg max-w-[80%] text-sm ${
                      msg.is_admin
                        ? 'bg-muted text-foreground'
                        : 'bg-emerald-600 text-white'
                    }`}>
                      {msg.is_admin && <p className="text-[10px] font-bold text-emerald-500 mb-0.5">Suporte</p>}
                      <p className="break-words">{msg.message}</p>
                      <p className={`text-[9px] mt-1 ${msg.is_admin ? 'text-muted-foreground' : 'text-white/60'}`}>
                        {new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          <div className="p-3 border-t border-border">
            <div className="flex gap-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
                placeholder="Digite sua mensagem..."
                disabled={isSending}
                className="flex-1 text-sm"
              />
              <Button onClick={sendMessage} disabled={isSending || !newMessage.trim()} size="icon" className="bg-emerald-600 hover:bg-emerald-700">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SupportChat;
