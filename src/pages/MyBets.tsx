import React from 'react';
import { Trophy, TrendingDown, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Layout from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';

const MyBets: React.FC = () => {
  const { getBetHistory } = useAuth();
  const bets = getBetHistory();

  const totalBets = bets.length;
  const totalWagered = bets.reduce((sum, bet) => sum + bet.amount, 0);
  const totalProfit = bets.reduce((sum, bet) => sum + bet.profit, 0);
  const wins = bets.filter(bet => bet.result === 'win').length;

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold mb-2">My Bets</h2>
          <p className="text-muted-foreground">Track your betting history and performance</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="card-gradient border-border">
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground mb-1">Total Bets</div>
              <div className="text-2xl font-bold">{totalBets}</div>
            </CardContent>
          </Card>

          <Card className="card-gradient border-border">
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground mb-1">Total Wagered</div>
              <div className="text-2xl font-bold text-secondary">${totalWagered.toFixed(2)}</div>
            </CardContent>
          </Card>

          <Card className="card-gradient border-border">
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground mb-1">Win Rate</div>
              <div className="text-2xl font-bold text-primary">
                {totalBets > 0 ? ((wins / totalBets) * 100).toFixed(1) : 0}%
              </div>
            </CardContent>
          </Card>

          <Card className="card-gradient border-border">
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground mb-1">Total Profit/Loss</div>
              <div className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                {totalProfit >= 0 ? '+' : ''}${totalProfit.toFixed(2)}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="card-gradient border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-6 w-6 text-primary" />
              Bet History
            </CardTitle>
            <CardDescription>Your recent betting activity</CardDescription>
          </CardHeader>
          <CardContent>
            {bets.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No bets yet. Start playing to see your history!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Game</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Odds</TableHead>
                      <TableHead>Result</TableHead>
                      <TableHead>Profit/Loss</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bets.map((bet) => (
                      <TableRow key={bet.id}>
                        <TableCell className="font-medium">{bet.game}</TableCell>
                        <TableCell>${bet.amount.toFixed(2)}</TableCell>
                        <TableCell>{bet.odds.toFixed(2)}x</TableCell>
                        <TableCell>
                          <div className={`flex items-center gap-1 ${bet.result === 'win' ? 'text-success' : 'text-destructive'}`}>
                            {bet.result === 'win' ? (
                              <TrendingUp className="h-4 w-4" />
                            ) : (
                              <TrendingDown className="h-4 w-4" />
                            )}
                            {bet.result.toUpperCase()}
                          </div>
                        </TableCell>
                        <TableCell className={bet.profit >= 0 ? 'text-success' : 'text-destructive'}>
                          {bet.profit >= 0 ? '+' : ''}${bet.profit.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(bet.timestamp).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default MyBets;
