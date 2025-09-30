import React from 'react';
import { User, Mail, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Layout from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { formatBRL } from '@/lib/formatCurrency';

const Account: React.FC = () => {
  const { user, getBetHistory } = useAuth();
  const bets = getBetHistory();

  if (!user) return null;

  const totalWagered = bets.reduce((sum, bet) => sum + bet.amount, 0);
  const totalProfit = bets.reduce((sum, bet) => sum + bet.profit, 0);

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold mb-2">Account</h2>
          <p className="text-muted-foreground">Manage your profile and balance</p>
        </div>

        <Card className="card-gradient border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-6 w-6 text-primary" />
              Profile Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm text-muted-foreground mb-1">Username</div>
              <div className="text-lg font-semibold">{user.username}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1 flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email
              </div>
              <div className="text-lg font-semibold">{user.email}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Account ID</div>
              <div className="text-sm font-mono bg-muted p-2 rounded">{user.id}</div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-gradient border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-primary" />
              Statistics
            </CardTitle>
            <CardDescription>Your betting performance overview</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <div className="text-sm text-muted-foreground mb-1">Total Bets</div>
                <div className="text-2xl font-bold">{bets.length}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Total Wagered</div>
                <div className="text-2xl font-bold text-primary">{formatBRL(totalWagered)}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Net Profit/Loss</div>
                <div className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {totalProfit >= 0 ? '+' : ''}{formatBRL(totalProfit)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Account;
