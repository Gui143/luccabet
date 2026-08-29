import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';

/**
 * Papel de parede de caça-níqueis (estilo "tema da nova guia" do Chrome).
 * Fica fixo atrás de TODO o app quando o CEO ativa um tema no painel admin.
 * O conteúdo fica legível por causa do gradiente escuro sobreposto e do
 * fundo semi-transparente das superfícies.
 */
const ThemeBackground: React.FC = () => {
  const { activeTheme } = useTheme();

  if (!activeTheme) return null;

  return (
    <div
      className="fixed inset-0 -z-10 pointer-events-none overflow-hidden"
      aria-hidden="true"
      style={{ animation: 'themeFadeIn 0.8s ease both' }}
      key={activeTheme.id}
    >
      <img
        src={activeTheme.image_url}
        alt=""
        className="w-full h-full object-cover"
      />
      {/* Véu escuro para manter o conteúdo legível */}
      <div className="absolute inset-0 bg-black/72" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/45 to-black/75" />
      {/* Brilho dourado sutil no topo */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 45% at 50% -10%, rgba(255,190,60,0.12), transparent 70%)',
        }}
      />
    </div>
  );
};

export default ThemeBackground;
