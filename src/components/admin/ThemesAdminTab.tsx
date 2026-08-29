import React, { useEffect, useState } from 'react';
import { Palette, Check, Loader2, ImageOff } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AppTheme } from '@/contexts/ThemeContext';

/**
 * Temas de caça-níqueis do app — funciona como os temas da "nova guia" do
 * Chrome: o CEO ativa um tema e o papel de parede 777 aparece no app inteiro,
 * em tempo real, para todos os usuários.
 */
const ThemesAdminTab: React.FC = () => {
  const [themes, setThemes] = useState<AppTheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('app_themes')
      .select('id, theme_key, display_name, image_url, is_active, sort_order')
      .order('sort_order', { ascending: true });

    if (error) {
      toast.error('Erro ao carregar temas');
    } else {
      setThemes((data || []) as AppTheme[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const applyTheme = async (theme: AppTheme, activate: boolean) => {
    setSavingKey(theme.theme_key);

    // Apenas um tema ativo por vez: ativar um desativa os outros
    const updates = themes.map(t => ({
      id: t.id,
      is_active: activate ? t.theme_key === theme.theme_key : false,
    }));

    const results = await Promise.all(
      updates.map(u =>
        supabase
          .from('app_themes')
          .update({ is_active: u.is_active })
          .eq('id', u.id)
      )
    );

    setSavingKey(null);

    if (results.some(r => r.error)) {
      toast.error('Erro ao salvar tema');
    } else {
      toast.success(activate ? `Tema "${theme.display_name}" ativado para todo o app!` : 'Tema desativado');
      load();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
        <Loader2 className="w-4 h-4 animate-spin" /> Carregando temas...
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Card className="card-gradient border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Palette className="w-4 h-4 text-primary" />
            Temas de Caça-Níqueis do App
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            Ative um tema para trocar o papel de parede do app inteiro por uma arte
            de caça-níqueis 777 — igual aos temas especiais da nova guia do Chrome.
            A troca aparece para todos os usuários na hora.
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {themes.map(theme => (
          <Card
            key={theme.id}
            className={`overflow-hidden border transition-all ${
              theme.is_active ? 'border-primary shadow-[0_0_18px_rgba(255,200,40,0.25)]' : 'border-border'
            }`}
          >
            <div className="relative aspect-[16/9] bg-muted">
              <img
                src={theme.image_url}
                alt={theme.display_name}
                className="w-full h-full object-cover"
                loading="lazy"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              {theme.is_active && (
                <div className="absolute top-2 right-2 bg-primary text-primary-foreground text-[10px] font-black px-2 py-1 rounded-md flex items-center gap-1">
                  <Check className="w-3 h-3" /> ATIVO
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            </div>
            <CardContent className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm">{theme.display_name}</p>
                  <p className="text-[10px] text-muted-foreground uppercase">{theme.theme_key}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground">
                    {theme.is_active ? 'Ativo' : 'Inativo'}
                  </span>
                  <Switch
                    checked={theme.is_active}
                    disabled={savingKey !== null}
                    onCheckedChange={(v) => applyTheme(theme, v)}
                  />
                </div>
              </div>
              {theme.is_active && (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full h-8 text-xs"
                  disabled={savingKey !== null}
                  onClick={() => applyTheme(theme, false)}
                >
                  {savingKey === theme.theme_key ? 'Salvando...' : 'Desativar tema (voltar ao padrão)'}
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {themes.length === 0 && (
        <div className="text-center py-10 text-muted-foreground text-sm flex flex-col items-center gap-2">
          <ImageOff className="w-8 h-8 opacity-40" />
          Nenhum tema encontrado. Execute a migration de temas no Supabase.
        </div>
      )}
    </div>
  );
};

export default ThemesAdminTab;
