'use client';

import React, { use, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { useGameState, usePlayer, useSubmission } from '@/hooks/useGameState';
import type { Submission } from '@/types/database';

type PlayerView = 'auth' | 'waiting' | 'playing' | 'submitted' | 'results' | 'leaderboard' | 'winner';

const AVATARS = ['😀', '😎', '🤓', '🦊', '🐱', '🐶', '🦄', '🐸', '🦉', '🐼', '🦋', '🌟', '🔥', '💡', '🎯', '✨'];

export default function PlayerGamePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const { game, fetchSubmissions, fetchLeaderboard } = useGameState({ code, autoRefresh: true });
  const { player, loading: playerLoading, login, register, logout } = usePlayer();
  const { submit, submitting, submitted, submission, reset } = useSubmission(code, player?.id || '');

  const [view, setView] = useState<PlayerView>('auth');
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [avatar, setAvatar] = useState('😀');
  const [isNewPlayer, setIsNewPlayer] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [mySubmission, setMySubmission] = useState<Submission | null>(null);
  const [joinedGame, setJoinedGame] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [timerExpired, setTimerExpired] = useState(false);
  const [leaderboard, setLeaderboard] = useState<{ rank: number; display_name: string; score: number; avatar?: string }[]>([]);

  // Timer sync from server timestamp
  useEffect(() => {
    if (!game || game.status !== 'active') {
      setTimerExpired(false);
      return;
    }

    // Calculate time remaining from server timestamp
    const calculateRemaining = () => {
      if (game.timer_started_at) {
        const elapsed = Math.floor((Date.now() - new Date(game.timer_started_at).getTime()) / 1000);
        return Math.max(0, game.timer_seconds - elapsed);
      } else if (game.timer_paused_remaining !== null) {
        return game.timer_paused_remaining;
      }
      return game.timer_seconds;
    };

    setTimeRemaining(calculateRemaining());

    // Update timer every 250ms for smooth sync
    const interval = setInterval(() => {
      if (game.timer_started_at) {
        const remaining = calculateRemaining();
        setTimeRemaining(remaining);
        if (remaining <= 0 && !timerExpired) {
          setTimerExpired(true);
        }
      }
    }, 250);

    return () => clearInterval(interval);
  }, [game?.status, game?.timer_started_at, game?.timer_seconds, game?.timer_paused_remaining, game?.current_round, timerExpired]);

  // Format time helper
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Auto-join game when player is loaded from session AND game is available
  useEffect(() => {
    if (!playerLoading && player && game && !joinedGame) {
      setView('waiting');
      joinGame(player.id);
    }
  }, [playerLoading, player, game, joinedGame]);

  // Track current round to detect round changes
  const currentRoundRef = useRef<number | null>(null);

  // Handle game state changes
  useEffect(() => {
    if (!game || !player) return;

    // Detect round change
    const roundChanged = currentRoundRef.current !== null &&
                         currentRoundRef.current !== game.current_round;
    currentRoundRef.current = game.current_round;

    if (game.status === 'lobby') {
      setView('waiting');
    } else if (game.status === 'active') {
      // If round just changed, reset submission state and show playing view
      if (roundChanged) {
        setResponseText('');
        setMySubmission(null);
        reset();
        setView('playing');
      } else if (submitted || mySubmission) {
        // Only show submitted if we have a submission for THIS round
        setView('submitted');
      } else {
        setView('playing');
      }
    } else if (game.status === 'judging') {
      fetchMySubmission();
      setView('results');
    } else if (game.status === 'leaderboard') {
      // Fetch and show leaderboard
      fetchLeaderboard().then((lb) => {
        if (lb) setLeaderboard(lb.leaderboard);
      });
      setView('leaderboard');
    } else if (game.status === 'completed') {
      // Show winner view
      fetchLeaderboard().then((lb) => {
        if (lb) setLeaderboard(lb.leaderboard);
      });
      setView('winner');
    }
  }, [game?.status, game?.current_round, player, submitted, mySubmission, reset, fetchLeaderboard]);

  // Poll leaderboard during leaderboard/winner state to catch score updates
  useEffect(() => {
    if (game?.status !== 'leaderboard' && game?.status !== 'completed') return;

    // Fetch immediately
    fetchLeaderboard().then((lb) => {
      if (lb) setLeaderboard(lb.leaderboard);
    });

    // Then poll every 2 seconds
    const interval = setInterval(() => {
      fetchLeaderboard().then((lb) => {
        if (lb) setLeaderboard(lb.leaderboard);
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [game?.status, fetchLeaderboard]);

  // Join game - accepts optional playerId for immediate use after registration
  const joinGame = async (playerId?: string) => {
    const pid = playerId || player?.id;
    if (!pid || !game || joinedGame) return;

    try {
      await fetch(`/api/games/${code}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_id: pid }),
      });
      setJoinedGame(true);
    } catch (error) {
      console.error('Error joining game:', error);
    }
  };

  // Check email
  const handleCheckEmail = async () => {
    if (!email.trim()) return;

    setAuthLoading(true);
    const existingPlayer = await login(email);

    if (existingPlayer) {
      setView('waiting');
      joinGame(existingPlayer.id);
    } else {
      setIsNewPlayer(true);
    }
    setAuthLoading(false);
  };

  // Register new player
  const handleRegister = async () => {
    if (!email.trim() || !displayName.trim()) return;

    setAuthLoading(true);
    const newPlayer = await register({
      email,
      display_name: displayName,
      avatar,
    });

    if (newPlayer) {
      setView('waiting');
      joinGame(newPlayer.id);
    }
    setAuthLoading(false);
  };

  // Submit response
  const handleSubmit = async () => {
    if (!responseText.trim()) return;

    const result = await submit(responseText);
    if (result) {
      setMySubmission(result);
      setView('submitted');
    }
  };

  // Fetch my submission for current round
  const fetchMySubmission = async () => {
    if (!player) return;

    const subs = await fetchSubmissions();
    const mine = subs.find((s: Submission) => s.player_id === player.id);
    if (mine) {
      setMySubmission(mine);
    }
  };

  // Note: Round reset is now handled in the main view effect above

  if (!game) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 2, repeat: Infinity }}>
          Loading game...
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: 'var(--font-space-grotesk)' }}
          >
            <span className="text-gradient">WORD</span>
            <span className="text-[#FAFAF5]">WRANGLER</span>
          </h1>
          {player && (
            <p className="text-sm text-[#FAFAF5]/60 mt-1">
              Playing as {player.display_name}{' '}
              <button
                onClick={() => {
                  logout();
                  setJoinedGame(false);
                  setView('auth');
                }}
                className="text-[#FFE500] hover:underline"
              >
                (not you?)
              </button>
            </p>
          )}
        </div>

        <AnimatePresence mode="wait">
          {/* Auth View */}
          {view === 'auth' && (
            <motion.div
              key="auth"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Card>
                {!isNewPlayer ? (
                  <div className="space-y-4">
                    <h2 className="text-xl font-semibold text-center">Join the Game</h2>
                    <Input
                      label="Email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                    />
                    <Button
                      onClick={handleCheckEmail}
                      disabled={authLoading || !email.trim()}
                      className="w-full"
                    >
                      {authLoading ? 'Checking...' : 'Continue'}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <h2 className="text-xl font-semibold text-center">Create Your Profile</h2>

                    <Input
                      label="Display Name"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Your name"
                    />

                    <div>
                      <label className="block text-sm font-medium text-[#FAFAF5]/80 mb-2">
                        Pick an Avatar
                      </label>
                      <div className="grid grid-cols-8 gap-2">
                        {AVATARS.map((a) => (
                          <button
                            key={a}
                            onClick={() => setAvatar(a)}
                            className={`text-2xl p-2 rounded-lg transition-all ${
                              avatar === a
                                ? 'bg-[#FFE500]/30 scale-110'
                                : 'bg-[#FAFAF5]/5 hover:bg-[#FAFAF5]/10'
                            }`}
                          >
                            {a}
                          </button>
                        ))}
                      </div>
                    </div>

                    <Button
                      onClick={handleRegister}
                      disabled={authLoading || !displayName.trim()}
                      className="w-full"
                    >
                      {authLoading ? 'Creating...' : 'Join Game'}
                    </Button>
                  </div>
                )}
              </Card>
            </motion.div>
          )}

          {/* Waiting View */}
          {view === 'waiting' && (
            <motion.div
              key="waiting"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center"
            >
              <Card>
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="text-6xl mb-4"
                >
                  ⏳
                </motion.div>
                <h2 className="text-xl font-semibold mb-2">You're in!</h2>
                <p className="text-[#FAFAF5]/60">
                  Waiting for the game to start...
                </p>
              </Card>
            </motion.div>
          )}

          {/* Playing View */}
          {view === 'playing' && game.current_task?.task && (
            <motion.div
              key="playing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {/* Timer */}
              <div className="text-center mb-4">
                {timerExpired ? (
                  <motion.p
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 0.5, repeat: Infinity }}
                    className="text-3xl font-bold text-[#FF2E6C]"
                    style={{ fontFamily: 'var(--font-space-grotesk)' }}
                  >
                    TIME&apos;S UP!
                  </motion.p>
                ) : (
                  <motion.p
                    className={`text-4xl font-mono font-bold ${
                      timeRemaining <= 30 ? 'text-[#FF2E6C]' :
                      timeRemaining <= 60 ? 'text-[#F59E0B]' :
                      'text-[#FFE500]'
                    }`}
                    animate={timeRemaining <= 10 ? { scale: [1, 1.05, 1] } : {}}
                    transition={{ duration: 1, repeat: timeRemaining <= 10 ? Infinity : 0 }}
                  >
                    {formatTime(timeRemaining)}
                  </motion.p>
                )}
              </div>

              <Card variant="glow" className="mb-4">
                <p className="text-sm text-[#FAFAF5]/60 mb-2">
                  Round {game.current_round} of {game.total_rounds}
                </p>
                <h2 className="text-xl font-bold text-[#FFE500] mb-3">
                  {game.current_task.task.title}
                </h2>
                <p className="text-[#FAFAF5]/80 text-sm">
                  {game.current_task.task.description}
                </p>
              </Card>

              <div className="space-y-4">
                <textarea
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  placeholder="Write your response..."
                  className="w-full px-4 py-3 rounded-lg bg-[#FAFAF5]/10 border border-[#FAFAF5]/20 text-[#FAFAF5] placeholder-[#FAFAF5]/40 min-h-[150px] focus:outline-none focus:ring-2 focus:ring-[#FFE500]/50 font-mono"
                />

                <Button
                  onClick={handleSubmit}
                  disabled={submitting || !responseText.trim()}
                  className="w-full"
                  size="lg"
                >
                  {submitting ? 'Submitting...' : 'Submit'}
                </Button>
              </div>
            </motion.div>
          )}

          {/* Submitted View */}
          {view === 'submitted' && (
            <motion.div
              key="submitted"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center"
            >
              <Card>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring" }}
                  className="text-6xl mb-4"
                >
                  ✅
                </motion.div>
                <h2 className="text-xl font-semibold mb-2">Submitted!</h2>
                <p className="text-[#FAFAF5]/60">
                  Waiting for other players...
                </p>
              </Card>
            </motion.div>
          )}

          {/* Results View */}
          {view === 'results' && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Card className="text-center">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="text-6xl mb-4"
                >
                  ⚖️
                </motion.div>
                <h2 className="text-xl font-semibold mb-2">Judging Time!</h2>
                <p className="text-[#FAFAF5]/60 mb-4">
                  The facilitator is reviewing submissions...
                </p>

                {mySubmission && (
                  <div className="mt-6 p-4 bg-[#0A0A0F] rounded-lg text-left">
                    <p className="text-xs text-[#FAFAF5]/50 mb-1">Your submission:</p>
                    <p className="font-mono text-sm">{mySubmission.content}</p>
                  </div>
                )}
              </Card>
            </motion.div>
          )}

          {/* Leaderboard View */}
          {view === 'leaderboard' && (
            <motion.div
              key="leaderboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Card>
                <h2 className="text-xl font-bold text-center text-[#FFE500] mb-4" style={{ fontFamily: 'var(--font-space-grotesk)' }}>
                  Leaderboard
                </h2>
                <p className="text-center text-[#FAFAF5]/60 mb-4">
                  Round {game?.current_round} of {game?.total_rounds}
                </p>

                {leaderboard.length === 0 ? (
                  <div className="text-center py-8">
                    <motion.div
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="text-[#FAFAF5]/60"
                    >
                      Loading scores...
                    </motion.div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {leaderboard.map((entry, index) => {
                      const isMe = player && entry.display_name === player.display_name;
                      return (
                        <motion.div
                          key={entry.display_name}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className={`flex items-center gap-3 p-3 rounded-lg ${
                            isMe
                              ? 'bg-[#FFE500]/20 border border-[#FFE500]/50'
                              : index === 0
                              ? 'bg-[#FAFAF5]/10'
                              : 'bg-[#FAFAF5]/5'
                          }`}
                        >
                          <span className="text-lg font-bold w-8">
                            {index === 0 ? '👑' : `#${entry.rank}`}
                          </span>
                          <span className="text-xl">{entry.avatar || '👤'}</span>
                          <span className={`flex-1 font-medium ${isMe ? 'text-[#FFE500]' : ''}`}>
                            {entry.display_name}
                            {isMe && <span className="text-xs ml-1">(you)</span>}
                          </span>
                          <span className="text-xl font-bold">{entry.score}</span>
                        </motion.div>
                      );
                    })}
                  </div>
                )}

                <p className="text-center text-[#FAFAF5]/50 text-sm mt-4">
                  Waiting for next round...
                </p>
              </Card>
            </motion.div>
          )}

          {/* Winner View */}
          {view === 'winner' && (
            <motion.div
              key="winner"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center"
            >
              <Card>
                <motion.div
                  animate={{
                    rotate: [0, 10, -10, 0],
                    scale: [1, 1.1, 1]
                  }}
                  transition={{ duration: 0.5, repeat: 3 }}
                  className="text-6xl mb-4"
                >
                  🏆
                </motion.div>

                <h2 className="text-xl font-bold text-[#FFE500] mb-2" style={{ fontFamily: 'var(--font-space-grotesk)' }}>
                  Game Over!
                </h2>

                {leaderboard[0] && (
                  <div className="mb-4">
                    <p className="text-[#FAFAF5]/60 mb-1">Winner</p>
                    <p className="text-2xl font-bold">{leaderboard[0].display_name}</p>
                    <p className="text-[#FAFAF5]/60">{leaderboard[0].score} points</p>
                  </div>
                )}

                {/* Show player's rank */}
                {player && leaderboard.length > 0 && (
                  <div className="mt-6 pt-4 border-t border-[#FAFAF5]/10">
                    {(() => {
                      const myRank = leaderboard.findIndex(e => e.display_name === player.display_name);
                      const myEntry = leaderboard[myRank];
                      if (myRank === -1 || !myEntry) return null;
                      return (
                        <div className={`p-3 rounded-lg ${myRank === 0 ? 'bg-[#FFE500]/20' : 'bg-[#FAFAF5]/5'}`}>
                          <p className="text-sm text-[#FAFAF5]/60 mb-1">Your result</p>
                          <p className="text-lg font-bold">
                            {myRank === 0 ? '🏆 You won!' : `#${myRank + 1} - ${myEntry.score} points`}
                          </p>
                        </div>
                      );
                    })()}
                  </div>
                )}

                <p className="text-[#FAFAF5]/50 text-sm mt-4">
                  Thanks for playing!
                </p>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
