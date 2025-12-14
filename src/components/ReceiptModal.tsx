import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle, Download, Mail } from 'lucide-react';
import { formatBRL } from '@/lib/formatCurrency';
import { toast } from 'sonner';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'deposit' | 'withdraw';
  amount: number;
  txid: string;
  pixKey?: string;
}

const ReceiptModal: React.FC<ReceiptModalProps> = ({ isOpen, onClose, type, amount, txid, pixKey }) => {
  const handleDownload = () => {
    toast.success('Receipt downloaded!');
  };

  const handleEmail = () => {
    toast.success('Receipt sent to your email!');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-6 w-6 text-success" />
            {type === 'deposit' ? 'Deposit Receipt' : 'Withdrawal Receipt'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 bg-muted p-6 rounded-lg border border-border">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-success" />
            </div>
          </div>

          <div className="text-center space-y-2">
            <h3 className="text-2xl font-bold text-gradient">{formatBRL(amount)}</h3>
            <p className="text-sm text-muted-foreground">
              {type === 'deposit' ? 'Deposited successfully' : 'Withdrawn successfully'}
            </p>
          </div>

          <div className="space-y-3 pt-4 border-t border-border">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Transaction ID:</span>
              <span className="text-sm font-mono">{txid.slice(0, 16)}...</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Date:</span>
              <span className="text-sm">{new Date().toLocaleString('pt-BR')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Type:</span>
              <span className="text-sm capitalize">{type}</span>
            </div>
            {pixKey && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">PIX Key:</span>
                <span className="text-sm">{pixKey}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Status:</span>
              <span className="text-sm text-success font-semibold">Completed</span>
            </div>
          </div>

          <div className="pt-4 border-t border-border">
            <div className="text-xs text-muted-foreground text-center mb-3">
              🔒 Assinatura Digital: LUCCABET-{txid.slice(-8).toUpperCase()}
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Button onClick={handleDownload} variant="outline" className="flex-1">
            <Download className="mr-2 h-4 w-4" />
            Download
          </Button>
          <Button onClick={handleEmail} variant="outline" className="flex-1">
            <Mail className="mr-2 h-4 w-4" />
            Send Email
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReceiptModal;
