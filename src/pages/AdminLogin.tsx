import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Shield, Plane } from 'lucide-react';

const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'aviator2024';

const AdminLogin = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      sessionStorage.setItem('adminAuth', 'true');
      navigate('/admin');
    } else {
      setError('Invalid credentials');
    }
  };

  return (
    <div className="min-h-screen bg-sky-gradient flex items-center justify-center p-4">
      <div className="bg-cockpit shadow-cockpit rounded-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Plane className="w-8 h-8 text-primary" />
            <h1 className="font-display text-2xl font-bold text-primary">AVIATOR</h1>
          </div>
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Shield className="w-4 h-4" />
            <span className="font-display text-xs tracking-widest">ADMIN ACCESS</span>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <Input
            placeholder="Username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            className="bg-secondary border-border h-12"
          />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="bg-secondary border-border h-12"
          />
          {error && <p className="text-game-danger text-sm text-center">{error}</p>}
          <Button type="submit" className="w-full h-12 font-display font-bold bg-primary text-primary-foreground">
            LOGIN
          </Button>
        </form>

        <p className="text-muted-foreground text-xs text-center mt-6">
          Demo: admin / aviator2024
        </p>
      </div>
    </div>
  );
};

export default AdminLogin;
