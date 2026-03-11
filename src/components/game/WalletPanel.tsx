import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowDownToLine, ArrowUpFromLine, Smartphone, Copy, Check, Building2, CreditCard, AlertCircle } from 'lucide-react';

interface WalletPanelProps {
  balance: number;
  onDeposit: (amount: number, method: string) => void;
  onWithdraw: (amount: number, method: string, account: string) => { success: boolean; error?: string };
}

type PaymentMethod = 'mpesa' | 'bank' | 'card';

const WalletPanel = ({ balance, onDeposit, onWithdraw }: WalletPanelProps) => {
  const [tab, setTab] = useState<'deposit' | 'withdraw'>('deposit');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('mpesa');
  const [account, setAccount] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const quickAmounts = [100, 500, 1000, 5000];

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleMethodSelect = (m: PaymentMethod) => {
    setMethod(m);
    setMessage(null);
    if (m === 'bank' || m === 'card') {
      setMessage({ type: 'info', text: `${m === 'bank' ? 'Bank Transfer' : 'Card'} payments are not available at the moment. Please use M-Pesa.` });
    }
  };

  const handleDeposit = () => {
    if (method !== 'mpesa') {
      setMessage({ type: 'info', text: 'Only M-Pesa is available at the moment.' });
      return;
    }
    const val = parseInt(amount);
    if (isNaN(val) || val < 50) {
      setMessage({ type: 'error', text: 'Minimum deposit is KSh 50' });
      return;
    }
    onDeposit(val, method);
    setMessage({ type: 'success', text: `Deposit of KSh ${val.toLocaleString()} submitted. Awaiting confirmation.` });
    setAmount('');
  };

  const handleWithdraw = () => {
    if (method !== 'mpesa') {
      setMessage({ type: 'info', text: 'Only M-Pesa is available at the moment.' });
      return;
    }
    const val = parseInt(amount);
    if (isNaN(val) || val < 100) {
      setMessage({ type: 'error', text: 'Minimum withdrawal is KSh 100' });
      return;
    }
    if (!account) {
      setMessage({ type: 'error', text: 'Enter your M-Pesa phone number' });
      return;
    }
    const result = onWithdraw(val, method, account);
    if (result.success) {
      setMessage({ type: 'success', text: `Withdrawal of KSh ${val.toLocaleString()} submitted. Awaiting confirmation.` });
      setAmount('');
      setAccount('');
    } else {
      setMessage({ type: 'error', text: result.error || 'Withdrawal failed' });
    }
  };

  const paymentMethods: { id: PaymentMethod; label: string; icon: React.ReactNode; available: boolean }[] = [
    { id: 'mpesa', label: 'M-Pesa', icon: <Smartphone className="w-4 h-4" />, available: true },
    { id: 'bank', label: 'Bank Transfer', icon: <Building2 className="w-4 h-4" />, available: false },
    { id: 'card', label: 'Card', icon: <CreditCard className="w-4 h-4" />, available: false },
  ];

  return (
    <div className="bg-cockpit shadow-cockpit rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm tracking-widest text-muted-foreground">WALLET</h3>
        <span className="text-primary font-display font-bold text-lg">KSh {balance.toLocaleString()}</span>
      </div>

      <div className="flex rounded-lg bg-secondary p-1">
        <button
          className={`flex-1 py-2 text-xs font-display rounded-md transition-colors flex items-center justify-center gap-1 ${tab === 'deposit' ? 'bg-game-success text-game-success-foreground' : 'text-muted-foreground'}`}
          onClick={() => { setTab('deposit'); setMessage(null); setMethod('mpesa'); }}
        >
          <ArrowDownToLine className="w-3 h-3" /> Deposit
        </button>
        <button
          className={`flex-1 py-2 text-xs font-display rounded-md transition-colors flex items-center justify-center gap-1 ${tab === 'withdraw' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
          onClick={() => { setTab('withdraw'); setMessage(null); setMethod('mpesa'); }}
        >
          <ArrowUpFromLine className="w-3 h-3" /> Withdraw
        </button>
      </div>

      {/* Payment Method Selection */}
      <div className="space-y-2">
        <p className="text-xs font-display text-muted-foreground tracking-widest">PAYMENT METHOD</p>
        <div className="grid grid-cols-3 gap-2">
          {paymentMethods.map(pm => (
            <button
              key={pm.id}
              onClick={() => handleMethodSelect(pm.id)}
              className={`relative flex flex-col items-center gap-1 py-3 px-2 rounded-lg border text-xs font-display transition-all ${
                method === pm.id
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:border-muted-foreground'
              }`}
            >
              {pm.icon}
              <span>{pm.label}</span>
              {!pm.available && (
                <span className="absolute -top-1 -right-1 bg-game-danger text-game-danger-foreground text-[9px] px-1 rounded-full font-bold">
                  Soon
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* M-Pesa Instructions (deposit only) */}
      {tab === 'deposit' && method === 'mpesa' && (
        <div className="bg-game-success/5 border border-game-success/20 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2 text-game-success">
            <Smartphone className="w-4 h-4" />
            <span className="font-display text-xs tracking-widest">M-PESA PAYMENT</span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Paybill Number:</span>
              <div className="flex items-center gap-2">
                <span className="text-foreground font-bold">775093</span>
                <button onClick={() => copyToClipboard('775093', 'paybill')} className="text-muted-foreground hover:text-primary">
                  {copied === 'paybill' ? <Check className="w-3 h-3 text-game-success" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Account Number:</span>
              <div className="flex items-center gap-2">
                <span className="text-foreground font-bold">125536011</span>
                <button onClick={() => copyToClipboard('125536011', 'account')} className="text-muted-foreground hover:text-primary">
                  {copied === 'account' ? <Check className="w-3 h-3 text-game-success" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Send payment via M-Pesa, then enter the amount below. Your balance will be updated once the system confirms.
          </p>
        </div>
      )}

      {/* Unavailable method message */}
      {(method === 'bank' || method === 'card') && (
        <div className="bg-accent/50 border border-border rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-foreground">Coming Soon</p>
            <p className="text-xs text-muted-foreground mt-1">
              {method === 'bank' ? 'Bank Transfer' : 'Card'} payments are not available at the moment. Please use M-Pesa to make your {tab}.
            </p>
          </div>
        </div>
      )}

      {/* Amount input - only show for mpesa */}
      {method === 'mpesa' && (
        <>
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
              placeholder="M-Pesa phone number"
              value={account}
              onChange={e => setAccount(e.target.value)}
              className="bg-secondary border-border h-12"
            />
          )}
        </>
      )}

      {message && (
        <p className={`text-sm text-center ${message.type === 'success' ? 'text-game-success' : message.type === 'error' ? 'text-game-danger' : 'text-muted-foreground'}`}>
          {message.text}
        </p>
      )}

      {method === 'mpesa' && (
        <Button
          onClick={tab === 'deposit' ? handleDeposit : handleWithdraw}
          className={`w-full h-12 font-display font-bold ${tab === 'deposit' ? 'bg-game-success text-game-success-foreground hover:opacity-90' : 'bg-primary text-primary-foreground hover:opacity-90'}`}
        >
          {tab === 'deposit' ? `DEPOSIT KSh ${parseInt(amount || '0').toLocaleString()}` : `WITHDRAW KSh ${parseInt(amount || '0').toLocaleString()}`}
        </Button>
      )}
    </div>
  );
};

export default WalletPanel;
