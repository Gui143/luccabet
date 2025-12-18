import React from 'react';
import { Link } from 'react-router-dom';
import { Zap, Trophy, CircleDot, Plane, Rocket, Cat, Goal } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Layout from '@/components/Layout';

const Games: React.FC = () => {
  const games = [
    {
      title: 'Fortune Tiger',
      description: 'O tigre da fortuna! Gire os rolos e ganhe prêmios.',
      icon: Cat,
      color: 'from-yellow-500 to-red-500',
      path: '/games/fortune-tiger',
      odds: 'Até 50x',
      isNew: true
    },
    {
      title: 'Penalty Burrows',
      description: 'Cobre pênaltis e vença o goleiro! Estilo 3D cartoon.',
      icon: Goal,
      color: 'from-green-500 to-green-600',
      path: '/games/penalty-burrows',
      odds: 'Até 2x',
      isNew: true
    },
    {
      title: 'Mines',
      description: 'Encontre diamantes e evite bombas. Configure e saque a qualquer momento!',
      icon: Zap,
      color: 'from-primary to-primary/60',
      path: '/games/mines',
      odds: 'Até 50x'
    },
    {
      title: 'Aviator',
      description: 'Veja o avião subir! Saque antes de cair.',
      icon: Plane,
      color: 'from-blue-500 to-blue-600',
      path: '/games/aviator',
      odds: 'Até 100x'
    },
    {
      title: 'Crash Duplo',
      description: 'Dois jogos crash simultâneos - dobre a ação!',
      icon: Rocket,
      color: 'from-purple-500 to-purple-600',
      path: '/games/crash-duplo',
      odds: 'Até 50x cada'
    },
    {
      title: 'Slots',
      description: 'Gire os rolos e combine símbolos para ganhar!',
      icon: Trophy,
      color: 'from-secondary to-secondary/60',
      path: '/games/slots',
      odds: 'Até 10x'
    },
    {
      title: 'Roleta',
      description: 'Roleta clássica com múltiplas opções de aposta.',
      icon: CircleDot,
      color: 'from-accent to-accent/60',
      path: '/games/roulette',
      odds: 'Até 35x'
    },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold mb-2">Jogos de Cassino</h2>
          <p className="text-muted-foreground">Escolha seu jogo e comece a ganhar! 100% simulado.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {games.map((game) => {
            const Icon = game.icon;
            return (
              <Link key={game.title} to={game.path}>
                <Card className="bet-card h-full hover:scale-105 transition-all relative">
                  {game.isNew && (
                    <div className="absolute -top-2 -right-2 bg-secondary text-secondary-foreground text-xs font-bold px-2 py-1 rounded-full z-10">
                      NOVO
                    </div>
                  )}
                  <CardHeader>
                    <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${game.color} flex items-center justify-center mb-4 glow-primary`}>
                      <Icon className="h-8 w-8 text-white" />
                    </div>
                    <CardTitle className="text-2xl">{game.title}</CardTitle>
                    <CardDescription className="text-base">{game.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm text-muted-foreground">Ganho Máx.</span>
                      <span className="text-lg font-bold text-secondary">{game.odds}</span>
                    </div>
                    <Button className="w-full glow-primary">Jogar Agora</Button>
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