import React, { useRef, useState } from 'react';
import { Download, Copy, Sparkles, X, Check, Share2, Crown, Trophy, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatBRLShort } from '@/lib/formatCurrency';
import { type CardCode, cardRank, cardSuit, RANK_LABEL } from '@/games/poker/engine';
import { toast } from 'sonner';

interface PokerStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  username: string;
  avatarSeed?: number;
  tableName: string;
  blinds: string;
  winAmount: number;
  handName?: string;
  holeCards?: CardCode[];
  communityCards?: CardCode[];
  balance: number;
}

const FLEX_PHRASES = [
  'Quem tem banca joga, quem não tem assiste 💸👑',
  'Mais um dia normal no LuccaBet VIP 🍾✨',
  'Puxei a forra da mesa no river! Respeita 💎♠️',
  'All-in pago com sucesso! Banca blindada 🚀',
  'Macau High Roller Lounge — só os milionários 🍷🏆',
  'Paciência de tubarão e banca de gigante 🦈💰',
];

const SUIT_SYMBOLS: Record<string, { char: string; color: string }> = {
  s: { char: '♠', color: '#cbd5e1' },
  h: { char: '♥', color: '#ef4444' },
  d: { char: '♦', color: '#38bdf8' },
  c: { char: '♣', color: '#10b981' },
};

export const PokerStoryModal: React.FC<PokerStoryModalProps> = ({
  isOpen,
  onClose,
  username,
  avatarSeed = 1,
  tableName,
  blinds,
  winAmount,
  handName = 'Full House de Áses',
  holeCards = ['as', 'ah'],
  communityCards = ['ks', 'kd', 'ac', '7h', '2s'],
  balance,
}) => {
  const [selectedPhrase, setSelectedPhrase] = useState(FLEX_PHRASES[0]);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  if (!isOpen) return null;

  const displayWin = winAmount > 0 ? winAmount : balance > 0 ? balance : 25000;
  const cardsToShow = holeCards && holeCards.length === 2 ? holeCards : ['as', 'ah'];

  /** Gera a imagem de 1080x1920 em alta resolução usando HTML5 Canvas */
  const renderCanvas = async (): Promise<string | null> => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    canvas.width = 1080;
    canvas.height = 1920;

    // Fundo Gradiente Luxury Obsidian / Gold Marble
    const bgGrad = ctx.createLinearGradient(0, 0, 1080, 1920);
    bgGrad.addColorStop(0, '#0a0a0c');
    bgGrad.addColorStop(0.3, '#121016');
    bgGrad.addColorStop(0.6, '#061a12');
    bgGrad.addColorStop(1, '#050505');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1080, 1920);

    // Efeito radial dourado no topo
    const radGlow = ctx.createRadialGradient(540, 480, 50, 540, 480, 650);
    radGlow.addColorStop(0, 'rgba(251, 191, 36, 0.22)');
    radGlow.addColorStop(0.5, 'rgba(217, 119, 6, 0.08)');
    radGlow.addColorStop(1, 'transparent');
    ctx.fillStyle = radGlow;
    ctx.fillRect(0, 0, 1080, 1920);

    // Moldura externa dourada com filigrana
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 8;
    ctx.strokeRect(40, 40, 1000, 1840);

    ctx.strokeStyle = 'rgba(251, 191, 36, 0.4)';
    ctx.lineWidth = 2;
    ctx.strokeRect(55, 55, 970, 1810);

    // Cantos decorados VIP
    const drawCorner = (x: number, y: number) => {
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(x, y, 14, 0, Math.PI * 2);
      ctx.fill();
    };
    drawCorner(40, 40);
    drawCorner(1040, 40);
    drawCorner(40, 1880);
    drawCorner(1040, 1880);

    // Logo e Cabeçalho Superior
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fde047';
    ctx.font = 'bold 32px sans-serif';
    ctx.letterSpacing = '6px';
    ctx.fillText('★ LUCCABET HIGH ROLLER ★', 540, 140);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 22px sans-serif';
    ctx.letterSpacing = '3px';
    ctx.fillText('MONTE CARLO • LAS VEGAS • MACAU VIP SUITE', 540, 185);

    // Linha divisória dourada
    const divGrad = ctx.createLinearGradient(200, 0, 880, 0);
    divGrad.addColorStop(0, 'transparent');
    divGrad.addColorStop(0.5, '#fbbf24');
    divGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = divGrad;
    ctx.fillRect(200, 220, 680, 3);

    // Avatar e Nick do Jogador
    ctx.fillStyle = '#1e1b2e';
    ctx.beginPath();
    ctx.arc(540, 360, 80, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 6;
    ctx.stroke();

    // Ícone de Coroa dentro do avatar
    ctx.fillStyle = '#fbbf24';
    ctx.font = '72px sans-serif';
    ctx.fillText('👑', 540, 385);

    // Nome e Badge do jogador
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 48px sans-serif';
    ctx.fillText(username.toUpperCase(), 540, 490);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText('💎 VIP DIAMOND WHALE', 540, 530);

    // Título da Forra / Vitória
    ctx.fillStyle = '#f59e0b';
    ctx.font = '800 36px sans-serif';
    ctx.fillText('FORRA HISTÓRICA NO POKER', 540, 660);

    // Cartão de Valor Principal (Valor Ganho)
    const cardBg = ctx.createLinearGradient(120, 720, 960, 980);
    cardBg.addColorStop(0, 'rgba(251, 191, 36, 0.15)');
    cardBg.addColorStop(0.5, 'rgba(16, 185, 129, 0.2)');
    cardBg.addColorStop(1, 'rgba(251, 191, 36, 0.1)');
    ctx.fillStyle = cardBg;
    ctx.roundRect(140, 710, 800, 260, [24]);
    ctx.fill();
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 4;
    ctx.roundRect(140, 710, 800, 260, [24]);
    ctx.stroke();

    ctx.fillStyle = '#a7f3d0';
    ctx.font = 'bold 28px sans-serif';
    ctx.fillText('LUCRO DA RODADA', 540, 770);

    ctx.fillStyle = '#fde047';
    ctx.font = '900 84px sans-serif';
    ctx.fillText(`+ R$ ${displayWin.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 540, 870);

    ctx.fillStyle = '#ffffff';
    ctx.font = '600 24px sans-serif';
    ctx.fillText(`${tableName} • Blinds ${blinds}`, 540, 930);

    // Mão Vencedora & Cartas
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 34px sans-serif';
    ctx.fillText(`🏆 ${handName.toUpperCase()}`, 540, 1060);

    // Desenha as cartas do jogador no Story (2 cartas centrais)
    const cardW = 160;
    const cardH = 224;
    const startX = 540 - cardW - 15;

    cardsToShow.forEach((c, idx) => {
      const x = startX + idx * (cardW + 30);
      const y = 1110;

      // Sombra da carta
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.roundRect(x + 8, y + 8, cardW, cardH, [16]);
      ctx.fill();

      // Fundo branco marfim da carta
      ctx.fillStyle = '#f8fafc';
      ctx.roundRect(x, y, cardW, cardH, [16]);
      ctx.fill();
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 4;
      ctx.roundRect(x, y, cardW, cardH, [16]);
      ctx.stroke();

      // Rank & Naipe
      const r = RANK_LABEL[c[0]] ?? c[0].toUpperCase();
      const s = c[1];
      const suitInfo = SUIT_SYMBOLS[s] ?? { char: '♠', color: '#000' };

      ctx.fillStyle = suitInfo.color === '#cbd5e1' ? '#0f172a' : suitInfo.color;
      ctx.font = '900 48px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(r, x + 16, y + 54);
      ctx.font = '42px sans-serif';
      ctx.fillText(suitInfo.char, x + 16, y + 104);

      // Naipe gigante central
      ctx.textAlign = 'center';
      ctx.font = '80px sans-serif';
      ctx.fillText(suitInfo.char, x + cardW / 2, y + 155);
    });

    // Frase Flex selecionada (em destaque)
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'italic 700 32px sans-serif';

    // Quebra a frase em 2 linhas se for longa
    const words = selectedPhrase.split(' ');
    let line1 = '';
    let line2 = '';
    words.forEach((w, i) => {
      if (i < words.length / 2) line1 += `${w} `;
      else line2 += `${w} `;
    });

    ctx.fillText(`“${line1.trim()}`, 540, 1450);
    ctx.fillText(`${line2.trim()}”`, 540, 1495);

    // Selo de Verificação LuccaBet VIP no rodapé
    ctx.fillStyle = 'rgba(251, 191, 36, 0.15)';
    ctx.roundRect(240, 1580, 600, 90, [45]);
    ctx.fill();
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.6)';
    ctx.lineWidth = 2;
    ctx.roundRect(240, 1580, 600, 90, [45]);
    ctx.stroke();

    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText('VERIFICADO • HIGH ROLLER CLUB 💎', 540, 1636);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '500 22px sans-serif';
    ctx.fillText('JOGUE NO LUCCABET • CASSINO VIP', 540, 1740);

    return canvas.toDataURL('image/png');
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const dataUrl = await renderCanvas();
      if (!dataUrl) return;
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `luccabet-story-flex-${Date.now()}.png`;
      a.click();
      toast.success('Imagem do Story baixada em alta resolução! 📸✨');
    } catch {
      toast.error('Erro ao gerar imagem.');
    } finally {
      setDownloading(false);
    }
  };

  const handleCopy = async () => {
    setDownloading(true);
    try {
      const dataUrl = await renderCanvas();
      if (!dataUrl) return;
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      if (navigator.clipboard && (window as any).ClipboardItem) {
        await navigator.clipboard.write([new (window as any).ClipboardItem({ 'image/png': blob })]);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
        toast.success('Imagem copiada para a área de transferência! Cole direto no Story 📲');
      } else {
        handleDownload();
      }
    } catch {
      handleDownload();
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in">
      <canvas ref={canvasRef} className="hidden" />

      <div className="relative w-full max-w-lg bg-gradient-to-b from-neutral-900 via-stone-950 to-black border-2 border-amber-500/60 rounded-3xl p-4 sm:p-6 shadow-[0_0_50px_rgba(251,191,36,0.3)] space-y-4">
        {/* Fechar */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header do Modal */}
        <div className="text-center space-y-1">
          <Badge className="bg-amber-500/20 text-amber-300 border-amber-400/40 text-xs py-1 px-3">
            <Sparkles className="w-3.5 h-3.5 mr-1" /> MODO STORY INSTAGRAM FLEX
          </Badge>
          <h2 className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-500">
            Exiba Sua Forra VIP
          </h2>
          <p className="text-xs text-muted-foreground">
            Gere o print perfeito formato 9:16 para postar no story e mostrar quem manda na mesa
          </p>
        </div>

        {/* Prévia do Cartão de Story */}
        <div className="relative w-full aspect-[9/14] rounded-2xl bg-gradient-to-b from-neutral-950 via-emerald-950/40 to-black border-2 border-amber-400/50 p-4 flex flex-col items-center justify-between shadow-2xl overflow-hidden">
          {/* Fundo de luz */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-amber-500/15 blur-3xl pointer-events-none rounded-full" />

          {/* Topo do story */}
          <div className="text-center z-10 w-full space-y-1">
            <div className="text-[11px] tracking-widest font-black text-amber-400 flex items-center justify-center gap-1">
              <Crown className="w-3.5 h-3.5 text-amber-300" />
              LUCCABET VIP HIGH ROLLER
            </div>
            <div className="text-[9px] text-white/60 tracking-wider">
              {tableName.toUpperCase()} • {blinds}
            </div>
          </div>

          {/* Avatar + Forra central */}
          <div className="flex flex-col items-center gap-2 z-10 my-auto">
            <div className="w-16 h-16 rounded-full bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-2xl shadow-[0_0_20px_rgba(251,191,36,0.5)]">
              👑
            </div>

            <div className="text-center">
              <div className="text-base font-black text-white">{username}</div>
              <div className="text-[10px] text-sky-400 font-bold">💎 VIP WHALE</div>
            </div>

            <div className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500/20 via-emerald-500/20 to-amber-500/20 border border-amber-400/60 text-center shadow-lg">
              <div className="text-[10px] font-bold text-emerald-300 uppercase tracking-wide">
                Puxou o Pote
              </div>
              <div className="text-2xl sm:text-3xl font-black text-amber-300 tabular-nums">
                + R$ {displayWin.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            </div>

            {/* Cartas */}
            <div className="flex items-center gap-2 mt-1">
              {cardsToShow.map((c, i) => (
                <div
                  key={i}
                  className="w-11 h-16 bg-white text-black rounded-lg border-2 border-amber-400 flex flex-col items-center justify-center font-black text-sm shadow-md"
                >
                  <span className={c[1] === 'h' || c[1] === 'd' ? 'text-red-600' : 'text-slate-900'}>
                    {c[0].toUpperCase()}
                    {SUIT_SYMBOLS[c[1]]?.char}
                  </span>
                </div>
              ))}
            </div>

            <div className="text-xs font-black text-amber-400 flex items-center gap-1">
              <Trophy className="w-3.5 h-3.5" /> {handName}
            </div>
          </div>

          {/* Frase no rodapé */}
          <div className="z-10 text-center w-full px-2">
            <div className="text-xs italic font-bold text-white/90 bg-black/60 py-1.5 px-3 rounded-lg border border-white/10">
              “{selectedPhrase}”
            </div>
            <div className="text-[9px] text-amber-400/80 font-bold mt-1.5">
              VERIFICADO • HIGH ROLLER CLUB
            </div>
          </div>
        </div>

        {/* Escolher frase de efeito */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-muted-foreground flex items-center gap-1">
            <Flame className="w-3.5 h-3.5 text-amber-400" /> Escolha sua frase de flex:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-28 overflow-y-auto p-1">
            {FLEX_PHRASES.map((phrase, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedPhrase(phrase)}
                className={`text-left text-[11px] p-2 rounded-lg border transition-all ${
                  selectedPhrase === phrase
                    ? 'bg-amber-500/20 border-amber-400 text-amber-200 font-bold'
                    : 'bg-neutral-900/60 border-border text-muted-foreground hover:bg-neutral-800'
                }`}
              >
                {phrase}
              </button>
            ))}
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <Button
            variant="outline"
            className="border-amber-400/50 hover:bg-amber-500/10 text-amber-300 font-bold text-xs h-11"
            onClick={handleCopy}
            disabled={downloading}
          >
            {copied ? <Check className="w-4 h-4 mr-1 text-emerald-400" /> : <Copy className="w-4 h-4 mr-1" />}
            {copied ? 'Copiado!' : 'Copiar p/ Insta'}
          </Button>

          <Button
            className="bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-600 hover:to-yellow-600 text-black font-black text-xs h-11 shadow-lg"
            onClick={handleDownload}
            disabled={downloading}
          >
            <Download className="w-4 h-4 mr-1" />
            {downloading ? 'Gerando...' : 'Baixar Imagem PNG'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PokerStoryModal;
