import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plane, UserPlus, LogIn } from 'lucide-react';

interface AuthScreenProps {
  onLogin: (username: string, password: string) => { success: boolean; error?: string };
  onSignup: (username: string, phone: string, password: string, referralCode?: string) => { success: boolean; error?: string };
}

const AuthScreen = ({ onLogin, onSignup }: AuthScreenProps) => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (mode === 'login') {
      const result = onLogin(username, password);
      if (!result.success) setError(result.error || 'Login failed');
    } else {
      const result = onSignup(username, phone, password, referralCode || undefined);
      if (!result.success) setError(result.error || 'Signup failed');
    }
  };

  return (
    <div className="min-h-screen bg-sky-gradient flex items-center justify-center p-4">
      <div className="bg-cockpit shadow-cockpit rounded-xl p-8 w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <Plane className="w-10 h-10 text-primary mx-auto" />
          <h1 className="font-display text-2xl font-bold text-primary">AVIATOR</h1>
          <p className="text-muted-foreground text-sm">
            {mode === 'login' ? 'Welcome back, pilot!' : 'Join the flight crew'}
          </p>
        </div>

        <div className="flex rounded-lg bg-secondary p-1">
          <button
            className={`flex-1 py-2 text-sm font-display rounded-md transition-colors ${mode === 'login' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
            onClick={() => { setMode('login'); setError(''); }}
          >
            Login
          </button>
          <button
            className={`flex-1 py-2 text-sm font-display rounded-md transition-colors ${mode === 'signup' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
            onClick={() => { setMode('signup'); setError(''); }}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            placeholder="Username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            className="bg-secondary border-border h-12"
            required
          />
          {mode === 'signup' && (
            <Input
              placeholder="Phone number (e.g. 0712345678)"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              className="bg-secondary border-border h-12"
              required
            />
          )}
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="bg-secondary border-border h-12"
            required
          />
          {mode === 'signup' && (
            <Input
              placeholder="Referral code (optional)"
              value={referralCode}
              onChange={e => setReferralCode(e.target.value)}
              className="bg-secondary border-border h-12"
            />
          )}
          {error && <p className="text-game-danger text-sm text-center">{error}</p>}
          <Button type="submit" className="w-full h-12 font-display font-bold text-base">
            {mode === 'login' ? <><LogIn className="w-4 h-4 mr-2" /> LOGIN</> : <><UserPlus className="w-4 h-4 mr-2" /> SIGN UP</>}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default AuthScreen;
