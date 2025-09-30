import React from 'react';
import { Link } from 'react-router-dom';
import { Zap, Trophy, CircleDot, Plane, Rocket } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Layout from '@/components/Layout';

const Games: React.FC = () => {
  const games = [
    {
      title: 'Mines',
      description: 'Find diamonds and avoid bombs. Configure bomb count and cash out anytime!',
      icon: Zap,
      color: 'from-primary to-primary/60',
      path: '/games/mines',
      odds: 'Up to 50x'
    },
    {
      title: 'Aviator',
      description: 'Watch the plane fly higher! Cash out before it crashes.',
      icon: Plane,
      color: 'from-blue-500 to-blue-600',
      path: '/games/aviator',
      odds: 'Up to 100x'
    },
    {
      title: 'Crash Duplo',
      description: 'Two simultaneous crash games - double your action!',
      icon: Rocket,
      color: 'from-purple-500 to-purple-600',
      path: '/games/crash-duplo',
      odds: 'Up to 50x each'
    },
    {
      title: 'Slots',
      description: 'Spin the reels and match symbols for big wins!',
      icon: Trophy,
      color: 'from-secondary to-secondary/60',
      path: '/games/slots',
      odds: 'Up to 10x'
    },
    {
      title: 'Roulette',
      description: 'Classic casino roulette with multiple betting options.',
      icon: CircleDot,
      color: 'from-accent to-accent/60',
      path: '/games/roulette',
      odds: 'Up to 35x'
    },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold mb-2">Casino Games</h2>
          <p className="text-muted-foreground">Choose your game and start winning!</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {games.map((game) => {
            const Icon = game.icon;
            return (
              <Link key={game.title} to={game.path}>
                <Card className="bet-card h-full hover:scale-105 transition-all">
                  <CardHeader>
                    <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${game.color} flex items-center justify-center mb-4 glow-primary`}>
                      <Icon className="h-8 w-8 text-white" />
                    </div>
                    <CardTitle className="text-2xl">{game.title}</CardTitle>
                    <CardDescription className="text-base">{game.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm text-muted-foreground">Max Win</span>
                      <span className="text-lg font-bold text-secondary">{game.odds}</span>
                    </div>
                    <Button className="w-full glow-primary">Play Now</Button>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </Layout>
  );
};

export default Games;
