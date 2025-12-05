'use client';

import { useState, useCallback, useEffect } from 'react';
import { useGameChannel } from './useGameChannel';
import type { GameWithPlayers, GamePlayer, Player, Submission } from '@/types/database';

interface UseGameStateOptions {
  code: string;
  autoRefresh?: boolean;
}

export function useGameState({ code, autoRefresh = true }: UseGameStateOptions) {
  const [game, setGame] = useState<GameWithPlayers | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGame = useCallback(async () => {
    if (!code) return;

    try {
      const response = await fetch(`/api/games/${code}`);
      if (!response.ok) {
        throw new Error('Game not found');
      }
      const data = await response.json();
      setGame(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch game');
    } finally {
      setLoading(false);
    }
  }, [code]);

  // Initial fetch
  useEffect(() => {
    fetchGame();
  }, [fetchGame]);

  // Real-time updates
  useGameChannel({
    gameId: game?.id || '',
    onGameUpdated: () => {
      if (autoRefresh) fetchGame();
    },
    onPlayerJoined: () => {
      if (autoRefresh) fetchGame();
    },
    onPlayerLeft: () => {
      if (autoRefresh) fetchGame();
    },
    onSubmissionReceived: () => {
      if (autoRefresh) fetchGame();
    },
  });

  // Game actions
  const updateGame = useCallback(async (updates: Partial<GameWithPlayers>) => {
    if (!code) return;

    try {
      const response = await fetch(`/api/games/${code}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) throw new Error('Failed to update game');

      await fetchGame();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update game');
    }
  }, [code, fetchGame]);

  const startGame = useCallback(async () => {
    await updateGame({ status: 'active', current_round: 1 });
  }, [updateGame]);

  const nextRound = useCallback(async () => {
    if (!game) return;
    const nextRoundNum = game.current_round + 1;

    if (nextRoundNum > game.total_rounds) {
      await updateGame({ status: 'completed' });
    } else {
      await updateGame({ current_round: nextRoundNum, status: 'active' });
    }
  }, [game, updateGame]);

  const triggerJudgment = useCallback(async () => {
    if (!code) return null;

    try {
      const response = await fetch(`/api/games/${code}/judge`, {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Failed to trigger judgment');

      const data = await response.json();
      await fetchGame();
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to trigger judgment');
      return null;
    }
  }, [code, fetchGame]);

  const triggerReflection = useCallback(async () => {
    if (!code) return null;

    try {
      const response = await fetch(`/api/games/${code}/reflection`, {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Failed to trigger reflection');

      return await response.json();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to trigger reflection');
      return null;
    }
  }, [code]);

  const fetchLeaderboard = useCallback(async () => {
    if (!code) return null;

    try {
      const response = await fetch(`/api/games/${code}/leaderboard`);
      if (!response.ok) throw new Error('Failed to fetch leaderboard');
      return await response.json();
    } catch {
      return null;
    }
  }, [code]);

  const fetchSubmissions = useCallback(async (round?: number) => {
    if (!code) return [];

    try {
      const url = round
        ? `/api/games/${code}/submissions?round=${round}`
        : `/api/games/${code}/submissions`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch submissions');
      const data = await response.json();
      return data.submissions || [];
    } catch {
      return [];
    }
  }, [code]);

  return {
    game,
    loading,
    error,
    refresh: fetchGame,
    updateGame,
    startGame,
    nextRound,
    triggerJudgment,
    triggerReflection,
    fetchLeaderboard,
    fetchSubmissions,
  };
}

// Hook for player to manage their own state
export function usePlayer() {
  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('wordmaster_player');
    if (stored) {
      try {
        setPlayer(JSON.parse(stored));
      } catch {
        localStorage.removeItem('wordmaster_player');
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email: string) => {
    try {
      const response = await fetch(`/api/players?email=${encodeURIComponent(email)}`);
      if (response.ok) {
        const data = await response.json();
        setPlayer(data);
        localStorage.setItem('wordmaster_player', JSON.stringify(data));
        return data;
      }
      return null;
    } catch {
      return null;
    }
  }, []);

  const register = useCallback(async (data: {
    email: string;
    display_name: string;
    avatar?: string;
    team_id?: string;
  }) => {
    try {
      const response = await fetch('/api/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error('Failed to register');

      const player = await response.json();
      setPlayer(player);
      localStorage.setItem('wordmaster_player', JSON.stringify(player));
      return player;
    } catch {
      return null;
    }
  }, []);

  const logout = useCallback(() => {
    setPlayer(null);
    localStorage.removeItem('wordmaster_player');
  }, []);

  const updatePlayer = useCallback(async (updates: Partial<Player>) => {
    if (!player?.id) return null;

    try {
      const response = await fetch(`/api/players/${player.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) throw new Error('Failed to update');

      const updated = await response.json();
      setPlayer(updated);
      localStorage.setItem('wordmaster_player', JSON.stringify(updated));
      return updated;
    } catch {
      return null;
    }
  }, [player?.id]);

  return {
    player,
    loading,
    login,
    register,
    logout,
    updatePlayer,
  };
}

// Hook for submitting responses
export function useSubmission(code: string, playerId: string) {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submission, setSubmission] = useState<Submission | null>(null);

  const submit = useCallback(async (content: string) => {
    if (!code || !playerId || !content) return null;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/games/${code}/submissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_id: playerId, content }),
      });

      if (!response.ok) throw new Error('Failed to submit');

      const data = await response.json();
      setSubmission(data);
      setSubmitted(true);
      return data;
    } catch {
      return null;
    } finally {
      setSubmitting(false);
    }
  }, [code, playerId]);

  const reset = useCallback(() => {
    setSubmitted(false);
    setSubmission(null);
  }, []);

  return {
    submit,
    submitting,
    submitted,
    submission,
    reset,
  };
}
