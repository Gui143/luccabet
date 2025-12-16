import React from 'react';
import { Link } from 'react-router-dom';
import { Gamepad2, Zap, Trophy, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Layout from '@/components/Layout';
import CBFDBetting from '@/components/CBFDBetting';

const Home: React.FC = () => {
  const gameCategories = [
    {
      title: 'Mines',
      description: 'Encontre diamantes, evite bombas',
      icon: Zap,
      color: 'from-primary to-primary/60',
      path: '/games/mines'
    },
    {
      title: 'Slots',
      description: 'Gire e ganhe jackpots',
      icon: Trophy,
      color: 'from-secondary to-secondary/60',
      path: '/games/slots'
    },
    {
      title: 'Roulette',
      description: 'Experiência clássica de cassino',
      icon: TrendingUp,
      color: 'from-accent to-accent/60',
      path: '/games/roulette'
    },
  ];

  return (
    <Layout>
      <div className="space-y-6 sm:space-y-8">
        {/* APOSTE EM TIMES DA CBFD - Main Section at TOP */}
        <CBFDBetting />

        {/* Hero Section - APOSTE NA CBFD */}
        <div className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-card via-card to-muted border border-border p-4 sm:p-8 md:p-12">
          <div className="relative z-10">
            <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4">
              <span className="text-gradient">APOSTE NA CBFD</span>
            </h2>
            <p className="text-muted-foreground text-sm sm:text-lg mb-4 sm:mb-6 max-w-xl">
              Plataforma 100% simulada com euros fictícios. Aposte nos jogos da CBFD!
            </p>
            <div className="flex gap-3 sm:gap-4">
              <Button asChild size="default" className="glow-primary text-sm sm:text-base h-10 sm:h-11">
                <Link to="/games">
                  <Gamepad2 className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                  Jogar Agora
                </Link>
              </Button>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-32 sm:w-64 h-32 sm:h-64 bg-primary/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-32 sm:w-64 h-32 sm:h-64 bg-secondary/20 rounded-full blur-3xl"></div>
        </div>

        {/* Casino Games */}
        <div>
          <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Gamepad2 className="h-6 w-6 text-primary" />
            Jogos de Cassino
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {gameCategories.map((game) => {
              const Icon = game.icon;
              return (
                <Link key={game.title} to={game.path}>
                  <Card className="bet-card h-full hover:scale-105 transition-transform">
                    <CardHeader>
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${game.color} flex items-center justify-center mb-4`}>
                        <Icon className="h-6 w-6 text-primary-foreground" />
                      </div>
                      <CardTitle>{game.title}</CardTitle>
                      <CardDescription>{game.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button className="w-full" variant="outline">Jogar</Button>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Home;
