import React from 'react';
import { Link } from 'react-router-dom';
import { Gamepad2, Zap, Trophy, TrendingUp, Plane, Cat, Spade } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Layout from '@/components/Layout';
import BettingMarkets from '@/components/betting/BettingMarkets';
import CasinoCarousel from '@/components/CasinoCarousel';
import DailySpin from '@/components/DailySpin';
import Leaderboard from '@/components/Leaderboard';

const Home: React.FC = () => {
  const gameCategories = [
    { title: 'Blackjack', description: 'Chegue perto de 21', icon: Spade, color: 'from-primary to-primary/60', path: '/games/blackjack' },
    { title: 'Baccarat', description: 'Aposte no Jogador ou Banqueiro', icon: Spade, color: 'from-accent to-primary/60', path: '/games/baccarat', isNew: true },
    { title: 'Mines', description: 'Encontre diamantes, evite bombas', icon: Zap, color: 'from-primary to-primary/60', path: '/games/mines' },
    { title: 'Slots', description: 'Gire e ganhe jackpots', icon: Trophy, color: 'from-primary/80 to-primary/40', path: '/games/slots' },
    { title: 'Roulette', description: 'Experiência clássica de cassino', icon: TrendingUp, color: 'from-primary/60 to-primary/30', path: '/games/roulette' },
    { title: 'Aviator', description: 'Decole e retire antes do crash', icon: Plane, color: 'from-primary to-destructive/60', path: '/games/aviator' },
    { title: 'Fortune Tiger', description: 'O tigre da sorte', icon: Cat, color: 'from-accent/80 to-primary/40', path: '/games/fortune-tiger' },
  ];

  return (
    <Layout>
      <div className="space-y-6 sm:space-y-8">
        <BettingMarkets />
        <CasinoCarousel />

        {/* Daily Spin + Banner */}
        <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-card via-card to-muted border border-border p-4 sm:p-8 md:p-12">
          <div className="relative z-10">
            <h2 className="text-2xl sm:text-4xl md:text-5xl font-extrabold mb-3 sm:mb-4">
              <span className="text-gradient">APOSTE E GANHE</span>
            </h2>
            <p className="text-muted-foreground text-sm sm:text-lg mb-4 sm:mb-6 max-w-xl">
              Aposte nos melhores jogos de cassino da plataforma BrazucaBet.
            </p>
            <div className="flex gap-3 sm:gap-4 flex-wrap">
              <Button asChild className="h-10 sm:h-11 text-sm sm:text-base">
                <Link to="/games"><Gamepad2 className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />Jogar Agora</Link>
              </Button>
              <DailySpin />
            </div>
          </div>
          <div className="absolute top-0 right-0 w-32 sm:w-64 h-32 sm:h-64 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-32 sm:w-64 h-32 sm:h-64 bg-accent/5 rounded-full blur-3xl" />
        </div>

        {/* Games + Leaderboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Gamepad2 className="h-6 w-6 text-primary" />
              Jogos de Cassino
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {gameCategories.map((game) => {
                const Icon = game.icon;
                return (
                  <Link key={game.title} to={game.path}>
                    <Card className="bet-card h-full hover:scale-[1.02] transition-transform relative">
                      {(game as any).isNew && (
                        <div className="absolute -top-2 -right-2 bg-accent text-accent-foreground text-[10px] font-bold px-2 py-0.5 rounded-full z-10 animate-pulse shadow-lg">
                          NOVO
                        </div>
                      )}
                      <CardHeader className="pb-2">
                        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${game.color} flex items-center justify-center mb-2`}>
                          <Icon className="h-5 w-5 text-primary-foreground" />
                        </div>
                        <CardTitle className="text-sm">{game.title}</CardTitle>
                        <CardDescription className="text-xs">{game.description}</CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <Button className="w-full h-8 text-xs" variant="outline">Jogar</Button>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </div>
          <div>
            <Leaderboard />
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Home;
