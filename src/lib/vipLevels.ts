export interface VipLevel {
  name: string;
  minWagered: number;
  color: string;
  borderClass: string;
  badgeClass: string;
}

export const VIP_LEVELS: VipLevel[] = [
  { name: 'Bronze', minWagered: 0, color: 'hsl(30 60% 50%)', borderClass: 'ring-amber-700', badgeClass: 'bg-amber-900/50 text-amber-400 border-amber-700' },
  { name: 'Prata', minWagered: 1000, color: 'hsl(0 0% 70%)', borderClass: 'ring-gray-400', badgeClass: 'bg-gray-700/50 text-gray-300 border-gray-500' },
  { name: 'Ouro', minWagered: 5000, color: 'hsl(45 90% 55%)', borderClass: 'ring-yellow-500', badgeClass: 'bg-yellow-900/50 text-yellow-400 border-yellow-600' },
  { name: 'Diamante', minWagered: 25000, color: 'hsl(200 90% 60%)', borderClass: 'ring-cyan-400', badgeClass: 'bg-cyan-900/50 text-cyan-300 border-cyan-500' },
];

export function getVipLevel(totalWagered: number): VipLevel {
  for (let i = VIP_LEVELS.length - 1; i >= 0; i--) {
    if (totalWagered >= VIP_LEVELS[i].minWagered) return VIP_LEVELS[i];
  }
  return VIP_LEVELS[0];
}

export function getNextVipLevel(totalWagered: number): VipLevel | null {
  const current = getVipLevel(totalWagered);
  const idx = VIP_LEVELS.indexOf(current);
  return idx < VIP_LEVELS.length - 1 ? VIP_LEVELS[idx + 1] : null;
}

export function getVipProgress(totalWagered: number): number {
  const current = getVipLevel(totalWagered);
  const next = getNextVipLevel(totalWagered);
  if (!next) return 100;
  const range = next.minWagered - current.minWagered;
  const progress = totalWagered - current.minWagered;
  return Math.min(100, Math.round((progress / range) * 100));
}
