import React from 'react';
import { Link } from 'react-router-dom';
import { Gamepad2, TrendingUp, Zap, Trophy } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Layout from '@/components/Layout';

const Home: React.FC = () => {
  const gameCategories = [
    {
      title: 'Mines',
      description: 'Find diamonds, avoid bombs',
      icon: Zap,
      color: 'from-primary to-primary/60',
      path: '/games/mines'
    },
    {
      title: 'Slots',
      description: 'Spin to win big jackpots',
      icon: Trophy,
      color: 'from-secondary to-secondary/60',
      path: '/games/slots'
    },
    {
      title: 'Roulette',
      description: 'Classic casino experience',
      icon: TrendingUp,
      color: 'from-accent to-accent/60',
      path: '/games/roulette'
    },
  ];

  const liveMatches = [
    { team1: 'Man City', team2: 'Arsenal', odds: 2.5, sport: 'Football' },
    { team1: 'Lakers', team2: 'Warriors', odds: 1.8, sport: 'Basketball' },
    { team1: 'Real Madrid', team2: 'Barcelona', odds: 3.2, sport: 'Football' },
  ];

  return (
    <Layout>
      <div className="space-y-8">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-card via-card to-muted border border-border p-8 md:p-12">
          <div className="relative z-10">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="text-gradient">Premium Betting</span>
              <br />
              Experience
            </h2>
            <p className="text-muted-foreground text-lg mb-6 max-w-xl">
              Play exciting casino games and bet on your favorite sports with the best odds
            </p>
            <div className="flex gap-4">
              <Button asChild size="lg" className="glow-primary">
                <Link to="/games">
                  <Gamepad2 className="mr-2 h-5 w-5" />
                  Play Games
                </Link>
              </Button>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-secondary/20 rounded-full blur-3xl"></div>
        </div>

        {/* Casino Games */}
        <div>
          <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Gamepad2 className="h-6 w-6 text-primary" />
            Casino Games
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {gameCategories.map((game) => {
              const Icon = game.icon;
              return (
                <Link key={game.title} to={game.path}>
                  <Card className="bet-card h-full hover:scale-105 transition-transform">
                    <CardHeader>
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${game.color} flex items-center justify-center mb-4`}>
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <CardTitle>{game.title}</CardTitle>
                      <CardDescription>{game.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button className="w-full" variant="outline">Play Now</Button>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Live Sports */}
        <div>
          <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-secondary" />
            Live Sports Betting
          </h3>
          <div className="grid gap-4">
            {liveMatches.map((match, index) => (
              <Card key={index} className="bet-card">
                <CardContent className="flex items-center justify-between p-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-2 h-2 bg-success rounded-full animate-pulse"></span>
                      <span className="text-sm text-success font-medium">LIVE</span>
                      <span className="text-xs text-muted-foreground">• {match.sport}</span>
                    </div>
                    <div className="font-semibold">
                      {match.team1} <span className="text-muted-foreground">vs</span> {match.team2}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-secondary">{match.odds}x</div>
                      <div className="text-xs text-muted-foreground">Odds</div>
                    </div>
                    <Button className="glow-primary">Bet Now</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Home;
