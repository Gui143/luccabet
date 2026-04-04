import React from 'react';
import { Link } from 'react-router-dom';
import { Zap, Trophy, CircleDot, Plane, Spade, Play, Flame } from 'lucide-react';
import Layout from '@/components/Layout';

const Games: React.FC = () => {
  const games = [
    {
      title: 'Gates of Olympus',
      provider: 'Pragmatic Play',
      icon: Zap,
      gradient: 'from-yellow-600 to-orange-700',
      path: '/games/fortune-tiger',
      odds: 'Até 5000x',
      isNew: true,
    },
    {
      title: 'Aviator',
      provider: 'Spribe',
      icon: Plane,
      gradient: 'from-red-600 to-red-900',
      path: '/games/aviator',
      odds: 'Até 100x',
    },
    {
      title: 'Blackjack',
      provider: 'BrazucaBet',
      icon: Spade,
      gradient: 'from-emerald-700 to-emerald-900',
      path: '/games/blackjack',
      odds: 'Até 2.5x',
    },
    {
      title: 'Baccarat',
      provider: 'BrazucaBet',
      icon: Spade,
      gradient: 'from-purple-700 to-purple-900',
      path: '/games/baccarat',
      odds: 'Até 8x',
      isNew: true,
    },
    {
      title: 'Mines',
      provider: 'BrazucaBet',
      icon: Zap,
      gradient: 'from-cyan-700 to-cyan-900',
      path: '/games/mines',
      odds: 'Até 50x',
    },
    {
      title: 'Slots',
      provider: 'BrazucaBet',
      icon: Trophy,
      gradient: 'from-pink-600 to-pink-900',
      path: '/games/slots',
      odds: 'Até 10x',
    },
    {
      title: 'Roleta',
      provider: 'BrazucaBet',
      icon: CircleDot,
      gradient: 'from-amber-700 to-amber-900',
      path: '/games/roulette',
      odds: 'Até 35x',
    },
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
          {games.map((game) => {
            const Icon = game.icon;
            return (
              <Link key={game.title} to={game.path} className="group">
                <div className="relative overflow-hidden rounded-xl hover-lift">
                  {game.isNew && (
                    <span className="absolute top-2 left-2 z-20 bg-accent text-accent-foreground text-[10px] font-bold px-2 py-0.5 rounded-md">
                      NOVO
                    </span>
                  )}
                  <div className={`aspect-[3/4] bg-gradient-to-b ${game.gradient} rounded-xl flex items-center justify-center relative overflow-hidden`}>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    <Icon className="w-12 h-12 text-white/80 relative z-10 group-hover:scale-110 transition-transform duration-200" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
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
            );
          })}
        </div>
      </div>
    </Layout>
  );
};

export default Games;
