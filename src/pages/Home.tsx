import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Gamepad2, TrendingUp, Zap, Trophy } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Layout from '@/components/Layout';
import { supabase } from '@/integrations/supabase/client';
import { formatEURShort } from '@/lib/formatCurrency';

interface CBFDGame {
  id: string;
  team_a: string;
  team_b: string;
  odd: number;
  championship: string;
}

const Home: React.FC = () => {
  const [cbfdGames, setCbfdGames] = useState<CBFDGame[]>([]);

  useEffect(() => {
    loadCBFDGames();
  }, []);

  const loadCBFDGames = async () => {
    const { data, error } = await supabase
      .from('cbfd_games')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setCbfdGames(data);
    }
  };

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
      <div className="space-y-8">
        {/* Hero Section - APOSTE NA CBFD */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-card via-card to-muted border border-border p-8 md:p-12">
          <div className="relative z-10">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="text-gradient">APOSTE NA CBFD</span>
            </h2>
            <p className="text-muted-foreground text-lg mb-6 max-w-xl">
              Plataforma 100% simulada com euros fictícios. Aposte nos jogos da CBFD!
            </p>
            <div className="flex gap-4">
              <Button asChild size="lg" className="glow-primary">
                <Link to="/games">
                  <Gamepad2 className="mr-2 h-5 w-5" />
                  Jogar Agora
                </Link>
              </Button>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-secondary/20 rounded-full blur-3xl"></div>
        </div>

        {/* Jogos de Hoje CBFD */}
        {cbfdGames.length > 0 && (
          <div>
            <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-secondary" />
              Jogos de Hoje CBFD
            </h3>
            <div className="grid gap-4">
              {cbfdGames.map((game) => (
                <Card key={game.id} className="bet-card">
                  <CardContent className="flex items-center justify-between p-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-2 h-2 bg-success rounded-full animate-pulse"></span>
                        <span className="text-sm text-success font-medium">AO VIVO</span>
                        <span className="text-xs text-muted-foreground">• {game.championship}</span>
                      </div>
                      <div className="font-semibold">
                        {game.team_a} <span className="text-muted-foreground">vs</span> {game.team_b}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-secondary">{Number(game.odd).toFixed(2)}x</div>
                        <div className="text-xs text-muted-foreground">Odd</div>
                      </div>
                      <Button className="glow-primary">Apostar</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

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