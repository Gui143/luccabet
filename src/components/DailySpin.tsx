import React, { useState, useRef, useEffect } from 'react';
import { Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatBRLShort } from '@/lib/formatCurrency';

const PRIZES = [
  { label: '€1', value: 1, color: '#e10600' },
  { label: 'Tente\nNovamente', value: 0, color: '#1a1a2e' },
  { label: '€5', value: 5, color: '#16213e' },
  { label: 'Tente\nNovamente', value: 0, color: '#1a1a2e' },
  { label: '€2', value: 2, color: '#0f3460' },
  { label: 'Tente\nNovamente', value: 0, color: '#1a1a2e' },
  { label: '€10', value: 10, color: '#e10600' },
  { label: '€0.50', value: 0.5, color: '#16213e' },
];

const DailySpin: React.FC = () => {
  const { user, updateBalance } = useAuth();
  const [open, setOpen] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [canSpin, setCanSpin] = useState(true);
  const [prize, setPrize] = useState<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!user) return;
    checkCanSpin();
  }, [user, open]);

  useEffect(() => {
    drawWheel(rotation);
  }, [rotation, open]);

  const checkCanSpin = async () => {
    if (!user) return;
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('daily_spin_claims')
      .select('id')
      .eq('user_id', user.id)
      .eq('spin_date', today)
      .limit(1);
    setCanSpin(!data || data.length === 0);
  };

  const drawWheel = (rot: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 280;
    canvas.width = size * 2;
    canvas.height = size * 2;
    const r = size - 10;

    ctx.clearRect(0, 0, size * 2, size * 2);
    ctx.save();
    ctx.translate(size, size);
    ctx.rotate((rot * Math.PI) / 180);

    const sliceAngle = (2 * Math.PI) / PRIZES.length;
    PRIZES.forEach((p, i) => {
      const start = i * sliceAngle;
      const end = start + sliceAngle;

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, r, start, end);
      ctx.closePath();
      ctx.fillStyle = p.color;
      ctx.fill();
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.save();
      ctx.rotate(start + sliceAngle / 2);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 18px Inter, sans-serif';
      const lines = p.label.split('\n');
      lines.forEach((line, li) => {
        ctx.fillText(line, r * 0.6, 6 + (li - (lines.length - 1) / 2) * 20);
      });
      ctx.restore();
    });

    ctx.restore();

    // Arrow
    ctx.fillStyle = '#e10600';
    ctx.beginPath();
    ctx.moveTo(size, 4);
    ctx.lineTo(size - 14, 34);
    ctx.lineTo(size + 14, 34);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
  };

  const spin = async () => {
    if (!user || spinning || !canSpin) return;
    setSpinning(true);
    setPrize(null);

    const weights = [10, 30, 8, 30, 12, 30, 3, 15];
    const total = weights.reduce((a, b) => a + b, 0);
    let rand = Math.random() * total;
    let winIdx = 0;
    for (let i = 0; i < weights.length; i++) {
      rand -= weights[i];
      if (rand <= 0) { winIdx = i; break; }
    }

    const sliceAngle = 360 / PRIZES.length;
    const targetAngle = 360 - (winIdx * sliceAngle + sliceAngle / 2);
    const totalRotation = 360 * 5 + targetAngle;

    const startRot = rotation;
    const duration = 4000;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const currentRot = startRot + totalRotation * eased;
      setRotation(currentRot % 360);
      drawWheel(currentRot % 360);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setRotation(currentRot % 360);
        const wonPrize = PRIZES[winIdx];
        setPrize(wonPrize.value);
        setSpinning(false);
        setCanSpin(false);

        if (wonPrize.value > 0) {
          updateBalance(wonPrize.value);
          toast.success(`🎉 Você ganhou ${formatBRLShort(wonPrize.value)}!`);
        } else {
          toast.info('Tente novamente amanhã!');
        }

        supabase.from('daily_spin_claims').insert({
          user_id: user!.id,
          prize_amount: wonPrize.value,
          spin_date: new Date().toISOString().split('T')[0],
        }).then();
      }
    };
    requestAnimationFrame(animate);
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 border-primary/30 text-primary hover:bg-primary/10">
          <Gift className="h-4 w-4" />
          Bônus Diário
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-center text-xl flex items-center justify-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            Roleta de Bônus Diário
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center space-y-4 py-2">
          <div className="relative">
            <canvas
              ref={canvasRef}
              width={280}
              height={280}
              style={{ width: 280, height: 280 }}
              className="rounded-full border-4 border-primary/30 shadow-[0_0_30px_rgba(225,6,0,0.3)]"
            />
          </div>
          {prize !== null && (
            <div className="text-center animate-fade-in">
              {prize > 0 ? (
                <p className="text-2xl font-black text-green-400">🎉 {formatBRLShort(prize)}</p>
              ) : (
                <p className="text-lg font-bold text-muted-foreground">Tente novamente amanhã!</p>
              )}
            </div>
          )}
          <Button
            onClick={spin}
            disabled={spinning || !canSpin}
            className="w-full glow-primary text-lg font-bold h-12"
          >
            {spinning ? 'Girando...' : !canSpin ? 'Volte amanhã!' : '🎰 GIRAR ROLETA'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DailySpin;
