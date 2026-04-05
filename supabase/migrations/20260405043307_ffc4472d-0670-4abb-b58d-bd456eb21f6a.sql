
-- Support tickets table
CREATE TABLE public.support_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_admin_id UUID REFERENCES public.profiles(id),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'assigned', 'closed')),
  subject TEXT NOT NULL DEFAULT 'Suporte',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  closed_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own tickets" ON public.support_tickets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own tickets" ON public.support_tickets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "CEO can view all tickets" ON public.support_tickets FOR SELECT USING (public.has_role(auth.uid(), 'ceo'));
CREATE POLICY "CEO can update all tickets" ON public.support_tickets FOR UPDATE USING (public.has_role(auth.uid(), 'ceo'));

-- Support messages table
CREATE TABLE public.support_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id),
  message TEXT NOT NULL,
  is_admin BOOLEAN NOT NULL DEFAULT false,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages of their tickets" ON public.support_messages FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.support_tickets WHERE id = ticket_id AND user_id = auth.uid()));
CREATE POLICY "CEO can view all messages" ON public.support_messages FOR SELECT USING (public.has_role(auth.uid(), 'ceo'));
CREATE POLICY "Users can send messages to their tickets" ON public.support_messages FOR INSERT 
  WITH CHECK (
    auth.uid() = sender_id AND 
    EXISTS (SELECT 1 FROM public.support_tickets WHERE id = ticket_id AND user_id = auth.uid())
  );
CREATE POLICY "CEO can send messages" ON public.support_messages FOR INSERT 
  WITH CHECK (auth.uid() = sender_id AND public.has_role(auth.uid(), 'ceo'));
CREATE POLICY "CEO can update messages" ON public.support_messages FOR UPDATE USING (public.has_role(auth.uid(), 'ceo'));

-- Transactions table for deposits/withdrawals
CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal')),
  amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed', 'processing')),
  payment_method TEXT NOT NULL DEFAULT 'pix',
  pix_key TEXT,
  admin_notes TEXT,
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own transactions" ON public.transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create deposits" ON public.transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "CEO can view all transactions" ON public.transactions FOR SELECT USING (public.has_role(auth.uid(), 'ceo'));
CREATE POLICY "CEO can update transactions" ON public.transactions FOR UPDATE USING (public.has_role(auth.uid(), 'ceo'));

-- Enable realtime for support messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;

-- Game images table for admin-managed game thumbnails
CREATE TABLE public.game_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  game_key TEXT NOT NULL UNIQUE,
  image_url TEXT NOT NULL,
  display_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.game_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view game images" ON public.game_images FOR SELECT USING (true);
CREATE POLICY "CEO can manage game images" ON public.game_images FOR ALL USING (public.has_role(auth.uid(), 'ceo'));

-- Create storage bucket for game images
INSERT INTO storage.buckets (id, name, public) VALUES ('game-images', 'game-images', true);

CREATE POLICY "Anyone can view game images storage" ON storage.objects FOR SELECT USING (bucket_id = 'game-images');
CREATE POLICY "CEO can upload game images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'game-images' AND public.has_role(auth.uid(), 'ceo'));
CREATE POLICY "CEO can update game images" ON storage.objects FOR UPDATE USING (bucket_id = 'game-images' AND public.has_role(auth.uid(), 'ceo'));
CREATE POLICY "CEO can delete game images" ON storage.objects FOR DELETE USING (bucket_id = 'game-images' AND public.has_role(auth.uid(), 'ceo'));
