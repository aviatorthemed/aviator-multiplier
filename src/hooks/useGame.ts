import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type GamePhase = 'waiting' | 'countdown' | 'flying' | 'crashed';

export interface Bet {
  id: string;
  player: string;
  amount: number;
  cashedOut: boolean;
  cashOutMultiplier?: number;
  profit?: number;
}

export interface RoundResult {
  id: number;
  crashMultiplier: number;
  timestamp: Date;
}

const FAKE_PLAYERS = ['Alex K.', 'Mary W.', 'John M.', 'Grace N.', 'Peter O.', 'Faith J.', 'David K.', 'Sarah L.'];

function generateCrashPoint(): number {
  const r = Math.random();
  if (r < 0.02) return +(Math.random() * 90 + 10).toFixed(2);
  if (r < 0.1) return +(Math.random() * 7 + 3).toFixed(2);
  if (r < 0.4) return +(Math.random() * 1.5 + 1.5).toFixed(2);
  return +(Math.random() * 0.5 + 1.0).toFixed(2);
}

function generateFakeBets(): Bet[] {
  const count = Math.floor(Math.random() * 5) + 3;
  const shuffled = [...FAKE_PLAYERS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map((name, i) => ({
    id: `bot-${i}-${Date.now()}`,
    player: name,
    amount: Math.floor(Math.random() * 900 + 100) * 10,
    cashedOut: false,
  }));
}

async function saveRoundToDb(crashMultiplier: number) {
  try {
    await supabase.functions.invoke('save-round', {
      body: { crash_multiplier: crashMultiplier },
    });
  } catch (err) {
    console.error('Failed to save round:', err);
  }
}

async function fetchHistoryFromDb(): Promise<RoundResult[]> {
  try {
    const { data, error } = await supabase
      .from('game_rounds')
      .select('id, crash_multiplier, created_at')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error || !data) return [];
    return data.map((r: any) => ({
      id: r.id,
      crashMultiplier: Number(r.crash_multiplier),
      timestamp: new Date(r.created_at),
    }));
  } catch {
    return [];
  }
}

export function useGame() {
  const [phase, setPhase] = useState<GamePhase>('waiting');
  const [countdown, setCountdown] = useState(10);
  const [currentMultiplier, setCurrentMultiplier] = useState(1.00);
  const [crashPoint, setCrashPoint] = useState(0);
  const [nextCrashPoint, setNextCrashPoint] = useState(() => generateCrashPoint());
  const [history, setHistory] = useState<RoundResult[]>([]);
  const [bets, setBets] = useState<Bet[]>([]);
  const [playerBet, setPlayerBet] = useState<Bet | null>(null);
  const [balance, setBalance] = useState(10000);

  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const countdownRef = useRef<ReturnType<typeof setInterval>>();
  const roundIdRef = useRef(11);
  const startCountdownRef = useRef<() => void>();

  // Fetch history from DB on mount
  useEffect(() => {
    fetchHistoryFromDb().then(dbHistory => {
      if (dbHistory.length > 0) {
        setHistory(dbHistory);
        roundIdRef.current = dbHistory[0].id + 1;
      } else {
        // Seed with generated history if DB is empty
        const seeded = Array.from({ length: 10 }, (_, i) => ({
          id: i + 1,
          crashMultiplier: generateCrashPoint(),
          timestamp: new Date(Date.now() - (10 - i) * 30000),
        }));
        setHistory(seeded);
      }
    });
  }, []);

  // Subscribe to realtime inserts on game_rounds
  useEffect(() => {
    const channel = supabase
      .channel('game_rounds_realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'game_rounds' },
        (payload: any) => {
          const newRound: RoundResult = {
            id: payload.new.id,
            crashMultiplier: Number(payload.new.crash_multiplier),
            timestamp: new Date(payload.new.created_at),
          };
          setHistory(prev => {
            // Avoid duplicates
            if (prev.some(r => r.id === newRound.id)) return prev;
            return [newRound, ...prev].slice(0, 20);
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const startFlying = useCallback((cp: number) => {
    setPhase('flying');
    let mult = 1.00;
    const speed = 50;

    intervalRef.current = setInterval(() => {
      try {
        const increment = 0.01 + mult * 0.003;
        mult = +(mult + increment).toFixed(2);
        setCurrentMultiplier(mult);

        setBets(prev => prev.map(b => {
          if (!b.cashedOut && Math.random() < 0.02) {
            return { ...b, cashedOut: true, cashOutMultiplier: mult, profit: Math.floor(b.amount * mult - b.amount) };
          }
          return b;
        }));

        if (mult >= cp) {
          clearInterval(intervalRef.current);
          setPhase('crashed');

          setPlayerBet(prev => {
            if (prev && !prev.cashedOut) {
              return { ...prev, cashedOut: false };
            }
            return prev;
          });

          // Save to DB (this also triggers realtime for all clients)
          saveRoundToDb(cp);

          setTimeout(() => {
            startCountdownRef.current?.();
          }, 3000);
        }
      } catch (error) {
        console.error('Game loop error:', error);
        clearInterval(intervalRef.current);
      }
    }, speed);
  }, []);

  const startCountdown = useCallback(() => {
    const newCrashPoint = generateCrashPoint();
    const upcomingCrashPoint = generateCrashPoint();
    setCrashPoint(newCrashPoint);
    setNextCrashPoint(upcomingCrashPoint);
    setPhase('countdown');
    setCountdown(10);
    setCurrentMultiplier(1.00);
    setBets(generateFakeBets());
    setPlayerBet(null);

    let c = 10;
    countdownRef.current = setInterval(() => {
      c--;
      setCountdown(c);
      if (c <= 0) {
        clearInterval(countdownRef.current);
        startFlying(newCrashPoint);
      }
    }, 1000);
  }, [startFlying]);

  startCountdownRef.current = startCountdown;

  const placeBet = useCallback((amount: number) => {
    if (phase !== 'countdown' || playerBet) return;
    if (amount > balance || amount <= 0) return;
    setBalance(prev => prev - amount);
    const bet: Bet = {
      id: `player-${Date.now()}`,
      player: 'You',
      amount,
      cashedOut: false,
    };
    setPlayerBet(bet);
    setBets(prev => [bet, ...prev]);
  }, [phase, playerBet, balance]);

  const cashOut = useCallback(() => {
    if (phase !== 'flying' || !playerBet || playerBet.cashedOut) return;
    const profit = Math.floor(playerBet.amount * currentMultiplier - playerBet.amount);
    const updatedBet = {
      ...playerBet,
      cashedOut: true,
      cashOutMultiplier: currentMultiplier,
      profit,
    };
    setPlayerBet(updatedBet);
    setBalance(prev => prev + playerBet.amount + profit);
    setBets(prev => prev.map(b => b.id === playerBet.id ? updatedBet : b));
  }, [phase, playerBet, currentMultiplier]);

  useEffect(() => {
    startCountdown();
    return () => {
      clearInterval(intervalRef.current);
      clearInterval(countdownRef.current);
    };
  }, []);

  return {
    phase,
    countdown,
    currentMultiplier,
    crashPoint,
    nextCrashPoint,
    history,
    bets,
    playerBet,
    balance,
    placeBet,
    cashOut,
    startCountdown,
  };
}
