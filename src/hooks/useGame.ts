import { useState, useCallback, useRef, useEffect } from 'react';

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
  // Weighted random: mostly 1.0-3.0 with occasional high multipliers
  const r = Math.random();
  if (r < 0.02) return +(Math.random() * 90 + 10).toFixed(2); // 2% chance: 10x-100x
  if (r < 0.1) return +(Math.random() * 7 + 3).toFixed(2);   // 8% chance: 3x-10x
  if (r < 0.4) return +(Math.random() * 1.5 + 1.5).toFixed(2); // 30% chance: 1.5x-3x
  return +(Math.random() * 0.5 + 1.0).toFixed(2);              // 60% chance: 1.0x-1.5x
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

export function useGame() {
  const [phase, setPhase] = useState<GamePhase>('waiting');
  const [countdown, setCountdown] = useState(10);
  const [currentMultiplier, setCurrentMultiplier] = useState(1.00);
  const [crashPoint, setCrashPoint] = useState(0);
  const [nextCrashPoint, setNextCrashPoint] = useState(() => generateCrashPoint());
  const [history, setHistory] = useState<RoundResult[]>(() => {
    return Array.from({ length: 10 }, (_, i) => ({
      id: i + 1,
      crashMultiplier: generateCrashPoint(),
      timestamp: new Date(Date.now() - (10 - i) * 30000),
    }));
  });
  const [bets, setBets] = useState<Bet[]>([]);
  const [playerBet, setPlayerBet] = useState<Bet | null>(null);
  const [balance, setBalance] = useState(10000);

  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const countdownRef = useRef<ReturnType<typeof setInterval>>();
  const roundIdRef = useRef(11);

  const startCountdown = useCallback(() => {
    setCrashPoint(nextCrashPoint);
    setNextCrashPoint(generateCrashPoint());
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
        startFlying();
      }
    }, 1000);
  }, [nextCrashPoint]);

  const startFlying = useCallback(() => {
    setPhase('flying');
    let mult = 1.00;
    const speed = 50; // ms

    intervalRef.current = setInterval(() => {
      // Exponential-ish growth
      const increment = 0.01 + mult * 0.003;
      mult = +(mult + increment).toFixed(2);
      setCurrentMultiplier(mult);

      // Random bot cashouts
      setBets(prev => prev.map(b => {
        if (!b.cashedOut && Math.random() < 0.02) {
          return { ...b, cashedOut: true, cashOutMultiplier: mult, profit: Math.floor(b.amount * mult - b.amount) };
        }
        return b;
      }));

      setCrashPoint(cp => {
        if (mult >= cp) {
          clearInterval(intervalRef.current);
          setPhase('crashed');

          // Auto-lose player bet if not cashed out
          setPlayerBet(prev => {
            if (prev && !prev.cashedOut) {
              return { ...prev, cashedOut: false };
            }
            return prev;
          });

          setHistory(prev => [{
            id: roundIdRef.current++,
            crashMultiplier: cp,
            timestamp: new Date(),
          }, ...prev].slice(0, 20));

          // Auto restart after 3 seconds
          setTimeout(() => {
            startCountdown();
          }, 3000);
        }
        return cp;
      });
    }, speed);
  }, []);

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

  // Auto-start on mount
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
