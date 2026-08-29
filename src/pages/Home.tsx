import React from 'react';
import { Link } from 'react-router-dom';
import { Gamepad2, Play, ChevronRight, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Layout from '@/components/Layout';
import BettingMarkets from '@/components/betting/BettingMarkets';
import CasinoCarousel from '@/components/CasinoCarousel';
import DailySpin from '@/components/DailySpin';
import Leaderboard from '@/components/Leaderboard';

import gatesImg from '@/assets/games/gates-of-olympus.jpg';
import sweetBonanzaImg from '@/assets/games/sweet-bonanza.jpg';
import aviatorImg from '@/assets/games/aviator.jpg';
import blackjackImg from '@/assets/games/blackjack.jpg';
import baccaratImg from '@/assets/games/baccarat.jpg';
import minesImg from '@/assets/games/mines.jpg';
import slotsImg from '@/assets/games/slots.jpg';
import rouletteImg from '@/assets/games/roulette.jpg';

const Home: React.FC = () => {
  const popularGames = [
    { title: 'Gates of Olympus', provider: 'Pragmatic Play', path: '/games/fortune-tiger', image: gatesImg },
    { title: 'Sweet Bonanza', provider: 'Pragmatic Play', path: '/games/sweet-bonanza', image: sweetBonanzaImg },
    { title: 'Aviator', provider: 'Spribe', path: '/games/aviator', image: aviatorImg },
    { title: 'Blackjack', provider: 'BrazucaBet', path: '/games/blackjack', image: blackjackImg },
    { title: 'Baccarat', provider: 'BrazucaBet', path: '/games/baccarat', image: baccaratImg },
    { title: 'Mines', provider: 'BrazucaBet', path: '/games/mines', image: minesImg },
    { title: 'Slots', provider: 'BrazucaBet', path: '/games/slots', image: slotsImg },
    { title: 'Roleta', provider: 'BrazucaBet', path: '/games/roulette', image: rouletteImg },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        <CasinoCarousel />
        <BettingMarkets />

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
              <Flame className="h-5 w-5 text-primary" />
              Melhor agora
            </h2>
            <Link to="/games" className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1 transition-colors">
              Ver Tudo <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-3">
            {popularGames.map((game) => (
              <Link key={game.title} to={game.path} className="group">
                <div className="relative overflow-hidden rounded-xl hover-lift">
                  <div className="aspect-[3/4] rounded-xl overflow-hidden relative">
                    <img
                      src={game.image}
                      alt={game.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                      width={512}
                      height={680}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full bg-primary/90 flex items-center justify-center">
                        <Play className="w-5 h-5 text-primary-foreground ml-0.5" />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-1.5 px-0.5">
                  <p className="text-xs font-semibold truncate">{game.title}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{game.provider}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-card via-card to-secondary border border-border p-5 sm:p-8">
          <div className="relative z-10">
            <h2 className="text-xl sm:text-3xl font-extrabold mb-2">
              <span className="text-primary">APOSTE</span> E GANHE
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base mb-4 max-w-md">
              Jogue nos melhores jogos de cassino da BrazucaBet.
            </p>
            <div className="flex gap-3 flex-wrap">
              <Button asChild size="sm" className="font-bold">
                <Link to="/games"><Gamepad2 className="mr-2 h-4 w-4" />Jogar Agora</Link>
              </Button>
              <DailySpin />
            </div>
          </div>
          <div className="absolute top-0 right-0 w-40 h-40 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-accent/5 rounded-full blur-3xl" />
        </div>

        <Leaderboard />
      </div>
    </Layout>
  );
};

export default Home;
