import { useState, useCallback, useEffect } from 'react';

export interface User {
  id: string;
  username: string;
  phone: string;
  balance: number;
  referralCode: string;
  referredBy: string | null;
  referrals: string[]; // usernames of referred users
  referralDeposits: number; // count of referred users who deposited
  referralBonus: number;
  deposits: Transaction[];
  withdrawals: Transaction[];
}

export interface Transaction {
  id: string;
  amount: number;
  type: 'deposit' | 'withdrawal';
  method: string;
  status: 'pending' | 'completed' | 'failed';
  timestamp: Date;
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

export function useAuth() {
  const [users, setUsers] = useState<Record<string, User>>(loadUsers);
  const [currentUserId, setCurrentUserId] = useState<string | null>(loadSession);

  const currentUser = currentUserId ? users[currentUserId] ?? null : null;

  useEffect(() => {
    saveUsers(users);
  }, [users]);

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
      id,
      username,
      phone,
      balance: 0,
      referralCode: generateReferralCode(),
      referredBy: referredBy,
      referrals: [],
      referralDeposits: 0,
      referralBonus: 0,
      deposits: [],
      withdrawals: [],
    };

    const updated = { ...users, [id]: newUser };

    // Add to referrer's referrals list
    if (referredBy && updated[referredBy]) {
      updated[referredBy] = {
        ...updated[referredBy],
        referrals: [...updated[referredBy].referrals, username],
      };
    }

    setUsers(updated);
    setCurrentUserId(id);
    localStorage.setItem('aviator_session', id);
    // Store password simply (prototype only)
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

  const deposit = useCallback((amount: number, method: string) => {
    if (!currentUserId || amount <= 0) return;
    const tx: Transaction = {
      id: `dep-${Date.now()}`,
      amount,
      type: 'deposit',
      method,
      status: 'completed',
      timestamp: new Date(),
    };
    updateUser(currentUserId, u => {
      const updated = {
        ...u,
        balance: u.balance + amount,
        deposits: [tx, ...u.deposits],
      };
      return updated;
    });

    // Check referral bonus for referrer
    setUsers(prev => {
      const user = prev[currentUserId];
      if (!user?.referredBy) return prev;
      const referrer = prev[user.referredBy];
      if (!referrer) return prev;

      // Check if this is the user's first deposit
      const userDeposits = user.deposits.length; // 0 means this is their first
      if (userDeposits > 0) return prev; // Already deposited before

      const newDepositCount = referrer.referralDeposits + 1;
      const bonusEarned = newDepositCount % 10 === 0 ? 100 : 0;

      return {
        ...prev,
        [user.referredBy]: {
          ...referrer,
          referralDeposits: newDepositCount,
          referralBonus: referrer.referralBonus + bonusEarned,
          balance: referrer.balance + bonusEarned,
        },
      };
    });
  }, [currentUserId, updateUser]);

  const withdraw = useCallback((amount: number, method: string, account: string) => {
    if (!currentUserId || !currentUser || amount <= 0 || amount > currentUser.balance) return { success: false, error: 'Insufficient balance' };
    const tx: Transaction = {
      id: `wd-${Date.now()}`,
      amount,
      type: 'withdrawal',
      method,
      status: 'pending',
      timestamp: new Date(),
    };
    updateUser(currentUserId, u => ({
      ...u,
      balance: u.balance - amount,
      withdrawals: [tx, ...u.withdrawals],
    }));
    return { success: true };
  }, [currentUserId, currentUser, updateUser]);

  const updateBalance = useCallback((newBalance: number) => {
    if (!currentUserId) return;
    updateUser(currentUserId, u => ({ ...u, balance: newBalance }));
  }, [currentUserId, updateUser]);

  return {
    currentUser,
    isLoggedIn: !!currentUser,
    signup,
    login,
    logout,
    deposit,
    withdraw,
    updateBalance,
  };
}
