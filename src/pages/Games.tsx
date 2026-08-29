import React from 'react';
import { Link } from 'react-router-dom';
import { Play, Flame } from 'lucide-react';
import Layout from '@/components/Layout';

import gatesImg from '@/assets/games/gates-of-olympus.jpg';
import sweetBonanzaImg from '@/assets/games/sweet-bonanza.jpg';
import aviatorImg from '@/assets/games/aviator.jpg';
import blackjackImg from '@/assets/games/blackjack.jpg';
import baccaratImg from '@/assets/games/baccarat.jpg';
import minesImg from '@/assets/games/mines.jpg';
import slotsImg from '@/assets/games/slots.jpg';
import rouletteImg from '@/assets/games/roulette.jpg';

const Games: React.FC = () => {
  const games = [
    { title: "Gates of Olympus", provider: "Pragmatic Play", image: gatesImg, path: "/games/fortune-tiger", odds: "Até 5000x" },
    { title: "Sweet Bonanza", provider: "Pragmatic Play", image: sweetBonanzaImg, path: "/games/sweet-bonanza", odds: "Até 21.175x", isNew: true },
    { title: 'Aviator', provider: 'Spribe', image: aviatorImg, path: '/games/aviator', odds: 'Até 100x' },
    { title: 'Blackjack', provider: "BrazucaBet", image: blackjackImg, path: '/games/blackjack', odds: 'Até 2.5x', isNew: true },
    { title: 'Baccarat', provider: "BrazucaBet", image: baccaratImg, path: '/games/baccarat', odds: 'Até 8x' },
    { title: 'Mines', provider: "BrazucaBet", image: minesImg, path: '/games/mines', odds: 'Até 50x' },
    { title: 'Slots', provider: "BrazucaBet", image: slotsImg, path: '/games/slots', odds: 'Até 10x' },
    { title: 'Roleta', provider: "BrazucaBet", image: rouletteImg, path: '/games/roulette', odds: 'Até 35x' },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Flame className="h-5 w-5 text-primary" />
            Cassino
          </h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
          {games.map((game) => (
            <Link key={game.title} to={game.path} className="group">
              <div className="relative overflow-hidden rounded-xl hover-lift">
                {game.isNew && (
                  <span className="absolute top-2 left-2 z-20 bg-accent text-accent-foreground text-[10px] font-bold px-2 py-0.5 rounded-md">
                    NOVO
                  </span>
                )}
                <div className="aspect-[3/4] rounded-xl overflow-hidden relative">
                  <img
                    src={game.image}
                    alt={game.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                    width={512}
                    height={680}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-primary/90 flex items-center justify-center">
                      <Play className="w-6 h-6 text-primary-foreground ml-0.5" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-2 px-0.5">
                <p className="text-sm font-semibold truncate">{game.title}</p>
                <p className="text-xs text-muted-foreground truncate">{game.provider}</p>
                <p className="text-xs text-primary font-bold mt-0.5">{game.odds}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default Games;
