import React, { useMemo, useRef, useState, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sparkles, Gamepad2 } from 'lucide-react';
import { soundManager } from '@/lib/soundManager';

// ---------------------------------------------------------------------------
// Textura dos rolos 3D — desenhada em canvas (sem dependência de imagens externas)
// ---------------------------------------------------------------------------
const SYMBOL_GLYPHS = ['7', '♦', '7', '🍒', '7', '♣', '7', '♥', '7', '⭐', '7', 'BAR'];

function makeReelTexture(seed = 0) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  // fundo branco
  ctx.fillStyle = '#f8f4e8';
  ctx.fillRect(0, 0, 256, 1024);

  const cellH = 1024 / SYMBOL_GLYPHS.length;
  SYMBOL_GLYPHS.forEach((glyph, i) => {
    const y = i * cellH;
    // separador
    ctx.strokeStyle = '#d8cfb8';
    ctx.lineWidth = 4;
    ctx.strokeRect(8, y + 8, 240, cellH - 16);

    const isSeven = glyph === '7';
    ctx.save();
    ctx.translate(128, y + cellH / 2);

    if (isSeven) {
      ctx.font = '900 130px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const grad = ctx.createLinearGradient(0, -60, 0, 60);
      grad.addColorStop(0, '#ff5a3c');
      grad.addColorStop(0.5, '#d4112b');
      grad.addColorStop(1, '#8a0a18');
      ctx.fillStyle = grad;
      ctx.shadowColor = 'rgba(255,80,40,0.5)';
      ctx.shadowBlur = 18;
      ctx.fillText('7', 0, 8);
    } else if (glyph === 'BAR') {
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(-64, -34, 128, 68);
      ctx.fillStyle = '#ffd23f';
      ctx.font = '900 42px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('BAR', 0, 4);
    } else {
      ctx.font = '100px "Segoe UI Symbol", Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = glyph === '♦' || glyph === '♥' ? '#e11d48' : '#111';
      ctx.fillText(glyph, 0, 6);
    }
    ctx.restore();
  });

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.offset.y = seed * 0.13;
  return tex;
}

// ---------------------------------------------------------------------------
// Um rolo: cilindro com textura giratória
// ---------------------------------------------------------------------------
interface ReelProps {
  spin: boolean;
  stopDelay: number;
  targetOffset: number;
  onStop: () => void;
}

const Reel: React.FC<ReelProps> = ({ spin, stopDelay, targetOffset, onStop }) => {
  const tex = useMemo(() => makeReelTexture(stopDelay), [stopDelay]);
  const meshRef = useRef<THREE.Mesh>(null);
  const spinningRef = useRef(false);
  const speedRef = useRef(0);
  const stoppedAtRef = useRef(0);
  const calledStop = useRef(false);

  useFrame((_, delta) => {
    if (spin) {
      spinningRef.current = true;
      calledStop.current = false;
      speedRef.current = Math.min(speedRef.current + delta * 5, 14);
      stoppedAtRef.current = 0;
    }

    if (spinningRef.current && meshRef.current) {
      // o cilindro está deitado (eixo X); girar em X faz os símbolos rolarem
      meshRef.current.rotation.x -= speedRef.current * delta;

      if (!spin) {
        if (stoppedAtRef.current === 0) stoppedAtRef.current = performance.now();
        speedRef.current = Math.max(0, speedRef.current - delta * 6);

        const elapsed = performance.now() - stoppedAtRef.current;
        if (elapsed >= stopDelay && speedRef.current < 0.4) {
          // encaixa no "7": alinha o ângulo num múltiplo que centraliza um 7
          const step = (Math.PI * 2) / SYMBOL_GLYPHS.length;
          // índice do "7" central mais próximo do ângulo atual
          const target7Index = SYMBOL_GLYPHS.indexOf('7');
          const targetAngle = -target7Index * step;
          const twoPi = Math.PI * 2;
          let current = meshRef.current.rotation.x % twoPi;
          if (current < 0) current += twoPi;
          const desired = ((targetAngle % twoPi) + twoPi) % twoPi;
          let diff = desired - current;
          if (diff > Math.PI) diff -= twoPi;
          if (diff < -Math.PI) diff += twoPi;
          meshRef.current.rotation.x += diff;

          speedRef.current = 0;
          spinningRef.current = false;
          if (!calledStop.current) {
            calledStop.current = true;
            onStop();
          }
        }
      }
    }
  });

  return (
    <mesh ref={meshRef} rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[0.6, 0.6, 1.1, 32, 1, true]} />
      <meshStandardMaterial
        map={tex}
        side={THREE.DoubleSide}
        roughness={0.3}
        metalness={0.15}
      />
    </mesh>
  );
};

// ---------------------------------------------------------------------------
// Moeda flutuante
// ---------------------------------------------------------------------------
const Coin: React.FC<{ position: [number, number, number] }> = ({ position }) => {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.y = state.clock.elapsedTime * 2 + position[0];
    ref.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 1.5 + position[2]) * 0.15;
  });
  return (
    <mesh ref={ref} position={position}>
      <cylinderGeometry args={[0.18, 0.18, 0.05, 20]} />
      <meshStandardMaterial color="#ffd23f" metalness={0.9} roughness={0.2} emissive="#7a5200" emissiveIntensity={0.3} />
    </mesh>
  );
};

// ---------------------------------------------------------------------------
// Máquina completa
// ---------------------------------------------------------------------------
const SlotMachine: React.FC<{ spinning: boolean; onReelStop: () => void }> = ({ spinning, onReelStop }) => {
  const stopsRef = useRef(0);
  const [spinKey, setSpinKey] = useState(0);

  React.useEffect(() => {
    if (spinning) {
      stopsRef.current = 0;
      setSpinKey(k => k + 1);
    }
  }, [spinning]);

  const handleStop = useCallback(() => {
    stopsRef.current += 1;
    if (stopsRef.current >= 3) onReelStop();
  }, [onReelStop]);

  // offsets que param um "7" no centro
  const targets = [0.5 / SYMBOL_GLYPHS.length, 0, 0];

  return (
    <group position={[0, -0.3, 0]}>
      {/* corpo */}
      <RoundedBox args={[3.1, 3.3, 1.6]} radius={0.18} smoothness={4} position={[0, 0, 0]} castShadow>
        <meshStandardMaterial color="#8e0e24" roughness={0.35} metalness={0.4} />
      </RoundedBox>
      {/* moldura dourada */}
      <RoundedBox args={[2.55, 1.7, 0.25]} radius={0.1} smoothness={4} position={[0, 0.35, 0.78]}>
        <meshStandardMaterial color="#ffd23f" metalness={0.9} roughness={0.25} />
      </RoundedBox>
      {/* painel preto dos rolos */}
      <RoundedBox args={[2.3, 1.45, 0.12]} radius={0.06} smoothness={4} position={[0, 0.35, 0.86]}>
        <meshStandardMaterial color="#140408" roughness={0.6} />
      </RoundedBox>

      {/* rolos (cilindros deitados, lado a lado na horizontal) */}
      <group position={[0, 0.35, 0.96]}>
        {[-0.72, 0, 0.72].map((x, i) => (
          <group key={`${spinKey}-${i}`} position={[x, 0, 0]}>
            <Reel spin={spinning} stopDelay={600 + i * 500} targetOffset={targets[i] + i * 0.01} onStop={handleStop} />
          </group>
        ))}
      </group>

      {/* topo com letreiro */}
      <RoundedBox args={[2.2, 0.55, 0.2]} radius={0.08} smoothness={4} position={[0, 1.75, 0.82]}>
        <meshStandardMaterial color="#1a0510" emissive="#ff2d55" emissiveIntensity={0.5} roughness={0.4} />
      </RoundedBox>

      {/* alavanca */}
      <group position={[1.65, 0.2, 0.1]}>
        <mesh position={[0, 0.35, 0]}>
          <cylinderGeometry args={[0.06, 0.06, 0.9, 12]} />
          <meshStandardMaterial color="#e8e8e8" metalness={0.9} roughness={0.2} />
        </mesh>
        <mesh position={[0, 0.85, 0]}>
          <sphereGeometry args={[0.16, 20, 20]} />
          <meshStandardMaterial color="#ff2d55" roughness={0.3} emissive="#7a0020" emissiveIntensity={0.4} />
        </mesh>
      </group>

      {/* base / bandeja */}
      <RoundedBox args={[2.6, 0.35, 1.3]} radius={0.1} smoothness={4} position={[0, -1.7, 0.1]}>
        <meshStandardMaterial color="#5c0818" roughness={0.4} metalness={0.4} />
      </RoundedBox>

      {/* moedas flutuantes */}
      <Float speed={3} rotationIntensity={1.2} floatIntensity={1.5}>
        <Coin position={[-2.1, 1.3, 0.2]} />
      </Float>
      <Float speed={2.4} rotationIntensity={1} floatIntensity={1.8}>
        <Coin position={[2.2, 1.6, -0.3]} />
      </Float>
      <Float speed={3.4} rotationIntensity={1.4} floatIntensity={1.4}>
        <Coin position={[-2.3, -0.4, -0.5]} />
      </Float>
      <Float speed={2.8} rotationIntensity={1.2} floatIntensity={1.6}>
        <Coin position={[2.4, -0.8, 0.4]} />
      </Float>
    </group>
  );
};

// ---------------------------------------------------------------------------
// Seção 3D interativa
// ---------------------------------------------------------------------------
const Slot3DSection: React.FC = () => {
  const [spinning, setSpinning] = useState(false);
  const [jackpot, setJackpot] = useState(false);
  const [spins, setSpins] = useState(0);

  const pullLever = () => {
    if (spinning) return;
    setJackpot(false);
    setSpinning(true);
    setSpins(s => s + 1);
    soundManager.playBet();
  };

  const handleReelStop = () => {
    setSpinning(false);
    setJackpot(true);
    soundManager.playWin();
  };

  return (
    <section className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-b from-[#2a0a12] via-[#18060c] to-[#0d0306]">
      {/* brilho de fundo */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 70% 60% at 50% 30%, rgba(255,60,90,0.15), transparent 70%)' }} />

      <div className="relative z-10 flex flex-col lg:flex-row items-center">
        {/* cena 3D */}
        <div className="w-full lg:w-1/2 h-[340px] sm:h-[420px]">
          <Canvas
            camera={{ position: [0, 0.2, 6.2], fov: 42 }}
            dpr={[1, 2]}
            gl={{ antialias: true, alpha: true }}
          >
            <ambientLight intensity={0.65} />
            <directionalLight position={[4, 6, 5]} intensity={1.1} color="#ffd9a0" />
            <pointLight position={[4, 2, 4]} intensity={1.5} color="#ffd9a0" />
            <pointLight position={[-4, 2, 3]} intensity={0.9} color="#ff4d6d" />
            <pointLight position={[0, -2, 3]} intensity={0.6} color="#ffaa3c" />
            <spotLight position={[0, 6, 4]} angle={0.5} intensity={1.3} color="#fff3d6" />
            <SlotMachine spinning={spinning} onReelStop={handleReelStop} />
          </Canvas>
        </div>

        {/* texto / CTA */}
        <div className="flex-1 px-6 pb-8 lg:pb-0 lg:pr-10 text-center lg:text-left">
          <div className="inline-flex items-center gap-1.5 bg-primary/15 border border-primary/30 text-primary text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full mb-3">
            <Sparkles className="w-3.5 h-3.5" /> Experiência 3D interativa
          </div>
          <h2 className="text-2xl sm:text-4xl font-black mb-2 leading-tight">
            Puxe a alavanca do <span className="text-primary">777</span>
          </h2>
          <p className="text-sm sm:text-base text-white/60 mb-5 max-w-md mx-auto lg:mx-0">
            Nossa sala de caça-níqueis em 3D roda direto no navegador. Gire os rolos,
            sinta as moedas e caça o jackpot — depois jogue de verdade nos slots.
          </p>

          <div className="flex flex-wrap gap-3 justify-center lg:justify-start">
            <Button
              onClick={pullLever}
              disabled={spinning}
              size="lg"
              className="font-black text-base h-12 px-6 rounded-xl bg-gradient-to-b from-red-500 to-red-700 hover:brightness-110 shadow-[0_5px_0_rgba(0,0,0,0.4)] active:translate-y-0.5 transition-all disabled:opacity-60"
            >
              {spinning ? '🎰 Girando...' : '🎰 Girar (3D)'}
            </Button>
            <Button asChild variant="outline" size="lg" className="h-12 px-6 rounded-xl border-primary/40 text-primary hover:bg-primary/10 font-bold">
              <Link to="/games/sweet-bonanza"><Gamepad2 className="mr-2 h-4 w-4" /> Jogar Sweet Bonanza</Link>
            </Button>
          </div>

          {jackpot && (
            <div className="mt-4 inline-block px-4 py-2 rounded-lg bg-primary text-primary-foreground font-black text-sm animate-pulse">
              🎉 777 JACKPOT! Você ganhou na sorte!
            </div>
          )}
          {spins > 0 && !jackpot && !spinning && (
            <p className="mt-3 text-xs text-white/40">Giros 3D: {spins}</p>
          )}
        </div>
      </div>
    </section>
  );
};

export default Slot3DSection;
