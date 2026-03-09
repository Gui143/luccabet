import React, { useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { soundManager } from '@/lib/soundManager';

const SoundToggle: React.FC = () => {
  const [muted, setMuted] = useState(soundManager.isMuted);

  const toggle = () => {
    const newVal = soundManager.toggle();
    setMuted(newVal);
  };

  return (
    <Button onClick={toggle} variant="outline" size="sm" className="h-8 px-2" title={muted ? 'Ativar som' : 'Desativar som'}>
      {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
    </Button>
  );
};

export default SoundToggle;
