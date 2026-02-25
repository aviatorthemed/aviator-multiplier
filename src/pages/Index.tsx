import { useGame } from '@/hooks/useGame';
import MultiplierDisplay from '@/components/game/MultiplierDisplay';
import BetPanel from '@/components/game/BetPanel';
import GameHistory from '@/components/game/GameHistory';
import LiveBets from '@/components/game/LiveBets';
import { Plane, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';

const Index = () => {
  const { phase, countdown, currentMultiplier, crashPoint, history, bets, playerBet, balance, placeBet, cashOut } = useGame();

  return (
    <div className="min-h-screen bg-sky-gradient">
      {/* Header */}
      <header className="border-b border-border px-6 py-3 flex items-center justify-between bg-card/50 backdrop-blur">
        <div className="flex items-center gap-3">
          <Plane className="w-6 h-6 text-primary" />
          <h1 className="font-display text-xl font-bold text-primary">AVIATOR</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            Balance: <span className="text-primary font-bold">KSh {balance.toLocaleString()}</span>
          </span>
          <Link to="/admin/login" className="text-muted-foreground hover:text-primary transition-colors">
            <Shield className="w-4 h-4" />
          </Link>
        </div>
      </header>

      {/* History bar */}
      <div className="px-6 py-2 border-b border-border bg-card/30">
        <GameHistory history={history} />
      </div>

      {/* Main content */}
      <div className="container max-w-6xl mx-auto p-4 md:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Game area */}
          <div className="lg:col-span-2 space-y-4">
            <MultiplierDisplay
              phase={phase}
              currentMultiplier={currentMultiplier}
              countdown={countdown}
              crashPoint={crashPoint}
            />
            <LiveBets bets={bets} />
          </div>

          {/* Bet panel */}
          <div>
            <BetPanel
              phase={phase}
              balance={balance}
              playerBet={playerBet}
              currentMultiplier={currentMultiplier}
              onPlaceBet={placeBet}
              onCashOut={cashOut}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
