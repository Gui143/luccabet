import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const slides = [
  {
    title: '🎰 Jogos da Semana',
    subtitle: 'Os melhores slots e jogos ao vivo com bônus exclusivos',
    gradient: 'from-yellow-600/30 via-orange-700/20 to-transparent',
    tag: 'TOP',
    tagColor: 'bg-red-600',
  },
  {
    title: '✈️ Aviator',
    subtitle: 'Decole com o multiplicador! Retire antes do crash e ganhe até 100x',
    gradient: 'from-red-700/30 via-red-900/20 to-transparent',
    tag: 'HOT',
    tagColor: 'bg-primary',
  },
  {
    title: '💎 Bônus de Boas-Vindas',
    subtitle: 'Cadastre-se agora e ganhe R$ 1.000 de saldo inicial para jogar',
    gradient: 'from-emerald-700/30 via-emerald-900/20 to-transparent',
    tag: 'NOVO',
    tagColor: 'bg-emerald-600',
  },
  {
    title: '⚽ Apostas Esportivas',
    subtitle: 'Aposte nos melhores campeonatos com as melhores odds do mercado',
    gradient: 'from-blue-700/30 via-blue-900/20 to-transparent',
    tag: 'TOP',
    tagColor: 'bg-red-600',
  },
];

const CasinoCarousel: React.FC = () => {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent(c => (c + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const slide = slides[current];

  const goNext = () => setCurrent((current + 1) % slides.length);
  const goPrev = () => setCurrent((current - 1 + slides.length) % slides.length);

  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card h-[140px] sm:h-[180px] group">
      {/* Background gradient */}
      <div className={`absolute inset-0 bg-gradient-to-r ${slide.gradient} transition-all duration-700`} />

      {/* Content */}
      <div className="relative z-10 flex flex-col justify-center h-full px-5 sm:px-8">
        {slide.tag && (
          <span className={`${slide.tagColor} text-white text-[10px] font-bold px-2 py-0.5 rounded-md w-fit mb-2`}>
            {slide.tag}
          </span>
        )}
        <h3 className="text-lg sm:text-2xl font-extrabold mb-1 transition-all duration-500">
          {slide.title}
        </h3>
        <p className="text-xs sm:text-sm text-muted-foreground max-w-lg transition-all duration-500">
          {slide.subtitle}
        </p>
      </div>

      {/* Navigation arrows */}
      <button
        onClick={goPrev}
        className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-secondary/80 border border-border flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <button
        onClick={goNext}
        className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-secondary/80 border border-border flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <ChevronRight className="w-4 h-4" />
      </button>

      {/* Dots */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === current ? 'bg-primary w-5' : 'bg-muted-foreground/30 w-1.5'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default CasinoCarousel;
