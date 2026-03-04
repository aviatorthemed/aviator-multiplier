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

let roundsSinceLastBig = 0;
const BIG_MULTIPLIER_MIN_ROUNDS = 30;
const BIG_MULTIPLIER_MAX_ROUNDS = 60;
let nextBigRoundAt = Math.floor(Math.random() * (BIG_MULTIPLIER_MAX_ROUNDS - BIG_MULTIPLIER_MIN_ROUNDS + 1)) + BIG_MULTIPLIER_MIN_ROUNDS;

function generateCrashPoint(): number {
  roundsSinceLastBig++;

  // Force a big multiplier more frequently (every 30-60 rounds)
  if (roundsSinceLastBig >= nextBigRoundAt) {
    roundsSinceLastBig = 0;
    nextBigRoundAt = Math.floor(Math.random() * (BIG_MULTIPLIER_MAX_ROUNDS - BIG_MULTIPLIER_MIN_ROUNDS + 1)) + BIG_MULTIPLIER_MIN_ROUNDS;
    return +(Math.random() * 140 + 10).toFixed(2); // 10x - 150x
  }

  const r = Math.random();
  if (r < 0.05) return +(Math.random() * 60 + 5).toFixed(2); // More high multipliers
  if (r < 0.15) return +(Math.random() * 10 + 2).toFixed(2);
  if (r < 0.45) return +(Math.random() * 2 + 1.3).toFixed(2);
  return +(Math.random() * 0.6 + 1.0).toFixed(2);
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
    // Clear any existing interval before starting a new one
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    setPhase('flying');
    let mult = 1.00;
    let hasCrashed = false;
    const speed = 50;

    intervalRef.current = setInterval(() => {
      // Guard: stop immediately if already crashed
      if (hasCrashed) {
        clearInterval(intervalRef.current);
        return;
      }

      try {
        const increment = 0.01 + mult * 0.003;
        mult = +(mult + increment).toFixed(2);

        // Check crash BEFORE updating UI to prevent overshoot
        if (mult >= cp) {
          hasCrashed = true;
          clearInterval(intervalRef.current);
          intervalRef.current = undefined;
          setCurrentMultiplier(cp);
          setPhase('crashed');

          setPlayerBet(prev => {
            if (prev && !prev.cashedOut) {
              return { ...prev, cashedOut: false };
            }
            return prev;
          });

          // Optimistic local history update so crash point matches immediately
          const roundId = Date.now();
          setHistory(prev => {
            const newRound: RoundResult = {
              id: roundId,
              crashMultiplier: cp,
              timestamp: new Date(),
            };
            return [newRound, ...prev].slice(0, 20);
          });

          // Save to DB (realtime will deduplicate via id check)
          saveRoundToDb(cp);

          setTimeout(() => {
            startCountdownRef.current?.();
          }, 3000);
          return;
        }

        setCurrentMultiplier(mult);

        setBets(prev => prev.map(b => {
          if (!b.cashedOut && Math.random() < 0.02) {
            return { ...b, cashedOut: true, cashOutMultiplier: mult, profit: Math.floor(b.amount * mult - b.amount) };
          }
          return b;
        }));
      } catch (error) {
        console.error('Game loop error:', error);
        clearInterval(intervalRef.current);
        intervalRef.current = undefined;
      }
    }, speed);
  }, []);

  const startCountdown = useCallback(() => {
    // Clear any existing timers
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = undefined;
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = undefined;
    }

    const newCrashPoint = generateCrashPoint();
    setCrashPoint(newCrashPoint);
    // Admin forecast should match actual current-round outcome
    setNextCrashPoint(newCrashPoint);
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
        countdownRef.current = undefined;
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
