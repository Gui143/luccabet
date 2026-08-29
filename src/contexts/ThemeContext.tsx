import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AppTheme {
  id: string;
  theme_key: string;
  display_name: string;
  image_url: string;
  is_active: boolean;
  sort_order: number;
}

interface ThemeContextType {
  themes: AppTheme[];
  activeTheme: AppTheme | null;
  loading: boolean;
  /** Busca a versão mais recente (após o admin alterar) */
  refreshThemes: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType>({
  themes: [],
  activeTheme: null,
  loading: true,
  refreshThemes: async () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themes, setThemes] = useState<AppTheme[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshThemes = useCallback(async () => {
    const { data } = await supabase
      .from('app_themes')
      .select('id, theme_key, display_name, image_url, is_active, sort_order')
      .order('sort_order', { ascending: true });

    if (data) {
      setThemes(data as AppTheme[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refreshThemes();

    // Atualiza em tempo real quando o CEO ativa/desativa um tema no painel
    const channel = supabase
      .channel('app-themes-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'app_themes' },
        () => { refreshThemes(); }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refreshThemes]);

  // Aplica/remove o efeito visual do tema no body (papel de parede + scrollbar)
  const activeTheme = themes.find(t => t.is_active) ?? null;

  useEffect(() => {
    if (activeTheme) {
      document.body.dataset.theme = activeTheme.theme_key;
    } else {
      delete document.body.dataset.theme;
    }
  }, [activeTheme]);

  return (
    <ThemeContext.Provider value={{ themes, activeTheme, loading, refreshThemes }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
