'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import type { Game, GameStatus } from '@/types/database';

interface GameWithCount extends Game {
  player_count: number;
}

const STATUS_COLORS: Record<GameStatus, string> = {
  lobby: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
  active: 'bg-green-500/20 text-green-400 border-green-500/50',
  judging: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
  reflection: 'bg-purple-500/20 text-purple-400 border-purple-500/50',
  completed: 'bg-gray-500/20 text-gray-400 border-gray-500/50',
};

export default function AdminPage() {
  const [games, setGames] = useState<GameWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<GameStatus | 'all'>('all');
  const [deletingGame, setDeletingGame] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const fetchGames = useCallback(async () => {
    try {
      const url = filter === 'all' ? '/api/games' : `/api/games?status=${filter}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setGames(data);
      }
    } catch (error) {
      console.error('Error fetching games:', error);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchGames();
    // Auto-refresh every 10 seconds
    const interval = setInterval(fetchGames, 10000);
    return () => clearInterval(interval);
  }, [fetchGames]);

  const handleEndGame = async (code: string) => {
    setDeletingGame(code);
    try {
      await fetch(`/api/games/${code}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      });
      await fetchGames();
    } catch (error) {
      console.error('Error ending game:', error);
    } finally {
      setDeletingGame(null);
      setConfirmDelete(null);
    }
  };

  const handleDeleteGame = async (code: string) => {
    setDeletingGame(code);
    try {
      await fetch(`/api/games/${code}`, {
        method: 'DELETE',
      });
      await fetchGames();
    } catch (error) {
      console.error('Error deleting game:', error);
    } finally {
      setDeletingGame(null);
      setConfirmDelete(null);
    }
  };

  const clearFacilitatorSession = () => {
    localStorage.removeItem('wordwrangler_facilitator_game');
    alert('Facilitator session cleared. You can now create a new game.');
  };

  const clearPlayerSession = () => {
    localStorage.removeItem('wordwrangler_player');
    localStorage.removeItem('wordwrangler_game_session');
    alert('Player session cleared.');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const activeGames = games.filter(g => g.status !== 'completed');
  const completedGames = games.filter(g => g.status === 'completed');

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1
              className="text-3xl font-bold"
              style={{ fontFamily: 'var(--font-space-grotesk)' }}
            >
              <span className="text-gradient">ADMIN</span>
              <span className="text-[#FAFAF5]"> DASHBOARD</span>
            </h1>
            <p className="text-[#FAFAF5]/60 mt-1">Manage all game sessions</p>
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" size="sm" onClick={clearFacilitatorSession}>
              Clear Facilitator Session
            </Button>
            <Button variant="ghost" size="sm" onClick={clearPlayerSession}>
              Clear Player Session
            </Button>
            <Button variant="ghost" size="sm" onClick={() => fetchGames()}>
              Refresh
            </Button>
          </div>
        </div>

        {/* Session Management */}
        <Card className="mb-6">
          <h2 className="text-lg font-semibold mb-3">Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => window.location.href = '/facilitator'}>
              Go to Facilitator
            </Button>
            <Button variant="ghost" onClick={() => window.location.href = '/play'}>
              Go to Player Join
            </Button>
          </div>
        </Card>

        {/* Filter */}
        <div className="flex gap-2 mb-6">
          {(['all', 'lobby', 'active', 'judging', 'completed'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === status
                  ? 'bg-[#FFE500] text-[#0A0A0F]'
                  : 'bg-[#FAFAF5]/10 text-[#FAFAF5]/70 hover:bg-[#FAFAF5]/20'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12">
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              Loading games...
            </motion.div>
          </div>
        ) : (
          <>
            {/* Active Games */}
            {(filter === 'all' || filter !== 'completed') && activeGames.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold mb-4 text-[#FFE500]">
                  Active Games ({activeGames.length})
                </h2>
                <div className="space-y-3">
                  {activeGames.map((game) => (
                    <Card key={game.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="text-3xl font-mono font-bold text-[#FFE500]">
                          {game.code}
                        </div>
                        <div>
                          <p className="font-medium">{game.facilitator_name || 'Unnamed Game'}</p>
                          <p className="text-sm text-[#FAFAF5]/50">
                            Round {game.current_round}/{game.total_rounds} • {game.player_count} players
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${STATUS_COLORS[game.status]}`}>
                          {game.status}
                        </span>
                        <span className="text-xs text-[#FAFAF5]/40">
                          {formatDate(game.created_at)}
                        </span>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(`/display/${game.code}`, '_blank')}
                          >
                            View
                          </Button>
                          {confirmDelete === game.code ? (
                            <>
                              <Button
                                variant="accent"
                                size="sm"
                                onClick={() => handleEndGame(game.code)}
                                disabled={deletingGame === game.code}
                              >
                                End
                              </Button>
                              <Button
                                variant="accent"
                                size="sm"
                                onClick={() => handleDeleteGame(game.code)}
                                disabled={deletingGame === game.code}
                              >
                                Delete
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setConfirmDelete(null)}
                              >
                                Cancel
                              </Button>
                            </>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setConfirmDelete(game.code)}
                            >
                              End/Delete
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Completed Games */}
            {(filter === 'all' || filter === 'completed') && completedGames.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-4 text-[#FAFAF5]/60">
                  Completed Games ({completedGames.length})
                </h2>
                <div className="space-y-3">
                  {completedGames.map((game) => (
                    <Card key={game.id} className="flex items-center justify-between opacity-60">
                      <div className="flex items-center gap-4">
                        <div className="text-2xl font-mono font-bold text-[#FAFAF5]/40">
                          {game.code}
                        </div>
                        <div>
                          <p className="font-medium">{game.facilitator_name || 'Unnamed Game'}</p>
                          <p className="text-sm text-[#FAFAF5]/50">
                            {game.total_rounds} rounds • {game.player_count} players
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${STATUS_COLORS[game.status]}`}>
                          {game.status}
                        </span>
                        <span className="text-xs text-[#FAFAF5]/40">
                          {formatDate(game.created_at)}
                        </span>
                        {confirmDelete === game.code ? (
                          <>
                            <Button
                              variant="accent"
                              size="sm"
                              onClick={() => handleDeleteGame(game.code)}
                              disabled={deletingGame === game.code}
                            >
                              Confirm Delete
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setConfirmDelete(null)}
                            >
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setConfirmDelete(game.code)}
                          >
                            Delete
                          </Button>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {games.length === 0 && (
              <div className="text-center py-12 text-[#FAFAF5]/50">
                No games found
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
