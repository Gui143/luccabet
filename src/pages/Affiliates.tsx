import React, { useEffect, useState } from 'react';
import { Users, Gift, Link as LinkIcon, Copy, Check } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Layout from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { formatBRL } from '@/lib/formatCurrency';
import { toast } from 'sonner';

interface Referral {
  id: string;
  referred_id: string;
  bonus_earned: number;
  first_deposit_completed: boolean;
  created_at: string;
  referred_username?: string;
}

const Affiliates: React.FC = () => {
  const { user } = useAuth();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [totalBonus, setTotalBonus] = useState(0);
  const [referralCode, setReferralCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadReferralData();
  }, [user]);

  const loadReferralData = async () => {
    if (!user) return;

    // Get user's referral code
    const { data: profile } = await supabase
      .from('profiles')
      .select('referral_code')
      .eq('id', user.id)
      .single();

    if (profile?.referral_code) {
      setReferralCode(profile.referral_code);
    } else {
      // Generate referral code if not exists
      const code = user.username.toLowerCase().replace(/[^a-z0-9]/g, '');
      await supabase
        .from('profiles')
        .update({ referral_code: code })
        .eq('id', user.id);
      setReferralCode(code);
    }

    // Get referrals
    const { data: referralsData } = await supabase
      .from('referrals')
      .select('*')
      .eq('referrer_id', user.id)
      .order('created_at', { ascending: false });

    if (referralsData && referralsData.length > 0) {
      // Get referred users' usernames
      const referredIds = referralsData.map(r => r.referred_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username')
        .in('id', referredIds);

      const referralsWithNames = referralsData.map(r => ({
        ...r,
        referred_username: profiles?.find(p => p.id === r.referred_id)?.username || 'Usuário'
      }));

      setReferrals(referralsWithNames);
      setTotalBonus(referralsData.reduce((sum, r) => sum + Number(r.bonus_earned), 0));
    }

    setLoading(false);
  };

  const referralLink = `${window.location.origin}/invite/${referralCode}`;

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success('Link copiado!');
    setTimeout(() => setCopied(false), 2000);
  };

  const maskUsername = (username: string) => {
    if (username.length <= 3) return username + '***';
    return username.slice(0, 3) + '***';
  };

  if (!user) return null;

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold mb-2">Programa de Afiliados</h2>
          <p className="text-muted-foreground">Convide amigos e ganhe bônus em cada depósito!</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="card-gradient border-border">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/20">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Amigos Convidados</p>
                  <p className="text-2xl font-bold">{referrals.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-gradient border-border">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-success/20">
                  <Gift className="h-6 w-6 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Bônus Acumulado</p>
                  <p className="text-2xl font-bold text-success">{formatBRL(totalBonus)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-gradient border-border">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-accent/20">
                  <LinkIcon className="h-6 w-6 text-accent-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Comissão</p>
                  <p className="text-2xl font-bold">10%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Referral Link */}
        <Card className="card-gradient border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LinkIcon className="h-5 w-5 text-primary" />
              Seu Link de Convite
            </CardTitle>
            <CardDescription>
              Compartilhe este link com seus amigos. Você ganha 10% de bônus em cada primeiro depósito!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input 
                value={referralLink} 
                readOnly 
                className="font-mono text-sm"
              />
              <Button onClick={copyLink} variant="outline" className="shrink-0">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Código: <span className="font-mono font-bold text-primary">{referralCode}</span>
            </p>
          </CardContent>
        </Card>

        {/* Referrals Table */}
        <Card className="card-gradient border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Amigos Convidados
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center text-muted-foreground py-8">Carregando...</p>
            ) : referrals.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Você ainda não convidou ninguém</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Compartilhe seu link e comece a ganhar!
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Depositou</TableHead>
                    <TableHead className="text-right">Bônus</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {referrals.map((referral) => (
                    <TableRow key={referral.id}>
                      <TableCell className="font-medium">
                        {maskUsername(referral.referred_username || '')}
                      </TableCell>
                      <TableCell>
                        {new Date(referral.created_at).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        {referral.first_deposit_completed ? (
                          <span className="text-success">✓ Sim</span>
                        ) : (
                          <span className="text-muted-foreground">Aguardando</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-bold text-success">
                        {formatBRL(Number(referral.bonus_earned))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* How it works */}
        <Card className="card-gradient border-border">
          <CardHeader>
            <CardTitle>Como Funciona?</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3 text-sm">
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">1</span>
                <span>Compartilhe seu link de convite com amigos</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">2</span>
                <span>Seu amigo se cadastra usando seu link</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">3</span>
                <span>Quando ele fizer o primeiro depósito, você ganha 10% de bônus!</span>
              </li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Affiliates;
