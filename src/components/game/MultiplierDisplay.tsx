import { GamePhase } from '@/hooks/useGame';
import { Plane } from 'lucide-react';

interface MultiplierDisplayProps {
  phase: GamePhase;
  currentMultiplier: number;
  countdown: number;
  crashPoint: number;
}

const MultiplierDisplay = ({ phase, currentMultiplier, countdown, crashPoint }: MultiplierDisplayProps) => {
  const getDisplayContent = () => {
    switch (phase) {
      case 'waiting':
        return (
          <div className="text-center">
            <p className="text-muted-foreground text-lg font-display">STARTING SOON...</p>
          </div>
        );
      case 'countdown':
        return (
          <div className="text-center">
            <p className="text-muted-foreground text-sm font-display tracking-widest mb-2">NEXT ROUND IN</p>
            <p className="text-7xl font-display font-black text-primary text-glow-amber animate-pulse-glow">
              {countdown}s
            </p>
            <p className="text-muted-foreground text-sm mt-3">Place your bets now!</p>
          </div>
        );
      case 'flying':
        return (
          <div className="text-center">
            <div className="relative">
              <Plane className="w-10 h-10 text-primary mx-auto mb-3 animate-rise" />
              <p className="text-8xl font-display font-black text-primary text-glow-amber">
                {currentMultiplier.toFixed(2)}x
              </p>
            </div>
          </div>
        );
      case 'crashed':
        return (
          <div className="text-center">
            <p className="text-sm font-display tracking-widest text-game-danger mb-2">CRASHED!</p>
            <p className="text-7xl font-display font-black text-game-danger text-glow-red">
              {crashPoint.toFixed(2)}x
            </p>
          </div>
        );
    }
  };

  return (
    <div className="bg-cockpit shadow-cockpit rounded-xl p-8 flex items-center justify-center min-h-[280px] relative overflow-hidden">
      {/* Background stars */}
      <div className="absolute inset-0 opacity-20">
        {Array.from({ length: 30 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-foreground"
            style={{
              width: Math.random() * 2 + 1,
              height: Math.random() * 2 + 1,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              opacity: Math.random() * 0.8 + 0.2,
            }}
          />
        ))}
      </div>
      <div className="relative z-10">{getDisplayContent()}</div>
    </div>
  );
};

export default MultiplierDisplay;
