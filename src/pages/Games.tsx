import React from 'react';
import { Link } from 'react-router-dom';
import { Zap, Trophy, CircleDot, Plane, Cat, Spade } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Layout from '@/components/Layout';

const Games: React.FC = () => {
  const games = [
    {
      title: 'Baccarat do Macedo',
      description: 'Aposte no Jogador, Banqueiro ou Empate!',
      icon: Spade,
      color: 'from-accent to-primary/60',
      path: '/games/baccarat',
      odds: 'Até 8x',
      isNew: true
    },
    {
      title: 'Blackjack',
      description: 'Chegue o mais perto de 21 sem estourar!',
      icon: Spade,
      color: 'from-primary to-primary/60',
      path: '/games/blackjack',
      odds: 'Até 2.5x',
    },
    {
      title: 'Fortune Tiger',
      description: 'O tigre da fortuna! Gire os rolos e ganhe prêmios.',
      icon: Cat,
      color: 'from-accent to-accent/60',
      path: '/games/fortune-tiger',
      odds: 'Até 50x',
    },
    {
      title: 'Mines',
      description: 'Encontre diamantes e evite bombas. Saque a qualquer momento!',
      icon: Zap,
      color: 'from-primary to-primary/50',
      path: '/games/mines',
      odds: 'Até 50x'
    },
    {
      title: 'Aviator',
      description: 'Veja o avião subir! Saque antes de cair.',
      icon: Plane,
      color: 'from-primary/70 to-primary/30',
      path: '/games/aviator',
      odds: 'Até 100x'
    },
    {
      title: 'Slots',
      description: 'Gire os rolos e combine símbolos para ganhar!',
      icon: Trophy,
      color: 'from-primary/60 to-primary/30',
      path: '/games/slots',
      odds: 'Até 10x'
    },
    {
      title: 'Roleta',
      description: 'Roleta clássica com múltiplas opções de aposta.',
      icon: CircleDot,
      color: 'from-primary to-primary/40',
      path: '/games/roulette',
      odds: 'Até 35x'
    },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold mb-2">Jogos de Cassino</h2>
          <p className="text-muted-foreground">Escolha seu jogo e comece a ganhar!</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {games.map((game) => {
            const Icon = game.icon;
            return (
              <Link key={game.title} to={game.path}>
                <Card className="bet-card h-full hover:scale-[1.02] transition-all relative">
                  {game.isNew && (
                    <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs font-bold px-2 py-1 rounded-full z-10">
                      NOVO
                    </div>
                  )}
                  <CardHeader>
                    <div className={`w-14 h-14 rounded-lg bg-gradient-to-br ${game.color} flex items-center justify-center mb-3`}>
                      <Icon className="h-7 w-7 text-primary-foreground" />
                    </div>
                    <CardTitle className="text-xl">{game.title}</CardTitle>
                    <CardDescription>{game.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm text-muted-foreground">Ganho Máx.</span>
                      <span className="text-lg font-bold text-primary">{game.odds}</span>
                    </div>
                    <Button className="w-full">Jogar Agora</Button>
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
