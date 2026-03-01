import React, { useState, useEffect } from 'react';

const slides = [
  {
    title: '🎰 Slots Premium',
    subtitle: 'Gire e ganhe grandes prêmios nos melhores slots da plataforma',
    gradient: 'from-primary/40 via-primary/20 to-transparent',
  },
  {
    title: '🃏 Cassino ao Vivo',
    subtitle: 'Experimente a emoção de um cassino real com dealers profissionais',
    gradient: 'from-amber-900/40 via-amber-900/20 to-transparent',
  },
  {
    title: '✈️ Aviator',
    subtitle: 'Decole com o multiplicador e retire antes do crash!',
    gradient: 'from-red-900/40 via-red-900/20 to-transparent',
  },
  {
    title: '💎 Mines',
    subtitle: 'Encontre diamantes e multiplique seus ganhos até 25x',
    gradient: 'from-emerald-900/40 via-emerald-900/20 to-transparent',
  },
];

const CasinoCarousel: React.FC = () => {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent(c => (c + 1) % slides.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const slide = slides[current];

  return (
    <div className="relative overflow-hidden rounded-lg border border-border bg-card h-[140px] sm:h-[180px]">
      {/* Background gradient */}
      <div className={`absolute inset-0 bg-gradient-to-r ${slide.gradient} transition-all duration-700`} />

      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-1/2 w-48 h-24 bg-primary/5 rounded-full blur-3xl" />

      {/* Content */}
      <div className="relative z-10 flex flex-col justify-center h-full px-6 sm:px-10">
        <h3 className="text-xl sm:text-2xl font-extrabold mb-1 transition-all duration-500">
          {slide.title}
        </h3>
        <p className="text-sm sm:text-base text-muted-foreground max-w-md transition-all duration-500">
          {slide.subtitle}
        </p>
      </div>

      {/* Dots */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              i === current ? 'bg-primary w-5' : 'bg-muted-foreground/30'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default CasinoCarousel;
