'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useGameChannel } from './useGameChannel';
import type { GameWithPlayers, GamePlayer, Player, Submission } from '@/types/database';

// Utility function for fetch with retry and exponential backoff
async function fetchWithRetry(
  url: string,
  options?: RequestInit,
  maxRetries = 3,
  baseDelay = 1000
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      if (response.ok || response.status === 404 || response.status === 400) {
        // Don't retry client errors or success
        return response;
      }
      // Server error - retry
      throw new Error(`Server error: ${response.status}`);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error('Unknown error');
      if (attempt < maxRetries - 1) {
        // Exponential backoff with jitter
        const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 500;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('Max retries exceeded');
}

interface UseGameStateOptions {
  code: string;
  autoRefresh?: boolean;
}

export function useGameState({ code, autoRefresh = true }: UseGameStateOptions) {
  const [game, setGame] = useState<GameWithPlayers | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const retryCountRef = useRef(0);

  const fetchGame = useCallback(async (retry = false) => {
    if (!code) return;

    if (retry) {
      setIsRetrying(true);
    }

    try {
      const response = await fetchWithRetry(`/api/games/${code}`);
      if (!response.ok) {
        throw new Error('Game not found');
      }
      const data = await response.json();
      setGame(data);
      setError(null);
      retryCountRef.current = 0;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch game';
      setError(errorMessage);

      // Auto-retry on network errors (up to 3 times)
      if (retryCountRef.current < 3 && errorMessage.includes('Server error')) {
        retryCountRef.current++;
        setTimeout(() => fetchGame(true), 2000 * retryCountRef.current);
      }
    } finally {
      setLoading(false);
      setIsRetrying(false);
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
    onPlayerScoreUpdated: () => {
      if (autoRefresh) fetchGame();
    },
    onSubmissionReceived: () => {
      if (autoRefresh) fetchGame();
    },
  });

  // Fallback polling in case real-time fails (every 3 seconds for active games)
  useEffect(() => {
    if (!autoRefresh || !game) return;

    // Poll more frequently for active/judging/leaderboard games, less for lobby/completed
    const pollInterval = (game.status === 'active' || game.status === 'judging' || game.status === 'leaderboard')
      ? 3000
      : 10000;

    const interval = setInterval(() => {
      fetchGame();
    }, pollInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, game?.status, fetchGame]);

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

  // Clear error function
  const clearError = useCallback(() => setError(null), []);

  return {
    game,
    loading,
    error,
    isRetrying,
    clearError,
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
    const stored = localStorage.getItem('wordwrangler_player');
    if (stored) {
      try {
        setPlayer(JSON.parse(stored));
      } catch {
        localStorage.removeItem('wordwrangler_player');
      }
    }
    setLoading(false);
  }, []);

  const register = useCallback(async (data: {
    display_name: string;
    avatar?: string;
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
      localStorage.setItem('wordwrangler_player', JSON.stringify(player));
      return player;
    } catch {
      return null;
    }
  }, []);

  const logout = useCallback(() => {
    setPlayer(null);
    localStorage.removeItem('wordwrangler_player');
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
      localStorage.setItem('wordwrangler_player', JSON.stringify(updated));
      return updated;
    } catch {
      return null;
    }
  }, [player?.id]);

  return {
    player,
    loading,
    register,
    logout,
    updatePlayer,
  };
}

// Hook for game session persistence (player's current game)
export function useGameSession() {
  const [gameCode, setGameCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('wordwrangler_game_session');
    if (stored) {
      setGameCode(stored);
    }
    setLoading(false);
  }, []);

  const joinSession = useCallback((code: string) => {
    setGameCode(code);
    localStorage.setItem('wordwrangler_game_session', code);
  }, []);

  const leaveSession = useCallback(() => {
    setGameCode(null);
    localStorage.removeItem('wordwrangler_game_session');
  }, []);

  return {
    gameCode,
    loading,
    joinSession,
    leaveSession,
  };
}

// Hook for facilitator's active game
export function useFacilitatorSession() {
  const [activeGameCode, setActiveGameCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('wordwrangler_facilitator_game');
    if (stored) {
      setActiveGameCode(stored);
    }
    setLoading(false);
  }, []);

  const setActiveGame = useCallback((code: string) => {
    setActiveGameCode(code);
    localStorage.setItem('wordwrangler_facilitator_game', code);
  }, []);

  const clearActiveGame = useCallback(() => {
    setActiveGameCode(null);
    localStorage.removeItem('wordwrangler_facilitator_game');
  }, []);

  return {
    activeGameCode,
    loading,
    setActiveGame,
    clearActiveGame,
    hasActiveGame: !!activeGameCode,
  };
}

// Hook for submitting responses
export function useSubmission(code: string, playerId: string) {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(async (content: string) => {
    if (!code || !playerId || !content) {
      setError('Missing required fields');
      return null;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetchWithRetry(`/api/games/${code}/submissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_id: playerId, content }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to submit');
      }

      const data = await response.json();
      setSubmission(data);
      setSubmitted(true);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit';
      setError(errorMessage);
      return null;
    } finally {
      setSubmitting(false);
    }
  }, [code, playerId]);

  const reset = useCallback(() => {
    setSubmitted(false);
    setSubmission(null);
    setError(null);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return {
    submit,
    submitting,
    submitted,
    submission,
    error,
    reset,
    clearError,
  };
}
