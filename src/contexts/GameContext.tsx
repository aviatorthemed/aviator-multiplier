import { createContext, useContext, ReactNode } from 'react';
import { useGame } from '@/hooks/useGame';

type GameContextType = ReturnType<typeof useGame>;

const GameContext = createContext<GameContextType | null>(null);

export const GameProvider = ({ children }: { children: ReactNode }) => {
  const game = useGame();
  return <GameContext.Provider value={game}>{children}</GameContext.Provider>;
};

export const useGameContext = () => {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGameContext must be used within GameProvider');
  return ctx;
};
