import React, { useState, useEffect } from 'react';
import { X, TrendingUp, Users, DollarSign, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CEOPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const CEOPanel: React.FC<CEOPanelProps> = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [username, setUsername] = useState('');
  const [creditAmount, setCreditAmount] = useState('');
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const [isCrediting, setIsCrediting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      setProgress(0);
      
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setLoading(false);
            loadOnlineUsers();
            return 100;
          }
          return prev + 2;
        });
      }, 50);

      return () => clearInterval(interval);
    }
  }, [isOpen]);

  const loadOnlineUsers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('username, email, balance, is_online, last_seen')
      .eq('is_online', true)
      .order('last_seen', { ascending: false });

    if (!error && data) {
      setOnlineUsers(data);
    }
  };

  const handleCreditUser = async () => {
    if (!username.trim() || !creditAmount) {
      toast.error('Please enter username and amount');
      return;
    }

    const amount = parseFloat(creditAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setIsCrediting(true);
    
    const { data, error } = await supabase.functions.invoke('credit-user', {
      body: { username: username.trim(), amount }
    });

    if (error) {
      toast.error(error.message || 'Failed to credit user');
    } else if (data?.error) {
      toast.error(data.error);
    } else {
      toast.success(`Credited R$ ${amount.toFixed(2)} to ${username}`);
      setUsername('');
      setCreditAmount('');
      loadOnlineUsers();
    }

    setIsCrediting(false);
  };

  if (!isOpen) return null;

  if (loading) {
    return (
      <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex items-center justify-center">
        <div className="text-center space-y-6 max-w-md">
          <div className="text-6xl animate-pulse text-gradient">👑</div>
          <h2 className="text-4xl font-bold text-gradient">Loading CEO Panel</h2>
          <p className="text-muted-foreground">Accessing magnate dashboard...</p>
          <div className="space-y-2">
            <Progress value={progress} className="h-3" />
            <p className="text-sm text-primary">{progress}%</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm overflow-y-auto">
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-4xl font-bold text-gradient flex items-center gap-3">
              👑 Olá CEO
            </h1>
            <p className="text-muted-foreground mt-2">Executive Dashboard - 7Reiv BET</p>
          </div>
          <Button onClick={onClose} variant="outline" size="icon">
            <X className="h-6 w-6" />
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <Card className="border-primary/50 bg-card/50">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" />
                Treasury
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">R$ 125.450,00</div>
              <p className="text-xs text-muted-foreground mt-1">+12.5% from last week</p>
            </CardContent>
          </Card>

          <Card className="border-primary/50 bg-card/50">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Active Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">1,247</div>
              <p className="text-xs text-muted-foreground mt-1">+8.2% growth</p>
            </CardContent>
          </Card>

          <Card className="border-primary/50 bg-card/50">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                Live Bets
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">342</div>
              <p className="text-xs text-muted-foreground mt-1">Real-time activity</p>
            </CardContent>
          </Card>

          <Card className="border-primary/50 bg-card/50">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Revenue Today
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">R$ 8.750,00</div>
              <p className="text-xs text-muted-foreground mt-1">+15.3% vs yesterday</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Card className="border-border">
            <CardHeader>
              <CardTitle>Credit User Balance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="amount">Amount (R$)</Label>
                <Input
                  id="amount"
                  type="number"
                  value={creditAmount}
                  onChange={(e) => setCreditAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="mt-2"
                  step="0.01"
                />
              </div>
              <Button
                onClick={handleCreditUser}
                disabled={isCrediting}
                className="w-full glow-primary"
              >
                {isCrediting ? 'Processing...' : 'Credit User'}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader>
              <CardTitle>Online Users ({onlineUsers.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {onlineUsers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No users online</p>
                ) : (
                  onlineUsers.map((user, i) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-muted rounded">
                      <div>
                        <p className="font-medium text-sm">{user.username}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-primary">R$ {parseFloat(user.balance).toFixed(2)}</p>
                        <span className="text-xs text-green-500">● Online</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-border">
          <CardHeader>
            <CardTitle>System Controls</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button className="w-full justify-start" variant="outline">
              <Users className="mr-2 h-4 w-4" />
              Users
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <Activity className="mr-2 h-4 w-4" />
              Activity
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <TrendingUp className="mr-2 h-4 w-4" />
              Analytics
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <DollarSign className="mr-2 h-4 w-4" />
              Reports
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CEOPanel;
