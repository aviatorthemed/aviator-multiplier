import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowDownToLine, ArrowUpFromLine, Smartphone, Building } from 'lucide-react';

interface WalletPanelProps {
  balance: number;
  onDeposit: (amount: number, method: string) => void;
  onWithdraw: (amount: number, method: string, account: string) => { success: boolean; error?: string };
}

const WalletPanel = ({ balance, onDeposit, onWithdraw }: WalletPanelProps) => {
  const [tab, setTab] = useState<'deposit' | 'withdraw'>('deposit');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('mpesa');
  const [account, setAccount] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const quickAmounts = [100, 500, 1000, 5000];

  const handleDeposit = () => {
    const val = parseInt(amount);
    if (isNaN(val) || val < 50) {
      setMessage({ type: 'error', text: 'Minimum deposit is KSh 50' });
      return;
    }
    onDeposit(val, method);
    setMessage({ type: 'success', text: `KSh ${val.toLocaleString()} deposited via ${method.toUpperCase()}` });
    setAmount('');
  };

  const handleWithdraw = () => {
    const val = parseInt(amount);
    if (isNaN(val) || val < 100) {
      setMessage({ type: 'error', text: 'Minimum withdrawal is KSh 100' });
      return;
    }
    if (!account) {
      setMessage({ type: 'error', text: 'Enter your account/phone number' });
      return;
    }
    const result = onWithdraw(val, method, account);
    if (result.success) {
      setMessage({ type: 'success', text: `Withdrawal of KSh ${val.toLocaleString()} submitted` });
      setAmount('');
      setAccount('');
    } else {
      setMessage({ type: 'error', text: result.error || 'Withdrawal failed' });
    }
  };

  return (
    <div className="bg-cockpit shadow-cockpit rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm tracking-widest text-muted-foreground">WALLET</h3>
        <span className="text-primary font-display font-bold text-lg">KSh {balance.toLocaleString()}</span>
      </div>

      <div className="flex rounded-lg bg-secondary p-1">
        <button
          className={`flex-1 py-2 text-xs font-display rounded-md transition-colors flex items-center justify-center gap-1 ${tab === 'deposit' ? 'bg-game-success text-game-success-foreground' : 'text-muted-foreground'}`}
          onClick={() => { setTab('deposit'); setMessage(null); }}
        >
          <ArrowDownToLine className="w-3 h-3" /> Deposit
        </button>
        <button
          className={`flex-1 py-2 text-xs font-display rounded-md transition-colors flex items-center justify-center gap-1 ${tab === 'withdraw' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
          onClick={() => { setTab('withdraw'); setMessage(null); }}
        >
          <ArrowUpFromLine className="w-3 h-3" /> Withdraw
        </button>
      </div>

      {/* Payment method */}
      <div className="grid grid-cols-2 gap-2">
        <button
          className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-colors border ${method === 'mpesa' ? 'border-game-success bg-game-success/10 text-game-success' : 'border-border text-muted-foreground'}`}
          onClick={() => setMethod('mpesa')}
        >
          <Smartphone className="w-3 h-3" /> M-Pesa
        </button>
        <button
          className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-colors border ${method === 'bank' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'}`}
          onClick={() => setMethod('bank')}
        >
          <Building className="w-3 h-3" /> Bank
        </button>
      </div>

      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">KSh</span>
        <Input
          type="number"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          placeholder="Enter amount"
          className="pl-12 bg-secondary border-border text-foreground font-semibold text-lg h-12"
        />
      </div>

      <div className="grid grid-cols-4 gap-2">
        {quickAmounts.map(a => (
          <Button key={a} variant="outline" size="sm" className="text-xs border-border" onClick={() => setAmount(a.toString())}>
            {a.toLocaleString()}
          </Button>
        ))}
      </div>

      {tab === 'withdraw' && (
        <Input
          placeholder={method === 'mpesa' ? 'M-Pesa phone number' : 'Bank account number'}
          value={account}
          onChange={e => setAccount(e.target.value)}
          className="bg-secondary border-border h-12"
        />
      )}

      {message && (
        <p className={`text-sm text-center ${message.type === 'success' ? 'text-game-success' : 'text-game-danger'}`}>
          {message.text}
        </p>
      )}

      <Button
        onClick={tab === 'deposit' ? handleDeposit : handleWithdraw}
        className={`w-full h-12 font-display font-bold ${tab === 'deposit' ? 'bg-game-success text-game-success-foreground hover:opacity-90' : 'bg-primary text-primary-foreground hover:opacity-90'}`}
      >
        {tab === 'deposit' ? `DEPOSIT KSh ${parseInt(amount || '0').toLocaleString()}` : `WITHDRAW KSh ${parseInt(amount || '0').toLocaleString()}`}
      </Button>
    </div>
  );
};

export default WalletPanel;
