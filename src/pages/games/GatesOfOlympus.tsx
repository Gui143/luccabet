import React from 'react';
import SlotMachineGame from '@/components/games/SlotMachineGame';
import { GATES_OF_OLYMPUS } from '@/games/slotEngine';

/**
 * Gates of Olympus (Pragmatic Play) — recriado nativamente.
 * Grade 6x5 "pay anywhere", tombolos, orbes multiplicadores (até 500x) que
 * aparecem em qualquer giro e 15 giros grátis com 4+ scatters.
 * A % de ganho é controlada pelo painel admin (game_key: gates_olympus).
 */
const GatesOfOlympus: React.FC = () => (
  <SlotMachineGame
    theme="olympus"
    title="Gates of Olympus"
    subtitle="Pragmatic Play • Ganhe até 5.000x"
    config={GATES_OF_OLYMPUS}
    gameName="Gates of Olympus"
    accent="from-amber-400 to-orange-600"
    headerBg="from-slate-900/85 via-indigo-950/80 to-slate-900/85"
  />
);

export default GatesOfOlympus;
