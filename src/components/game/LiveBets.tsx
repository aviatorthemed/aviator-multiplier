import { Bet } from '@/hooks/useGame';

interface LiveBetsProps {
  bets: Bet[];
}

const LiveBets = ({ bets }: LiveBetsProps) => {
  return (
    <div className="bg-cockpit shadow-cockpit rounded-xl p-5">
      <h3 className="font-display text-sm tracking-widest text-muted-foreground mb-3">LIVE BETS</h3>
      <div className="space-y-1 max-h-[300px] overflow-y-auto">
        <div className="grid grid-cols-4 text-xs text-muted-foreground font-display tracking-wider pb-2 border-b border-border">
          <span>PLAYER</span>
          <span className="text-right">BET</span>
          <span className="text-right">MULT</span>
          <span className="text-right">PROFIT</span>
        </div>
        {bets.map(bet => (
          <div key={bet.id} className={`grid grid-cols-4 text-sm py-1.5 ${bet.cashedOut ? 'text-game-success' : 'text-foreground'}`}>
            <span className="truncate">{bet.player}</span>
            <span className="text-right">KSh {bet.amount.toLocaleString()}</span>
            <span className="text-right">{bet.cashedOut ? `${bet.cashOutMultiplier?.toFixed(2)}x` : '—'}</span>
            <span className="text-right font-semibold">
              {bet.cashedOut ? `+${bet.profit?.toLocaleString()}` : '—'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LiveBets;
