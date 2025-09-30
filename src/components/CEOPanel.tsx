import React, { useState, useEffect } from 'react';
import { X, TrendingUp, Users, DollarSign, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface CEOPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const CEOPanel: React.FC<CEOPanelProps> = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      setProgress(0);
      
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setLoading(false);
            return 100;
          }
          return prev + 2;
        });
      }, 50);

      return () => clearInterval(interval);
    }
  }, [isOpen]);

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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-border">
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <p className="font-medium">Transaction #{1000 + i}</p>
                      <p className="text-xs text-muted-foreground">User ID: {i}42857</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary">R$ {(Math.random() * 500 + 50).toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">Deposit</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader>
              <CardTitle>System Controls</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button className="w-full justify-start" variant="outline">
                <Users className="mr-2 h-4 w-4" />
                User Management
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Activity className="mr-2 h-4 w-4" />
                Live Activity Monitor
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <TrendingUp className="mr-2 h-4 w-4" />
                Analytics Dashboard
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <DollarSign className="mr-2 h-4 w-4" />
                Financial Reports
              </Button>
              <div className="pt-4 border-t border-border">
                <Button className="w-full" variant="destructive">
                  🔧 Maintenance Mode
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CEOPanel;
