import { RoundResult } from '@/hooks/useGame';

interface GameHistoryProps {
  history: RoundResult[];
}

const GameHistory = ({ history }: GameHistoryProps) => {
  return (
    <div className="flex gap-2 overflow-x-auto py-2 px-1">
      {history.map(round => {
        const isHigh = round.crashMultiplier >= 2;
        const isMega = round.crashMultiplier >= 10;
        return (
          <span
            key={round.id}
            className={`shrink-0 px-3 py-1 rounded-full text-xs font-display font-bold ${
              isMega
                ? 'bg-primary/20 text-primary'
                : isHigh
                  ? 'bg-game-success/20 text-game-success'
                  : 'bg-secondary text-muted-foreground'
            }`}
          >
            {round.crashMultiplier.toFixed(2)}x
          </span>
        );
      })}
    </div>
  );
};

export default GameHistory;
