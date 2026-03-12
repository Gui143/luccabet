import React, { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';

export interface AviatorCanvasHandle {
  draw: (multiplier: number, crash: number, crashed: boolean) => void;
}

const AviatorCanvas = forwardRef<AviatorCanvasHandle>((_, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const drawCanvas = (multiplier: number, crash: number, crashed: boolean) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const W = canvas.offsetWidth;
    const H = canvas.offsetHeight;

    if (canvas.width !== W * dpr || canvas.height !== H * dpr) {
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, W, H);

    // Grid with green tint
    ctx.strokeStyle = 'rgba(0,155,58,0.08)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 10; i++) {
      const y = (H / 10) * i;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      const x = (W / 10) * i;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }

    // Exponential curve progress
    const maxMult = Math.max(crash, multiplier, 2);
    const progress = Math.min((multiplier - 1) / (maxMult - 1), 1);
    const points: [number, number][] = [];

    ctx.shadowBlur = 15;
    ctx.shadowColor = crashed ? 'rgba(239,68,68,0.9)' : 'rgba(0,155,58,0.5)';
    ctx.strokeStyle = crashed ? '#ef4444' : '#009B3A';
    ctx.lineWidth = 3;
    ctx.beginPath();

    const steps = 200;
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * progress;
      const x = t * W * 0.9 + W * 0.05;
      const y = H - H * 0.1 - (H * 0.75 * Math.pow(t, 1.3));
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      points.push([x, y]);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Fill under curve
    if (points.length > 1) {
      ctx.beginPath();
      ctx.moveTo(points[0][0], H);
      points.forEach(([x, y]) => ctx.lineTo(x, y));
      ctx.lineTo(points[points.length - 1][0], H);
      ctx.closePath();
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, crashed ? 'rgba(239,68,68,0.12)' : 'rgba(0,155,58,0.12)');
      grad.addColorStop(1, 'rgba(0,155,58,0.01)');
      ctx.fillStyle = grad;
      ctx.fill();
    }

    // Plane
    if (!crashed && points.length > 1) {
      const [px, py] = points[points.length - 1];
      const [px2, py2] = points.length > 3 ? points[points.length - 4] : points[0];
      const angle = Math.atan2(py2 - py, px - px2);

      const planeScale = Math.max(1.2, Math.min(W / 350, 1.8));

      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(-angle);
      ctx.scale(planeScale, planeScale);

      // Exhaust
      for (let i = 0; i < 8; i++) {
        const alpha = 0.6 - i * 0.07;
        const size = 4 - i * 0.4;
        ctx.fillStyle = `rgba(254,223,0,${Math.max(0, alpha)})`;
        ctx.beginPath();
        ctx.arc(-22 - i * 7 + Math.random() * 3, (Math.random() - 0.5) * 6, Math.max(0.5, size), 0, Math.PI * 2);
        ctx.fill();
      }

      // Body
      ctx.shadowBlur = 25;
      ctx.shadowColor = 'rgba(0,155,58,0.8)';
      ctx.fillStyle = '#009B3A';
      ctx.beginPath();
      ctx.ellipse(0, 0, 22, 7, 0, 0, Math.PI * 2);
      ctx.fill();

      // Wings
      ctx.fillStyle = '#007B2E';
      ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(-22, 14); ctx.lineTo(-14, 0); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(-22, -14); ctx.lineTo(-14, 0); ctx.closePath(); ctx.fill();

      // Tail
      ctx.fillStyle = '#FEDF00';
      ctx.beginPath(); ctx.moveTo(-18, 0); ctx.lineTo(-26, 8); ctx.lineTo(-22, 0); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-18, 0); ctx.lineTo(-26, -8); ctx.lineTo(-22, 0); ctx.closePath(); ctx.fill();

      // Cockpit
      ctx.fillStyle = '#ffffff';
      ctx.shadowBlur = 10;
      ctx.shadowColor = 'rgba(255,255,255,0.6)';
      ctx.beginPath();
      ctx.ellipse(16, 0, 5, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.restore();
    }

    // Explosion
    if (crashed && points.length > 1) {
      const [px, py] = points[points.length - 1];
      for (let i = 0; i < 12; i++) {
        const r = Math.random() * 30 + 5;
        const a = Math.random() * Math.PI * 2;
        ctx.fillStyle = `rgba(239,${Math.floor(68 + Math.random() * 100)},68,${0.7 - i * 0.05})`;
        ctx.beginPath();
        ctx.arc(px + Math.cos(a) * r, py + Math.sin(a) * r, 3 + Math.random() * 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  };

  useImperativeHandle(ref, () => ({ draw: drawCanvas }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onResize = () => drawCanvas(1, 2, false);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-[300px] sm:h-[400px]"
      style={{ imageRendering: 'auto', display: 'block' }}
    />
  );
});

AviatorCanvas.displayName = 'AviatorCanvas';
export default AviatorCanvas;
