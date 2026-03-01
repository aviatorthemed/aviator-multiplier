import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameContext } from '@/contexts/GameContext';
import MultiplierDisplay from '@/components/game/MultiplierDisplay';
import GameHistory from '@/components/game/GameHistory';
import LiveBets from '@/components/game/LiveBets';
import { Shield, Plane, Eye, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { phase, countdown, currentMultiplier, crashPoint, nextCrashPoint, history, bets } = useGameContext();

  useEffect(() => {
    if (sessionStorage.getItem('adminAuth') !== 'true') {
      navigate('/admin/login');
    }
  }, [navigate]);

  const handleLogout = () => {
    sessionStorage.removeItem('adminAuth');
    navigate('/admin/login');
  };

  return (
    <div className="min-h-screen bg-sky-gradient">
      {/* Header */}
      <header className="border-b border-border px-6 py-3 flex items-center justify-between bg-card/50 backdrop-blur">
        <div className="flex items-center gap-3">
          <Plane className="w-6 h-6 text-primary" />
          <h1 className="font-display text-lg font-bold text-primary">AVIATOR</h1>
          <span className="bg-game-danger/20 text-game-danger text-xs font-display px-2 py-0.5 rounded flex items-center gap-1">
            <Shield className="w-3 h-3" /> ADMIN
          </span>
        </div>
        <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground">
          <LogOut className="w-4 h-4 mr-1" /> Logout
        </Button>
      </header>

      <div className="container max-w-6xl mx-auto p-6 space-y-6">
        {/* Admin-only: next crash point */}
        <div className="bg-game-danger/10 border border-game-danger/30 rounded-xl p-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Eye className="w-5 h-5 text-game-danger" />
            <h2 className="font-display text-sm tracking-widest text-game-danger">NEXT ROUND CRASH POINT (ADMIN ONLY)</h2>
          </div>
          <p className="text-6xl font-display font-black text-game-danger text-glow-red">
            {nextCrashPoint.toFixed(2)}x
          </p>
        </div>

        {/* Current round info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-cockpit shadow-cockpit rounded-xl p-4 text-center">
            <p className="text-xs font-display text-muted-foreground tracking-widest mb-1">PHASE</p>
            <p className="text-xl font-display font-bold text-primary uppercase">{phase}</p>
          </div>
          <div className="bg-cockpit shadow-cockpit rounded-xl p-4 text-center">
            <p className="text-xs font-display text-muted-foreground tracking-widest mb-1">CURRENT MULTIPLIER</p>
            <p className="text-xl font-display font-bold text-foreground">{currentMultiplier.toFixed(2)}x</p>
          </div>
          <div className="bg-cockpit shadow-cockpit rounded-xl p-4 text-center">
            <p className="text-xs font-display text-muted-foreground tracking-widest mb-1">CRASH POINT</p>
            <p className="text-xl font-display font-bold text-primary">{crashPoint.toFixed(2)}x</p>
          </div>
        </div>

        <GameHistory history={history} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <MultiplierDisplay
            phase={phase}
            currentMultiplier={currentMultiplier}
            countdown={countdown}
            crashPoint={crashPoint}
          />
          <LiveBets bets={bets} />
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
