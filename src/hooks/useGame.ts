// Game engine v2 - server-synchronized
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
const COUNTDOWN_DURATION = 10;
const CRASH_DISPLAY_DURATION = 3;

// Deterministic multiplier from elapsed seconds
// Derived from: increment = 0.01 + mult * 0.003 every 50ms
// => dmult/dt = 0.2 + 0.06*mult => mult(t) = (13/3)*e^(0.06t) - 10/3
function getMultiplierAtTime(seconds: number): number {
  const val = (13 / 3) * Math.exp(0.06 * seconds) - 10 / 3;
  return +Math.max(1, val).toFixed(2);
}

function getTimeForMultiplier(mult: number): number {
  return Math.log((mult + 10 / 3) / (13 / 3)) / 0.06;
}

let roundsSinceLastBig = 0;
const BIG_MULTIPLIER_MIN_ROUNDS = 30;
const BIG_MULTIPLIER_MAX_ROUNDS = 60;
let nextBigRoundAt = Math.floor(Math.random() * (BIG_MULTIPLIER_MAX_ROUNDS - BIG_MULTIPLIER_MIN_ROUNDS + 1)) + BIG_MULTIPLIER_MIN_ROUNDS;

function generateCrashPoint(): number {
  roundsSinceLastBig++;
  if (roundsSinceLastBig >= nextBigRoundAt) {
    roundsSinceLastBig = 0;
    nextBigRoundAt = Math.floor(Math.random() * (BIG_MULTIPLIER_MAX_ROUNDS - BIG_MULTIPLIER_MIN_ROUNDS + 1)) + BIG_MULTIPLIER_MIN_ROUNDS;
    return +(Math.random() * 140 + 10).toFixed(2);
  }
  const r = Math.random();
  if (r < 0.04) return +(Math.random() * 60 + 5).toFixed(2);   // 4% → 5x-65x
  if (r < 0.10) return +(Math.random() * 2 + 8).toFixed(2);    // 6% → 8x-10x
  if (r < 0.18) return +(Math.random() * 2 + 6).toFixed(2);    // 8% → 6x-8x
  if (r < 0.30) return +(Math.random() * 3 + 3).toFixed(2);    // 12% → 3x-6x
  if (r < 0.50) return +(Math.random() * 1 + 2).toFixed(2);    // 20% → 2x-3x
  if (r < 0.72) return +(Math.random() * 0.7 + 1.3).toFixed(2); // 22% → 1.3x-2x
  return +(Math.random() * 0.3 + 1.0).toFixed(2);               // 28% → 1.0x-1.3x
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

async function fetchCurrentRound() {
  const { data } = await (supabase as any)
    .from('current_round')
    .select('*')
    .eq('id', 1)
    .single();
  return data;
}

async function tryUpdateRound(roundNumber: number, updates: Record<string, any>) {
  const { data, error } = await (supabase as any)
    .from('current_round')
    .update(updates)
    .eq('id', 1)
    .eq('round_number', roundNumber)
    .select()
    .single();
  return { data, error };
}

export function useGame() {
  const [phase, setPhase] = useState<GamePhase>('waiting');
  const [countdown, setCountdown] = useState(COUNTDOWN_DURATION);
  const [currentMultiplier, setCurrentMultiplier] = useState(1.00);
  const [crashPoint, setCrashPoint] = useState(0);
  const [nextCrashPoint, setNextCrashPoint] = useState(0);
  const [history, setHistory] = useState<RoundResult[]>([]);
  const [bets, setBets] = useState<Bet[]>([]);
  const [playerBet, setPlayerBet] = useState<Bet | null>(null);
  const [balance, setBalance] = useState(10000);

  const animRef = useRef<ReturnType<typeof setInterval>>();
  const roundStateRef = useRef<{ roundNumber: number; phase: GamePhase }>({
    roundNumber: 0, phase: 'waiting'
  });
  const transitioningRef = useRef(false);

  const stopAnimation = useCallback(() => {
    if (animRef.current) {
      clearInterval(animRef.current);
      animRef.current = undefined;
    }
  }, []);

  const runCountdown = useCallback((phaseStartedAt: Date, cp: number, roundNumber: number) => {
    stopAnimation();
    setPhase('countdown');
    setCrashPoint(cp);
    setNextCrashPoint(cp);
    setCurrentMultiplier(1.00);
    setBets(generateFakeBets());
    setPlayerBet(null);
    roundStateRef.current = { roundNumber, phase: 'countdown' };
    transitioningRef.current = false;

    animRef.current = setInterval(async () => {
      const elapsed = (Date.now() - phaseStartedAt.getTime()) / 1000;
      const remaining = Math.max(0, COUNTDOWN_DURATION - Math.floor(elapsed));
      setCountdown(remaining);

      if (remaining <= 0 && !transitioningRef.current) {
        transitioningRef.current = true;
        stopAnimation();
        await tryUpdateRound(roundNumber, { phase: 'flying' });
      }
    }, 200);
  }, [stopAnimation]);

  const runFlying = useCallback((phaseStartedAt: Date, cp: number, roundNumber: number) => {
    stopAnimation();
    setPhase('flying');
    setCrashPoint(cp);
    setNextCrashPoint(cp);
    roundStateRef.current = { roundNumber, phase: 'flying' };
    transitioningRef.current = false;

    const crashTime = getTimeForMultiplier(cp);

    animRef.current = setInterval(async () => {
      const elapsed = (Date.now() - phaseStartedAt.getTime()) / 1000;

      if (elapsed >= crashTime) {
        if (!transitioningRef.current) {
          transitioningRef.current = true;
          stopAnimation();
          setCurrentMultiplier(cp);
          setPhase('crashed');

          setPlayerBet(prev => {
            if (prev && !prev.cashedOut) return { ...prev, cashedOut: false };
            return prev;
          });

          const { data } = await tryUpdateRound(roundNumber, { phase: 'crashed' });
          if (data) {
            saveRoundToDb(cp);
          }
        }
        return;
      }

      const mult = getMultiplierAtTime(elapsed);
      setCurrentMultiplier(mult);

      setBets(prev => prev.map(b => {
        if (!b.cashedOut && Math.random() < 0.005) {
          return { ...b, cashedOut: true, cashOutMultiplier: mult, profit: Math.floor(b.amount * mult - b.amount) };
        }
        return b;
      }));
    }, 50);
  }, [stopAnimation]);

  const runCrashed = useCallback((phaseStartedAt: Date, cp: number, roundNumber: number) => {
    stopAnimation();
    setPhase('crashed');
    setCurrentMultiplier(cp);
    setCrashPoint(cp);
    roundStateRef.current = { roundNumber, phase: 'crashed' };
    transitioningRef.current = false;

    setPlayerBet(prev => {
      if (prev && !prev.cashedOut) return { ...prev, cashedOut: false };
      return prev;
    });

    const elapsed = (Date.now() - phaseStartedAt.getTime()) / 1000;
    const remaining = Math.max(0, (CRASH_DISPLAY_DURATION - elapsed) * 1000);

    setTimeout(async () => {
      if (transitioningRef.current) return;
      transitioningRef.current = true;
      const newCp = generateCrashPoint();
      const newRound = roundNumber + 1;
      await tryUpdateRound(roundNumber, {
        phase: 'countdown',
        crash_point: newCp,
        round_number: newRound,
      });
    }, remaining);
  }, [stopAnimation]);

  // Ref-based applyServerState to avoid re-subscriptions
  const applyServerStateRef = useRef<(data: any) => void>();

  const applyServerState = useCallback((data: any) => {
    if (!data) return;
    const serverPhase = data.phase as GamePhase;
    const phaseStartedAt = new Date(data.phase_started_at);
    const cp = Number(data.crash_point);
    const rn = data.round_number;

    // Don't re-apply exact same state
    const cur = roundStateRef.current;
    if (cur.roundNumber === rn && cur.phase === serverPhase) return;

    if (serverPhase === 'countdown') {
      const elapsed = (Date.now() - phaseStartedAt.getTime()) / 1000;
      if (elapsed < COUNTDOWN_DURATION) {
        runCountdown(phaseStartedAt, cp, rn);
      } else {
        // Already elapsed, try transition
        tryUpdateRound(rn, { phase: 'flying' });
      }
    } else if (serverPhase === 'flying') {
      const elapsed = (Date.now() - phaseStartedAt.getTime()) / 1000;
      const crashTime = getTimeForMultiplier(cp);
      if (elapsed < crashTime) {
        runFlying(phaseStartedAt, cp, rn);
      } else {
        // Already crashed, try transition
        tryUpdateRound(rn, { phase: 'crashed' });
      }
    } else if (serverPhase === 'crashed') {
      runCrashed(phaseStartedAt, cp, rn);
    }
  }, [runCountdown, runFlying, runCrashed]);

  applyServerStateRef.current = applyServerState;

  // Initial fetch + realtime subscription for current_round
  useEffect(() => {
    fetchCurrentRound().then(data => applyServerStateRef.current?.(data));

    const channel = (supabase as any)
      .channel('current_round_sync')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'current_round' },
        (payload: any) => {
          applyServerStateRef.current?.(payload.new);
        }
      )
      .subscribe();

    return () => {
      stopAnimation();
      supabase.removeChannel(channel);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // History fetch on mount
  useEffect(() => {
    fetchHistoryFromDb().then(dbHistory => {
      if (dbHistory.length > 0) setHistory(dbHistory);
    });
  }, []);

  // Realtime history subscription
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
            if (prev.some(r => r.id === newRound.id)) return prev;
            return [newRound, ...prev].slice(0, 20);
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const placeBet = useCallback((amount: number) => {
    if (phase !== 'countdown' || playerBet) return;
    if (amount > balance || amount <= 0) return;
    setBalance(prev => prev - amount);
    const bet: Bet = { id: `player-${Date.now()}`, player: 'You', amount, cashedOut: false };
    setPlayerBet(bet);
    setBets(prev => [bet, ...prev]);
  }, [phase, playerBet, balance]);

  const cashOut = useCallback(() => {
    if (phase !== 'flying' || !playerBet || playerBet.cashedOut) return;
    const profit = Math.floor(playerBet.amount * currentMultiplier - playerBet.amount);
    const updatedBet = { ...playerBet, cashedOut: true, cashOutMultiplier: currentMultiplier, profit };
    setPlayerBet(updatedBet);
    setBalance(prev => prev + playerBet.amount + profit);
    setBets(prev => prev.map(b => b.id === playerBet.id ? updatedBet : b));
  }, [phase, playerBet, currentMultiplier]);

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
    startCountdown: () => {}, // Transitions handled via DB
  };
}
