CREATE POLICY "CEO can delete support messages"
ON public.support_messages
FOR DELETE
USING (has_role(auth.uid(), 'ceo'::app_role));

CREATE POLICY "CEO can delete support tickets"
ON public.support_tickets
FOR DELETE
USING (has_role(auth.uid(), 'ceo'::app_role));