'use client';

import { use, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { useGameState, usePlayer, useSubmission } from '@/hooks/useGameState';
import type { Team, Submission } from '@/types/database';

type PlayerView = 'auth' | 'waiting' | 'playing' | 'submitted' | 'results' | 'leaderboard';

const AVATARS = ['😀', '😎', '🤓', '🦊', '🐱', '🐶', '🦄', '🐸', '🦉', '🐼', '🦋', '🌟', '🔥', '💡', '🎯', '✨'];

export default function PlayerGamePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const { game, fetchSubmissions } = useGameState({ code, autoRefresh: true });
  const { player, loading: playerLoading, login, register } = usePlayer();
  const { submit, submitting, submitted, submission, reset } = useSubmission(code, player?.id || '');

  const [view, setView] = useState<PlayerView>('auth');
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [avatar, setAvatar] = useState('😀');
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [isNewPlayer, setIsNewPlayer] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [mySubmission, setMySubmission] = useState<Submission | null>(null);
  const [joinedGame, setJoinedGame] = useState(false);

  // Load teams
  useEffect(() => {
    fetch('/api/teams')
      .then(res => res.json())
      .then(data => setTeams(data))
      .catch(() => {});
  }, []);

  // Check if player is already loaded
  useEffect(() => {
    if (!playerLoading && player) {
      setView('waiting');
      joinGame();
    }
  }, [playerLoading, player]);

  // Handle game state changes
  useEffect(() => {
    if (!game || !player) return;

    if (game.status === 'lobby') {
      setView('waiting');
    } else if (game.status === 'active') {
      if (submitted || mySubmission) {
        setView('submitted');
      } else {
        setView('playing');
        reset();
      }
    } else if (game.status === 'judging' || game.status === 'completed') {
      fetchMySubmission();
      setView('results');
    }
  }, [game?.status, game?.current_round, player]);

  // Join game
  const joinGame = async () => {
    if (!player || !game || joinedGame) return;

    try {
      await fetch(`/api/games/${code}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_id: player.id }),
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
      joinGame();
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
      team_id: selectedTeam || undefined,
    });

    if (newPlayer) {
      setView('waiting');
      joinGame();
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

  // Reset for new round
  useEffect(() => {
    if (game?.status === 'active') {
      setResponseText('');
      setMySubmission(null);
    }
  }, [game?.current_round]);

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
              Playing as {player.display_name}
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

                    {teams.length > 0 && (
                      <div>
                        <label className="block text-sm font-medium text-[#FAFAF5]/80 mb-1">
                          Team (optional)
                        </label>
                        <select
                          value={selectedTeam}
                          onChange={(e) => setSelectedTeam(e.target.value)}
                          className="w-full px-4 py-3 rounded-lg bg-[#FAFAF5]/10 border border-[#FAFAF5]/20 text-[#FAFAF5]"
                        >
                          <option value="">No team</option>
                          {teams.map((team) => (
                            <option key={team.id} value={team.id}>{team.name}</option>
                          ))}
                        </select>
                      </div>
                    )}

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
        </AnimatePresence>
      </div>
    </div>
  );
}
