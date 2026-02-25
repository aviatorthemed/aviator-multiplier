import { useState, useEffect } from 'react';
import { useGame } from '@/hooks/useGame';
import { useAuth } from '@/hooks/useAuth';
import MultiplierDisplay from '@/components/game/MultiplierDisplay';
import BetPanel from '@/components/game/BetPanel';
import GameHistory from '@/components/game/GameHistory';
import LiveBets from '@/components/game/LiveBets';
import AuthScreen from '@/components/game/AuthScreen';
import WalletPanel from '@/components/game/WalletPanel';
import ReferralDashboard from '@/components/game/ReferralDashboard';
import { Plane, Shield, Wallet, Users, Gamepad2, LogOut } from 'lucide-react';
import { Link } from 'react-router-dom';

type Tab = 'game' | 'wallet' | 'referrals';

const Index = () => {
  const { phase, countdown, currentMultiplier, crashPoint, history, bets, playerBet, balance, placeBet, cashOut } = useGame();
  const auth = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('game');

  // Sync game balance with auth balance
  const effectiveBalance = auth.isLoggedIn ? auth.currentUser!.balance : balance;

  // Wrap placeBet and cashOut to update auth balance
  const handlePlaceBet = (amount: number) => {
    placeBet(amount);
    if (auth.isLoggedIn) {
      auth.updateBalance(auth.currentUser!.balance - amount);
    }
  };

  const handleCashOut = () => {
    cashOut();
    if (auth.isLoggedIn && playerBet && !playerBet.cashedOut) {
      const profit = Math.floor(playerBet.amount * currentMultiplier - playerBet.amount);
      auth.updateBalance(auth.currentUser!.balance + playerBet.amount + profit);
    }
  };

  if (!auth.isLoggedIn) {
    return <AuthScreen onLogin={auth.login} onSignup={auth.signup} />;
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'game', label: 'PLAY', icon: <Gamepad2 className="w-4 h-4" /> },
    { id: 'wallet', label: 'WALLET', icon: <Wallet className="w-4 h-4" /> },
    { id: 'referrals', label: 'REFER', icon: <Users className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-sky-gradient">
      {/* Header */}
      <header className="border-b border-border px-4 py-3 flex items-center justify-between bg-card/50 backdrop-blur">
        <div className="flex items-center gap-2">
          <Plane className="w-5 h-5 text-primary" />
          <h1 className="font-display text-lg font-bold text-primary">AVIATOR</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            Hi, <span className="text-primary font-semibold">{auth.currentUser!.username}</span>
          </span>
          <span className="text-xs font-semibold text-primary">
            KSh {effectiveBalance.toLocaleString()}
          </span>
          <button onClick={auth.logout} className="text-muted-foreground hover:text-game-danger transition-colors">
            <LogOut className="w-4 h-4" />
          </button>
          <Link to="/admin/login" className="text-muted-foreground hover:text-primary transition-colors">
            <Shield className="w-4 h-4" />
          </Link>
        </div>
      </header>

      {/* Tab navigation */}
      <div className="px-4 py-2 border-b border-border bg-card/30 flex gap-1">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-display transition-colors ${activeTab === t.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'game' && (
        <>
          {/* History bar */}
          <div className="px-4 py-2 border-b border-border bg-card/30">
            <GameHistory history={history} />
          </div>

          {/* Main content */}
          <div className="container max-w-6xl mx-auto p-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 space-y-4">
                <MultiplierDisplay
                  phase={phase}
                  currentMultiplier={currentMultiplier}
                  countdown={countdown}
                  crashPoint={crashPoint}
                />
                <LiveBets bets={bets} />
              </div>
              <div>
                <BetPanel
                  phase={phase}
                  balance={effectiveBalance}
                  playerBet={playerBet}
                  currentMultiplier={currentMultiplier}
                  onPlaceBet={handlePlaceBet}
                  onCashOut={handleCashOut}
                />
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'wallet' && (
        <div className="container max-w-md mx-auto p-4">
          <WalletPanel
            balance={auth.currentUser!.balance}
            onDeposit={auth.deposit}
            onWithdraw={auth.withdraw}
          />
        </div>
      )}

      {activeTab === 'referrals' && (
        <div className="container max-w-md mx-auto p-4">
          <ReferralDashboard user={auth.currentUser!} />
        </div>
      )}
    </div>
  );
};

export default Index;
