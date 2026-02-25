import { useState } from 'react';
import { GamePhase } from '@/hooks/useGame';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface BetPanelProps {
  phase: GamePhase;
  balance: number;
  playerBet: { cashedOut: boolean; cashOutMultiplier?: number; profit?: number; amount: number } | null;
  currentMultiplier: number;
  onPlaceBet: (amount: number) => void;
  onCashOut: () => void;
}

const BetPanel = ({ phase, balance, playerBet, currentMultiplier, onPlaceBet, onCashOut }: BetPanelProps) => {
  const [betAmount, setBetAmount] = useState('500');

  const quickAmounts = [100, 500, 1000, 5000];

  const handlePlaceBet = () => {
    const amount = parseInt(betAmount);
    if (!isNaN(amount) && amount > 0) {
      onPlaceBet(amount);
    }
  };

  return (
    <div className="bg-cockpit shadow-cockpit rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm tracking-widest text-muted-foreground">PLACE BET</h3>
        <span className="text-sm text-muted-foreground">
          Balance: <span className="text-primary font-semibold">KSh {balance.toLocaleString()}</span>
        </span>
      </div>

      <div className="space-y-3">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">KSh</span>
          <Input
            type="number"
            value={betAmount}
            onChange={(e) => setBetAmount(e.target.value)}
            className="pl-12 bg-secondary border-border text-foreground font-semibold text-lg h-12"
            disabled={phase === 'flying' || phase === 'crashed' || !!playerBet}
          />
        </div>

        <div className="grid grid-cols-4 gap-2">
          {quickAmounts.map(amount => (
            <Button
              key={amount}
              variant="outline"
              size="sm"
              className="text-xs border-border hover:bg-primary hover:text-primary-foreground"
              onClick={() => setBetAmount(amount.toString())}
              disabled={phase === 'flying' || phase === 'crashed' || !!playerBet}
            >
              {amount.toLocaleString()}
            </Button>
          ))}
        </div>

        {phase === 'countdown' && !playerBet && (
          <Button
            onClick={handlePlaceBet}
            className="w-full h-14 text-lg font-display font-bold bg-game-success text-game-success-foreground hover:opacity-90"
          >
            BET KSh {parseInt(betAmount || '0').toLocaleString()}
          </Button>
        )}

        {phase === 'flying' && playerBet && !playerBet.cashedOut && (
          <Button
            onClick={onCashOut}
            className="w-full h-14 text-lg font-display font-bold bg-primary text-primary-foreground hover:opacity-90 animate-pulse-glow"
          >
            CASH OUT @ {currentMultiplier.toFixed(2)}x
            <span className="block text-xs opacity-80">
              +KSh {Math.floor(playerBet.amount * currentMultiplier - playerBet.amount).toLocaleString()}
            </span>
          </Button>
        )}

        {playerBet?.cashedOut && (
          <div className="bg-game-success/10 border border-game-success/30 rounded-lg p-3 text-center">
            <p className="text-game-success font-display text-sm">CASHED OUT @ {playerBet.cashOutMultiplier?.toFixed(2)}x</p>
            <p className="text-game-success font-bold text-lg">+KSh {playerBet.profit?.toLocaleString()}</p>
          </div>
        )}

        {phase === 'crashed' && playerBet && !playerBet.cashedOut && (
          <div className="bg-game-danger/10 border border-game-danger/30 rounded-lg p-3 text-center">
            <p className="text-game-danger font-display text-sm">LOST</p>
            <p className="text-game-danger font-bold text-lg">-KSh {playerBet.amount.toLocaleString()}</p>
          </div>
        )}

        {(phase === 'waiting' || (phase === 'countdown' && playerBet) || (phase === 'flying' && !playerBet)) && (
          <Button
            disabled
            className="w-full h-14 text-lg font-display font-bold opacity-50"
          >
            {phase === 'waiting' ? 'WAITING...' : phase === 'countdown' ? 'BET PLACED ✓' : 'WAIT FOR NEXT ROUND'}
          </Button>
        )}
      </div>
    </div>
  );
};

export default BetPanel;
