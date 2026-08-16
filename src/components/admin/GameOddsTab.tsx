import React, { useEffect, useState } from 'react';
import { Percent, Save, TrendingDown, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Setting {
  id: string;
  game_key: string;
  display_name: string;
  win_chance: number;
  is_active: boolean;
}

const GameOddsTab: React.FC = () => {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const { data, error } = await supabase
      .from('game_odds_settings')
      .select('id, game_key, display_name, win_chance, is_active')
      .order('display_name');

    if (error) {
      toast.error('Erro ao carregar percentuais');
    } else {
      setSettings(((data || []) as any[]).map(d => ({ ...d, win_chance: Number(d.win_chance) })));
    }
    setLoading(false);
  };

  const update = (id: string, patch: Partial<Setting>) => {
    setSettings(prev => prev.map(s => (s.id === id ? { ...s, ...patch } : s)));
  };

  const save = async (s: Setting) => {
    setSavingId(s.id);
    const { error } = await supabase
      .from('game_odds_settings')
      .update({ win_chance: s.win_chance, is_active: s.is_active })
      .eq('id', s.id);
    setSavingId(null);

    if (error) {
      toast.error('Erro ao salvar: ' + error.message);
    } else {
      toast.success(`${s.display_name}: ${s.win_chance}% de ganho`);
    }
  };

  if (loading) return <p className="text-muted-foreground text-center py-8">Carregando percentuais...</p>;

  return (
    <div className="space-y-3">
      <Card className="card-gradient border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Percent className="w-4 h-4 text-primary" />
            Percentual de Ganho / Perda por Jogo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            Defina a chance de vitória do jogador em cada jogo. Quanto menor o percentual de ganho,
            maior a margem da casa. Ex.: 40% de ganho = 60% de perda.
          </p>
        </CardContent>
      </Card>

      {settings.map(s => (
        <Card key={s.id} className="card-gradient border-border">
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm">{s.display_name}</p>
                <p className="text-[10px] text-muted-foreground uppercase">{s.game_key}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground">{s.is_active ? 'Ativo' : 'Inativo'}</span>
                <Switch checked={s.is_active} onCheckedChange={v => update(s.id, { is_active: v })} />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 text-success text-xs font-bold min-w-[70px]">
                <TrendingUp className="w-3.5 h-3.5" />
                {s.win_chance.toFixed(0)}%
              </div>
              <Slider
                value={[s.win_chance]}
                min={0}
                max={100}
                step={1}
                onValueChange={([v]) => update(s.id, { win_chance: v })}
                className="flex-1"
              />
              <div className="flex items-center gap-1 text-destructive text-xs font-bold min-w-[70px] justify-end">
                <TrendingDown className="w-3.5 h-3.5" />
                {(100 - s.win_chance).toFixed(0)}%
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={0}
                max={100}
                value={s.win_chance}
                onChange={e => update(s.id, { win_chance: Math.min(100, Math.max(0, Number(e.target.value) || 0)) })}
                className="bg-input h-9 w-24"
              />
              <Button size="sm" className="h-9 flex-1" onClick={() => save(s)} disabled={savingId === s.id}>
                <Save className="w-3.5 h-3.5 mr-1" />
                {savingId === s.id ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default GameOddsTab;
