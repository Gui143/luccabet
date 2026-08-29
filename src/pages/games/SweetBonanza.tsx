import React from 'react';
import SlotMachineGame from '@/components/games/SlotMachineGame';
import { SWEET_BONANZA } from '@/games/slotEngine';

/**
 * Sweet Bonanza (Pragmatic Play) — recriado nativamente.
 * Grade 6x5, paga em qualquer lugar (8+), tombolos, bombas multiplicadoras
 * nos giros grátis e 10 giros grátis com 4+ pirulitos (scatter).
 * A % de ganho é controlada pelo painel admin (game_key: sweet_bonanza).
 */
const SweetBonanza: React.FC = () => (
  <SlotMachineGame
    theme="sweet"
    title="Sweet Bonanza"
    subtitle="Pragmatic Play • Ganhe até 21.175x"
    config={SWEET_BONANZA}
    gameName="Sweet Bonanza"
    accent="from-pink-400 to-rose-600"
    headerBg="from-fuchsia-900/80 via-purple-900/70 to-indigo-900/80"
  />
);

export default SweetBonanza;
