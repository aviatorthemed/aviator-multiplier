import { useState, useCallback, useEffect } from 'react';

export interface User {
  id: string;
  username: string;
  phone: string;
  balance: number;
  referralCode: string;
  referredBy: string | null;
  referrals: string[];
  referralDeposits: number;
  referralBonus: number;
  deposits: Transaction[];
  withdrawals: Transaction[];
}

export interface Transaction {
  id: string;
  amount: number;
  type: 'deposit' | 'withdrawal';
  method: string;
  account?: string;
  status: 'pending' | 'completed' | 'failed';
  timestamp: Date;
  username?: string;
}

function generateReferralCode(): string {
  return 'AV' + Math.random().toString(36).substring(2, 8).toUpperCase();
}

function loadUsers(): Record<string, User> {
  try {
    const data = localStorage.getItem('aviator_users');
    return data ? JSON.parse(data) : {};
  } catch { return {}; }
}

function saveUsers(users: Record<string, User>) {
  localStorage.setItem('aviator_users', JSON.stringify(users));
}

function loadSession(): string | null {
  return localStorage.getItem('aviator_session');
}

// Pending transactions stored separately for admin
function loadPendingTransactions(): Transaction[] {
  try {
    const data = localStorage.getItem('aviator_pending_transactions');
    return data ? JSON.parse(data) : [];
  } catch { return []; }
}

function savePendingTransactions(txs: Transaction[]) {
  localStorage.setItem('aviator_pending_transactions', JSON.stringify(txs));
}

export function useAuth() {
  const [users, setUsers] = useState<Record<string, User>>(loadUsers);
  const [currentUserId, setCurrentUserId] = useState<string | null>(loadSession);
  const [pendingTransactions, setPendingTransactions] = useState<Transaction[]>(loadPendingTransactions);

  const currentUser = currentUserId ? users[currentUserId] ?? null : null;

  useEffect(() => { saveUsers(users); }, [users]);
  useEffect(() => { savePendingTransactions(pendingTransactions); }, [pendingTransactions]);

  const updateUser = useCallback((userId: string, updater: (u: User) => User) => {
    setUsers(prev => {
      const user = prev[userId];
      if (!user) return prev;
      return { ...prev, [userId]: updater(user) };
    });
  }, []);

  const signup = useCallback((username: string, phone: string, password: string, referralCode?: string): { success: boolean; error?: string } => {
    const id = username.toLowerCase();
    if (users[id]) return { success: false, error: 'Username already exists' };
    if (username.length < 3) return { success: false, error: 'Username must be at least 3 characters' };
    if (phone.length < 10) return { success: false, error: 'Enter a valid phone number' };

    let referredBy: string | null = null;
    if (referralCode) {
      const referrer = Object.values(users).find(u => u.referralCode === referralCode);
      if (!referrer) return { success: false, error: 'Invalid referral code' };
      referredBy = referrer.id;
    }

    const newUser: User = {
      id, username, phone, balance: 0,
      referralCode: generateReferralCode(),
      referredBy, referrals: [], referralDeposits: 0, referralBonus: 0,
      deposits: [], withdrawals: [],
    };

    const updated = { ...users, [id]: newUser };
    if (referredBy && updated[referredBy]) {
      updated[referredBy] = { ...updated[referredBy], referrals: [...updated[referredBy].referrals, username] };
    }

    setUsers(updated);
    setCurrentUserId(id);
    localStorage.setItem('aviator_session', id);
    localStorage.setItem(`aviator_pw_${id}`, password);
    return { success: true };
  }, [users]);

  const login = useCallback((username: string, password: string): { success: boolean; error?: string } => {
    const id = username.toLowerCase();
    if (!users[id]) return { success: false, error: 'User not found' };
    const storedPw = localStorage.getItem(`aviator_pw_${id}`);
    if (storedPw !== password) return { success: false, error: 'Wrong password' };
    setCurrentUserId(id);
    localStorage.setItem('aviator_session', id);
    return { success: true };
  }, [users]);

  const logout = useCallback(() => {
    setCurrentUserId(null);
    localStorage.removeItem('aviator_session');
  }, []);

  // Deposit: creates pending transaction, does NOT add to balance
  const deposit = useCallback((amount: number, method: string) => {
    if (!currentUserId || amount <= 0) return;
    const tx: Transaction = {
      id: `dep-${Date.now()}`,
      amount, type: 'deposit', method,
      status: 'pending',
      timestamp: new Date(),
      username: currentUser?.username,
    };
    updateUser(currentUserId, u => ({ ...u, deposits: [tx, ...u.deposits] }));
    setPendingTransactions(prev => [tx, ...prev]);
  }, [currentUserId, currentUser, updateUser]);

  // Withdraw: creates pending transaction, deducts balance immediately to prevent overspend
  const withdraw = useCallback((amount: number, method: string, account: string) => {
    if (!currentUserId || !currentUser || amount <= 0 || amount > currentUser.balance) return { success: false, error: 'Insufficient balance' };
    const tx: Transaction = {
      id: `wd-${Date.now()}`,
      amount, type: 'withdrawal', method, account,
      status: 'pending',
      timestamp: new Date(),
      username: currentUser.username,
    };
    updateUser(currentUserId, u => ({ ...u, balance: u.balance - amount, withdrawals: [tx, ...u.withdrawals] }));
    setPendingTransactions(prev => [tx, ...prev]);
    return { success: true };
  }, [currentUserId, currentUser, updateUser]);

  // Admin: approve a transaction
  const approveTransaction = useCallback((txId: string) => {
    const tx = pendingTransactions.find(t => t.id === txId);
    if (!tx) return;
    const userId = tx.username?.toLowerCase();
    if (!userId) return;

    if (tx.type === 'deposit') {
      // Add amount to user balance
      updateUser(userId, u => ({
        ...u,
        balance: u.balance + tx.amount,
        deposits: u.deposits.map(d => d.id === txId ? { ...d, status: 'completed' as const } : d),
      }));
    } else {
      // Withdrawal already deducted, just mark completed
      updateUser(userId, u => ({
        ...u,
        withdrawals: u.withdrawals.map(w => w.id === txId ? { ...w, status: 'completed' as const } : w),
      }));
    }

    setPendingTransactions(prev => prev.filter(t => t.id !== txId));
  }, [pendingTransactions, updateUser]);

  // Admin: reject a transaction
  const rejectTransaction = useCallback((txId: string) => {
    const tx = pendingTransactions.find(t => t.id === txId);
    if (!tx) return;
    const userId = tx.username?.toLowerCase();
    if (!userId) return;

    if (tx.type === 'withdrawal') {
      // Refund the balance
      updateUser(userId, u => ({
        ...u,
        balance: u.balance + tx.amount,
        withdrawals: u.withdrawals.map(w => w.id === txId ? { ...w, status: 'failed' as const } : w),
      }));
    } else {
      updateUser(userId, u => ({
        ...u,
        deposits: u.deposits.map(d => d.id === txId ? { ...d, status: 'failed' as const } : d),
      }));
    }

    setPendingTransactions(prev => prev.filter(t => t.id !== txId));
  }, [pendingTransactions, updateUser]);

  const updateBalance = useCallback((newBalance: number) => {
    if (!currentUserId) return;
    updateUser(currentUserId, u => ({ ...u, balance: newBalance }));
  }, [currentUserId, updateUser]);

  // Refresh pending transactions from localStorage (for admin page)
  const refreshPending = useCallback(() => {
    setPendingTransactions(loadPendingTransactions());
    setUsers(loadUsers());
  }, []);

  return {
    currentUser,
    isLoggedIn: !!currentUser,
    signup, login, logout,
    deposit, withdraw, updateBalance,
    pendingTransactions,
    approveTransaction,
    rejectTransaction,
    refreshPending,
  };
}
