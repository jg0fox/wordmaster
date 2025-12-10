'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { useGameState, useFacilitatorSession } from '@/hooks/useGameState';
import { RichTextDisplay } from '@/components/ui/RichTextDisplay';
import type { Submission, ReflectionResponse } from '@/types/database';

type View = 'setup' | 'lobby' | 'playing' | 'judging' | 'leaderboard' | 'reflection' | 'winner';

export default function FacilitatorPage() {
  const [gameCode, setGameCode] = useState<string | null>(null);
  const [view, setView] = useState<View>('setup');
  const [gameName, setGameName] = useState('');
  const [totalRounds, setTotalRounds] = useState(5);
  const [timerSeconds, setTimerSeconds] = useState(180);
  const [creating, setCreating] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [playerScores, setPlayerScores] = useState<Record<string, number>>({});
  const [awardingPoints, setAwardingPoints] = useState(false);
  const [reflection, setReflection] = useState<ReflectionResponse | null>(null);
  const [leaderboard, setLeaderboard] = useState<{ rank: number; display_name: string; score: number; avatar?: string }[]>([]);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [aiAssistLoading, setAiAssistLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<Record<string, { score: number; greg_quote: string; alex_quote: string }>>({});

  const { activeGameCode, loading: sessionLoading, setActiveGame, clearActiveGame } = useFacilitatorSession();

  const { game, startGame, nextRound, updateGame, triggerReflection, fetchLeaderboard, fetchSubmissions, refresh } = useGameState({
    code: gameCode || '',
    autoRefresh: true,
  });

  // Check for existing active game on mount
  useEffect(() => {
    if (sessionLoading) return;

    if (activeGameCode && !gameCode) {
      // Verify the game still exists and is not completed
      fetch(`/api/games/${activeGameCode}`)
        .then(res => {
          if (!res.ok) throw new Error('Game not found');
          return res.json();
        })
        .then(gameData => {
          if (gameData && gameData.status !== 'completed') {
            setGameCode(activeGameCode);
            setTimerSeconds(gameData.timer_seconds);
            if (gameData.status === 'lobby') {
              setView('lobby');
            } else if (gameData.status === 'active') {
              setView('playing');
              // Calculate remaining time from server timestamp
              if (gameData.timer_started_at) {
                const elapsed = Math.floor((Date.now() - new Date(gameData.timer_started_at).getTime()) / 1000);
                setTimeRemaining(Math.max(0, gameData.timer_seconds - elapsed));
                setTimerRunning(true);
              } else if (gameData.timer_paused_remaining !== null) {
                setTimeRemaining(gameData.timer_paused_remaining);
                setTimerRunning(false);
              }
            } else if (gameData.status === 'judging') {
              setView('judging');
            }
          } else {
            clearActiveGame();
          }
        })
        .catch(() => {
          clearActiveGame();
        });
    }
  }, [activeGameCode, sessionLoading, gameCode, clearActiveGame]);

  // Create new game
  const createGame = async () => {
    setCreating(true);
    try {
      const response = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          facilitator_name: gameName || 'Wordwrangler Game',
          total_rounds: totalRounds,
          timer_seconds: timerSeconds,
        }),
      });

      if (!response.ok) throw new Error('Failed to create game');

      const data = await response.json();
      setGameCode(data.code);
      setActiveGame(data.code);
      setView('lobby');
    } catch (error) {
      console.error('Error creating game:', error);
    } finally {
      setCreating(false);
    }
  };

  // Cancel current game
  const handleCancelGame = async () => {
    if (!gameCode) return;

    try {
      await fetch(`/api/games/${gameCode}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      });
    } catch (error) {
      console.error('Error canceling game:', error);
    }

    clearActiveGame();
    setGameCode(null);
    setView('setup');
    setShowCancelConfirm(false);
  };

  const [timerExpired, setTimerExpired] = useState(false);

  // Timer sync - calculate from server timestamp
  useEffect(() => {
    if (!game || !timerRunning) return;

    const interval = setInterval(() => {
      if (game.timer_started_at) {
        const elapsed = Math.floor((Date.now() - new Date(game.timer_started_at).getTime()) / 1000);
        const remaining = Math.max(0, game.timer_seconds - elapsed);
        setTimeRemaining(remaining);
        if (remaining <= 0) {
          setTimerRunning(false);
          setTimerExpired(true);
        }
      }
    }, 250); // More frequent updates for better sync

    return () => clearInterval(interval);
  }, [game, timerRunning]);

  // Auto-transition to judging when timer expires (after 3 second delay)
  useEffect(() => {
    if (!timerExpired || view !== 'playing') return;

    const timeout = setTimeout(() => {
      handleEndRound();
      setTimerExpired(false);
    }, 3000);

    return () => clearTimeout(timeout);
  }, [timerExpired, view]);

  // Handle game status changes
  useEffect(() => {
    if (!game) return;

    if (game.status === 'lobby') {
      setView('lobby');
    } else if (game.status === 'active' && game.current_round > 0) {
      setView('playing');
      // Sync timer state from server
      if (game.timer_started_at) {
        setTimerRunning(true);
      } else if (game.timer_paused_remaining !== null) {
        setTimeRemaining(game.timer_paused_remaining);
        setTimerRunning(false);
      }
    } else if (game.status === 'judging') {
      setView('judging');
    } else if (game.status === 'leaderboard') {
      setView('leaderboard');
      // Fetch leaderboard data if not already loaded
      fetchLeaderboard().then((lb) => {
        if (lb) setLeaderboard(lb.leaderboard);
      });
    } else if (game.status === 'completed') {
      setView('winner');
    }
  }, [game?.status, game?.current_round, game?.timer_started_at, game?.timer_paused_remaining, fetchLeaderboard]);

  // Start the game
  const handleStartGame = async () => {
    // Set timer_started_at to now
    await updateGame({
      status: 'active',
      current_round: 1,
      timer_started_at: new Date().toISOString(),
      timer_paused_remaining: null,
    });
    setTimerRunning(true);
  };

  // Start timer (resume)
  const handleStartTimer = async () => {
    // Resume from paused state - use current remaining time
    const newTimerSeconds = timeRemaining;
    await updateGame({
      timer_seconds: newTimerSeconds,
      timer_started_at: new Date().toISOString(),
      timer_paused_remaining: null,
    });
    setTimerRunning(true);
  };

  // Pause timer
  const handlePauseTimer = async () => {
    setTimerRunning(false);
    await updateGame({
      timer_started_at: null,
      timer_paused_remaining: timeRemaining,
    });
  };

  // Add time
  const handleAddTime = async () => {
    if (timerRunning && game?.timer_started_at) {
      // If running, extend the timer_seconds
      const elapsed = Math.floor((Date.now() - new Date(game.timer_started_at).getTime()) / 1000);
      await updateGame({
        timer_seconds: game.timer_seconds + 30,
      });
      setTimeRemaining(Math.max(0, game.timer_seconds + 30 - elapsed));
    } else {
      // If paused, add to paused_remaining
      const newRemaining = timeRemaining + 30;
      setTimeRemaining(newRemaining);
      await updateGame({
        timer_paused_remaining: newRemaining,
      });
    }
  };

  // End round and go to judging
  const handleEndRound = async () => {
    setTimerRunning(false);

    // Update game status to judging
    await updateGame({
      status: 'judging',
      timer_started_at: null,
      timer_paused_remaining: null,
    });

    // Fetch submissions for judging
    const subs = await fetchSubmissions();
    setSubmissions(subs);
    setPlayerScores({});
    setAiSuggestions({}); // Reset AI suggestions for new round
    setView('judging');
  };

  // Set score for a specific player's submission
  const handleSetScore = (playerId: string, score: number) => {
    setPlayerScores(prev => ({
      ...prev,
      [playerId]: score
    }));
  };

  // Finish judging - award all scores and move to leaderboard
  const handleFinishJudging = async () => {
    if (!gameCode) return;

    setAwardingPoints(true);
    try {
      // Award points to all scored players
      const awardPromises = Object.entries(playerScores).map(([playerId, points]) =>
        fetch(`/api/games/${gameCode}/award`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ player_id: playerId, points }),
        })
      );

      await Promise.all(awardPromises);

      // Show leaderboard
      await handleShowLeaderboard();
    } catch (error) {
      console.error('Error awarding points:', error);
    } finally {
      setAwardingPoints(false);
    }
  };

  // Skip judging (no scores)
  const handleSkipJudging = async () => {
    await handleShowLeaderboard();
  };

  // AI Assist - get optional AI suggestions for judging
  const handleAiAssist = async () => {
    if (!gameCode || aiAssistLoading) return;

    setAiAssistLoading(true);
    try {
      const response = await fetch(`/api/games/${gameCode}/judge`, {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Failed to get AI suggestions');

      const data = await response.json();

      // Build suggestions map from judged submissions
      const suggestions: Record<string, { score: number; greg_quote: string; alex_quote: string }> = {};
      if (data.judged) {
        for (const judged of data.judged) {
          suggestions[judged.player_id] = {
            score: judged.ai_score || 3,
            greg_quote: judged.greg_quote || '',
            alex_quote: judged.alex_quote || '',
          };
        }
      }
      setAiSuggestions(suggestions);

      // Refetch submissions to get updated AI scores
      const subs = await fetchSubmissions();
      setSubmissions(subs);
    } catch (error) {
      console.error('Error getting AI suggestions:', error);
    } finally {
      setAiAssistLoading(false);
    }
  };

  // Show leaderboard - transition game status so all clients sync
  const handleShowLeaderboard = async () => {
    // Update game status to leaderboard so display and players sync
    await updateGame({ status: 'leaderboard' });

    const lb = await fetchLeaderboard();
    if (lb) {
      setLeaderboard(lb.leaderboard);
    }
    setView('leaderboard');
  };

  // Next round
  const handleNextRound = async () => {
    if (game && game.current_round >= game.total_rounds) {
      // Game over, show reflection
      handleStartReflection();
    } else {
      await updateGame({
        status: 'active',
        current_round: (game?.current_round || 0) + 1,
        timer_seconds: timerSeconds,
        timer_started_at: new Date().toISOString(),
        timer_paused_remaining: null,
      });
      setTimerRunning(true);
      setView('playing');
    }
  };

  // Start reflection
  const handleStartReflection = async () => {
    setView('reflection');
    const ref = await triggerReflection();
    setReflection(ref);
  };

  // Open display window
  const openDisplay = () => {
    if (gameCode) {
      window.open(`/display/${gameCode}`, '_blank', 'width=1920,height=1080');
    }
  };

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // End game and start new one
  const handleNewGame = () => {
    clearActiveGame();
    setGameCode(null);
    setView('setup');
    setReflection(null);
    setLeaderboard([]);
  };

  // Show loading while checking session
  if (sessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 2, repeat: Infinity }}>
          Loading...
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1
            className="text-3xl font-bold text-gradient"
            style={{ fontFamily: 'var(--font-space-grotesk)' }}
          >
            WORDWRANGLER
          </h1>
          {gameCode && (
            <div className="flex items-center gap-4">
              <span className="text-[#FAFAF5]/60">Code: <span className="font-mono text-[#FFE500]">{gameCode}</span></span>
              <Button variant="ghost" size="sm" onClick={openDisplay}>
                Open Display
              </Button>
            </div>
          )}
        </div>

        <AnimatePresence mode="wait">
          {/* Setup View */}
          {view === 'setup' && (
            <motion.div
              key="setup"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Card className="max-w-md mx-auto">
                <h2 className="text-2xl font-bold mb-6" style={{ fontFamily: 'var(--font-space-grotesk)' }}>
                  Create New Game
                </h2>

                <div className="space-y-4">
                  <Input
                    label="Game Name"
                    value={gameName}
                    onChange={(e) => setGameName(e.target.value)}
                    placeholder="e.g., Friday Team Challenge"
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[#FAFAF5]/80 mb-1">Rounds</label>
                      <select
                        value={totalRounds}
                        onChange={(e) => setTotalRounds(Number(e.target.value))}
                        className="w-full px-4 py-3 rounded-lg bg-[#FAFAF5]/10 border border-[#FAFAF5]/20 text-[#FAFAF5]"
                      >
                        {[3, 4, 5, 6, 7].map((n) => (
                          <option key={n} value={n}>{n} rounds</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#FAFAF5]/80 mb-1">Time per Round</label>
                      <select
                        value={timerSeconds}
                        onChange={(e) => setTimerSeconds(Number(e.target.value))}
                        className="w-full px-4 py-3 rounded-lg bg-[#FAFAF5]/10 border border-[#FAFAF5]/20 text-[#FAFAF5]"
                      >
                        {[120, 150, 180, 210, 240, 300].map((n) => (
                          <option key={n} value={n}>{Math.floor(n / 60)}:{(n % 60).toString().padStart(2, '0')}</option>
                        ))}
                      </select>
                      <p className="text-xs text-[#FAFAF5]/50 mt-1">
                        How long players have to complete each challenge
                      </p>
                    </div>
                  </div>

                  <Button
                    onClick={createGame}
                    disabled={creating}
                    className="w-full mt-4"
                    size="lg"
                  >
                    {creating ? 'Creating...' : 'Create Game'}
                  </Button>
                </div>
              </Card>
            </motion.div>
          )}

          {/* Lobby View */}
          {view === 'lobby' && game && (
            <motion.div
              key="lobby"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="text-center mb-8">
                <p className="text-[#FAFAF5]/60 mb-2">Join Code</p>
                <p className="text-6xl font-mono font-bold text-[#FFE500] tracking-wider">
                  {gameCode}
                </p>
                {game.facilitator_name && (
                  <p className="text-[#FAFAF5]/50 mt-2">{game.facilitator_name}</p>
                )}
              </div>

              {/* Players Section */}
              <Card className="mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold">
                    Players ({game.game_players?.length || 0})
                  </h3>
                </div>
                <div className="space-y-3">
                  {game.game_players?.map((gp) => (
                    <div
                      key={gp.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-[#FAFAF5]/5"
                    >
                      <span className="text-2xl">{gp.player?.avatar || '👤'}</span>
                      <div className="flex-1">
                        <p className="font-medium">{gp.player?.display_name}</p>
                        <p className="text-xs text-[#FAFAF5]/50">{gp.player?.email}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {(!game.game_players || game.game_players.length === 0) && (
                  <p className="text-[#FAFAF5]/50 text-center py-8">
                    Waiting for players to join...
                  </p>
                )}
              </Card>

              <div className="flex gap-4 justify-center">
                <Button onClick={() => setShowCancelConfirm(true)} variant="ghost" size="lg">
                  Cancel Game
                </Button>
                <Button onClick={openDisplay} variant="ghost" size="lg">
                  Open Display
                </Button>
                <Button
                  onClick={handleStartGame}
                  disabled={!game.game_players || game.game_players.length === 0}
                  size="lg"
                >
                  Start Game
                </Button>
              </div>

              {/* Cancel confirmation modal */}
              {showCancelConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                  <Card className="max-w-sm mx-4">
                    <h3 className="text-xl font-bold mb-4">Cancel Game?</h3>
                    <p className="text-[#FAFAF5]/70 mb-6">
                      This will end the current game session. All players will need to rejoin a new game.
                    </p>
                    <div className="flex gap-4">
                      <Button onClick={() => setShowCancelConfirm(false)} variant="ghost" className="flex-1">
                        Keep Playing
                      </Button>
                      <Button onClick={handleCancelGame} variant="accent" className="flex-1">
                        Cancel Game
                      </Button>
                    </div>
                  </Card>
                </div>
              )}

            </motion.div>
          )}

          {/* Playing View */}
          {view === 'playing' && game && (
            <motion.div
              key="playing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="text-center mb-6">
                <p className="text-[#FAFAF5]/60">Round {game.current_round} of {game.total_rounds}</p>
              </div>

              {/* Timer */}
              <Card variant="glow" className="text-center mb-6">
                {timerExpired ? (
                  <motion.div
                    initial={{ scale: 0.5 }}
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 0.5, repeat: Infinity }}
                  >
                    <p className="text-5xl font-bold text-[#FF2E6C] mb-2">TIME&apos;S UP!</p>
                    <p className="text-lg text-[#FAFAF5]/60">Moving to judging in 3 seconds...</p>
                  </motion.div>
                ) : (
                  <p className={`text-7xl font-mono font-bold ${
                    timeRemaining <= 30 ? 'text-[#FF2E6C]' :
                    timeRemaining <= 60 ? 'text-[#F59E0B]' :
                    'text-[#FFE500]'
                  }`}>
                    {formatTime(timeRemaining)}
                  </p>
                )}
              </Card>

              {/* Current Task */}
              {game.current_task?.task && (
                <Card className="mb-6">
                  <h3 className="text-xl font-bold text-[#FFE500] mb-2">
                    {game.current_task.task.title}
                  </h3>
                  <p className="text-[#FAFAF5]/80">
                    {game.current_task.task.description}
                  </p>
                </Card>
              )}

              {/* Timer Controls */}
              <div className="flex gap-4 justify-center">
                {timerRunning ? (
                  <Button onClick={handlePauseTimer} variant="ghost" size="lg">
                    Pause
                  </Button>
                ) : (
                  <Button onClick={handleStartTimer} variant="ghost" size="lg">
                    Resume
                  </Button>
                )}
                <Button onClick={handleAddTime} variant="ghost" size="lg">
                  +30s
                </Button>
                <Button onClick={handleEndRound} variant="accent" size="lg">
                  End Round
                </Button>
              </div>
            </motion.div>
          )}

          {/* Judging View - Human Scoring */}
          {view === 'judging' && (
            <motion.div
              key="judging"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-space-grotesk)' }}>
                  Score Submissions
                </h2>
                {submissions.length > 0 && (
                  <Button
                    onClick={handleAiAssist}
                    disabled={aiAssistLoading || Object.keys(aiSuggestions).length > 0}
                    variant="ghost"
                    size="sm"
                  >
                    {aiAssistLoading ? '🤖 Thinking...' : Object.keys(aiSuggestions).length > 0 ? '🤖 AI Assisted' : '🤖 AI Assist'}
                  </Button>
                )}
              </div>

              {submissions.length === 0 ? (
                <div className="text-center py-20">
                  <p className="text-xl text-[#FAFAF5]/60">No submissions this round</p>
                  <Button onClick={handleSkipJudging} size="lg" className="mt-4">
                    Continue to Leaderboard
                  </Button>
                </div>
              ) : (
                <>
                  {/* Progress indicator */}
                  <div className="mb-6 text-center">
                    <p className="text-[#FAFAF5]/60">
                      Scored: {Object.keys(playerScores).length} / {submissions.length}
                    </p>
                  </div>

                  <div className="space-y-4 mb-8">
                    {submissions.map((submission) => {
                      const aiSuggestion = aiSuggestions[submission.player_id] || (submission.ai_score ? {
                        score: submission.ai_score,
                        greg_quote: submission.greg_quote || '',
                        alex_quote: submission.alex_quote || '',
                      } : null);
                      const currentScore = playerScores[submission.player_id];
                      const isScored = currentScore !== undefined;

                      return (
                        <Card
                          key={submission.id}
                          className={`transition-all ${
                            isScored
                              ? 'ring-2 ring-[#22C55E] bg-[#22C55E]/10'
                              : ''
                          }`}
                        >
                          <div className="flex items-start gap-4">
                            <div className="flex items-center gap-3">
                              <span className="text-3xl">{submission.player?.avatar || '👤'}</span>
                              <div>
                                <h3 className="font-bold">{submission.player?.display_name}</h3>
                              </div>
                            </div>
                            <div className="ml-auto flex items-center gap-2">
                              {aiSuggestion && (
                                <span className="text-sm px-2 py-1 rounded bg-[#2D1B69]/50 text-[#FAFAF5]/70">
                                  🤖 {aiSuggestion.score}/5
                                </span>
                              )}
                              {isScored && (
                                <span className="text-[#22C55E] font-bold text-lg">
                                  {currentScore} pts ✓
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="mt-4 bg-[#0A0A0F] rounded-lg p-4 text-sm">
                            <RichTextDisplay content={submission.content} />
                          </div>

                          {/* AI Commentary (if available) */}
                          {aiSuggestion && (aiSuggestion.greg_quote || aiSuggestion.alex_quote) && (
                            <div className="mt-3 pt-3 border-t border-[#FAFAF5]/10 text-sm">
                              {aiSuggestion.greg_quote && (
                                <p className="text-[#FAFAF5]/60 mb-1">
                                  <span className="text-[#FF2E6C]">Greg:</span> {aiSuggestion.greg_quote}
                                </p>
                              )}
                              {aiSuggestion.alex_quote && (
                                <p className="text-[#FAFAF5]/60">
                                  <span className="text-[#2D1B69]">Alex:</span> {aiSuggestion.alex_quote}
                                </p>
                              )}
                            </div>
                          )}

                          {/* Inline score buttons */}
                          <div className="mt-4 pt-4 border-t border-[#FAFAF5]/10">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-[#FAFAF5]/60 mr-2">Score:</span>
                              {[1, 2, 3, 4, 5].map((score) => (
                                <button
                                  key={score}
                                  onClick={() => handleSetScore(submission.player_id, score)}
                                  className={`w-10 h-10 rounded-lg font-bold transition-all ${
                                    currentScore === score
                                      ? 'bg-[#FFE500] text-[#0A0A0F]'
                                      : 'bg-[#FAFAF5]/10 text-[#FAFAF5]/70 hover:bg-[#FAFAF5]/20'
                                  }`}
                                >
                                  {score}
                                </button>
                              ))}
                              {isScored && (
                                <button
                                  onClick={() => {
                                    const newScores = { ...playerScores };
                                    delete newScores[submission.player_id];
                                    setPlayerScores(newScores);
                                  }}
                                  className="ml-2 text-sm text-[#FAFAF5]/40 hover:text-[#FF2E6C]"
                                >
                                  Clear
                                </button>
                              )}
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>

                  {/* Finish Judging Section */}
                  <div className="flex justify-center gap-4">
                    <Button onClick={handleSkipJudging} variant="ghost" size="lg">
                      Skip Round
                    </Button>
                    <Button
                      onClick={handleFinishJudging}
                      disabled={awardingPoints || Object.keys(playerScores).length === 0}
                      size="lg"
                    >
                      {awardingPoints ? 'Awarding...' : `Award Points (${Object.keys(playerScores).length} scored)`}
                    </Button>
                  </div>
                </>
              )}
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
              <h2 className="text-3xl font-bold text-center mb-6" style={{ fontFamily: 'var(--font-space-grotesk)' }}>
                Leaderboard
              </h2>

              <Card className="mb-6">
                <div className="space-y-3">
                  {leaderboard.map((entry, index) => (
                    <motion.div
                      key={entry.display_name}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`flex items-center gap-4 p-4 rounded-lg ${
                        index === 0 ? 'bg-[#FFE500]/20 border border-[#FFE500]/50' : 'bg-[#FAFAF5]/5'
                      }`}
                    >
                      <span className="text-2xl font-bold w-8">
                        {index === 0 ? '👑' : `#${entry.rank}`}
                      </span>
                      <span className="text-2xl">{entry.avatar || '👤'}</span>
                      <span className="flex-1 font-medium">{entry.display_name}</span>
                      <span className="text-2xl font-bold text-[#FFE500]">{entry.score}</span>
                    </motion.div>
                  ))}
                </div>
              </Card>

              {/* Timer adjustment for next round */}
              {game && game.current_round < game.total_rounds && (
                <Card className="mb-6">
                  <h3 className="text-lg font-semibold mb-4">Next Round Timer</h3>
                  <div className="flex flex-wrap justify-center gap-3">
                    {[60, 90, 120, 180, 240, 300].map((secs) => (
                      <button
                        key={secs}
                        onClick={() => setTimerSeconds(secs)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          timerSeconds === secs
                            ? 'bg-[#FFE500] text-[#0A0A0F]'
                            : 'bg-[#FAFAF5]/10 text-[#FAFAF5]/70 hover:bg-[#FAFAF5]/20'
                        }`}
                      >
                        {Math.floor(secs / 60)}:{(secs % 60).toString().padStart(2, '0')}
                      </button>
                    ))}
                  </div>
                  <p className="text-center text-[#FAFAF5]/50 text-sm mt-3">
                    Current: {Math.floor(timerSeconds / 60)}:{(timerSeconds % 60).toString().padStart(2, '0')}
                  </p>
                </Card>
              )}

              <div className="flex justify-center">
                <Button onClick={handleNextRound} size="lg">
                  {game && game.current_round >= game.total_rounds ? 'Start Reflection' : 'Next Round'}
                </Button>
              </div>
            </motion.div>
          )}

          {/* Reflection View */}
          {view === 'reflection' && (
            <motion.div
              key="reflection"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {!reflection ? (
                <div className="text-center py-20">
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="text-6xl mb-4"
                  >
                    🤔
                  </motion.div>
                  <p className="text-2xl">Generating insights...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <Card variant="glow">
                    <h3 className="text-xl font-bold text-[#FFE500] mb-3">Opening Observation</h3>
                    <p className="text-lg">{reflection.opening_observation}</p>
                  </Card>

                  {reflection.three_insights.map((insight, index) => (
                    <Card key={index}>
                      <h3 className="text-lg font-bold text-[#FF2E6C] mb-2">{insight.title}</h3>
                      <p className="text-[#FAFAF5]/80 mb-3">{insight.observation}</p>
                      <p className="text-[#FAFAF5]/60 italic">💬 {insight.question_for_team}</p>
                    </Card>
                  ))}

                  <Card className="border-[#2D1B69] border-2">
                    <h3 className="text-xl font-bold text-[#2D1B69] mb-3">The AI Question</h3>
                    <p className="text-[#FAFAF5]/80 mb-2">{reflection.the_ai_question.observation}</p>
                    <p className="text-[#FAFAF5]/60 mb-2"><strong>Tension:</strong> {reflection.the_ai_question.tension}</p>
                    <p className="text-[#FFE500]"><strong>Reframe:</strong> {reflection.the_ai_question.reframe}</p>
                  </Card>

                  <Card variant="glow" className="text-center">
                    <p className="text-xl font-semibold">{reflection.closing_provocation}</p>
                  </Card>

                  <div className="flex justify-center">
                    <Button onClick={async () => {
                      await updateGame({ status: 'completed' });
                      setView('winner');
                    }} size="lg">
                      Show Winner
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Winner View */}
          {view === 'winner' && (
            <motion.div
              key="winner"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="text-center py-12"
            >
              <motion.div
                animate={{
                  rotate: [0, 10, -10, 0],
                  scale: [1, 1.1, 1]
                }}
                transition={{ duration: 0.5, repeat: 3 }}
                className="text-8xl mb-6"
              >
                🏆
              </motion.div>

              {leaderboard[0] && (
                <>
                  <h2 className="text-4xl font-bold text-[#FFE500] mb-2" style={{ fontFamily: 'var(--font-space-grotesk)' }}>
                    WORDWRANGLER
                  </h2>
                  <p className="text-5xl font-bold mb-4">{leaderboard[0].display_name}</p>
                  <p className="text-2xl text-[#FAFAF5]/60">{leaderboard[0].score} points</p>
                </>
              )}

              <div className="mt-12">
                <Button onClick={handleNewGame} variant="ghost" size="lg">
                  New Game
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
