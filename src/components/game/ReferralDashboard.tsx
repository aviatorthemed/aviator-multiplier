import { User } from '@/hooks/useAuth';
import { Copy, Gift, Users, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

interface ReferralDashboardProps {
  user: User;
}

const ReferralDashboard = ({ user }: ReferralDashboardProps) => {
  const [copied, setCopied] = useState(false);
  const progress = user.referralDeposits % 10;
  const bonusesEarned = Math.floor(user.referralDeposits / 10);

  const copyCode = () => {
    navigator.clipboard.writeText(user.referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-cockpit shadow-cockpit rounded-xl p-5 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm tracking-widest text-muted-foreground">REFERRALS</h3>
        <div className="flex items-center gap-1 text-primary">
          <Gift className="w-4 h-4" />
          <span className="font-display font-bold text-sm">KSh {user.referralBonus.toLocaleString()} earned</span>
        </div>
      </div>

      {/* Referral code */}
      <div className="bg-secondary rounded-lg p-4 text-center space-y-2">
        <p className="text-xs text-muted-foreground">Your Referral Code</p>
        <div className="flex items-center justify-center gap-2">
          <span className="font-display text-2xl font-bold text-primary tracking-widest">{user.referralCode}</span>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={copyCode}>
            {copied ? <Check className="w-4 h-4 text-game-success" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">Share this code and earn KSh 100 for every 10 referrals who deposit!</p>
      </div>

      {/* Progress to next bonus */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Progress to next bonus</span>
          <span className="text-primary font-semibold">{progress}/10</span>
        </div>
        <div className="h-3 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${(progress / 10) * 100}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground text-center">
          {10 - progress} more depositing referrals to earn KSh 100
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-secondary rounded-lg p-3 text-center">
          <Users className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
          <p className="font-display font-bold text-lg text-foreground">{user.referrals.length}</p>
          <p className="text-xs text-muted-foreground">Referrals</p>
        </div>
        <div className="bg-secondary rounded-lg p-3 text-center">
          <Check className="w-4 h-4 text-game-success mx-auto mb-1" />
          <p className="font-display font-bold text-lg text-foreground">{user.referralDeposits}</p>
          <p className="text-xs text-muted-foreground">Deposited</p>
        </div>
        <div className="bg-secondary rounded-lg p-3 text-center">
          <Gift className="w-4 h-4 text-primary mx-auto mb-1" />
          <p className="font-display font-bold text-lg text-foreground">{bonusesEarned}</p>
          <p className="text-xs text-muted-foreground">Bonuses</p>
        </div>
      </div>

      {/* Referral list */}
      {user.referrals.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-display tracking-widest">REFERRED USERS</p>
          <div className="max-h-32 overflow-y-auto space-y-1">
            {user.referrals.map((name, i) => (
              <div key={i} className="flex items-center justify-between bg-secondary/50 rounded px-3 py-2 text-sm">
                <span className="text-foreground">{name}</span>
                <span className="text-xs text-muted-foreground">Joined</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReferralDashboard;
