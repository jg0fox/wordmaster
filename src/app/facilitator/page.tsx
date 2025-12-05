'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { useGameState } from '@/hooks/useGameState';
import type { Submission, ReflectionResponse } from '@/types/database';

type View = 'setup' | 'lobby' | 'playing' | 'judging' | 'leaderboard' | 'reflection' | 'winner';

export default function FacilitatorPage() {
  const [gameCode, setGameCode] = useState<string | null>(null);
  const [view, setView] = useState<View>('setup');
  const [facilitatorName, setFacilitatorName] = useState('');
  const [totalRounds, setTotalRounds] = useState(5);
  const [timerSeconds, setTimerSeconds] = useState(180);
  const [creating, setCreating] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [currentSubmissionIndex, setCurrentSubmissionIndex] = useState(0);
  const [judging, setJudging] = useState(false);
  const [reflection, setReflection] = useState<ReflectionResponse | null>(null);
  const [leaderboard, setLeaderboard] = useState<{ rank: number; display_name: string; score: number; avatar?: string }[]>([]);

  const { game, loading, startGame, nextRound, triggerJudgment, triggerReflection, fetchLeaderboard, fetchSubmissions } = useGameState({
    code: gameCode || '',
    autoRefresh: true,
  });

  // Create new game
  const createGame = async () => {
    setCreating(true);
    try {
      const response = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          facilitator_name: facilitatorName || 'Facilitator',
          total_rounds: totalRounds,
          timer_seconds: timerSeconds,
        }),
      });

      if (!response.ok) throw new Error('Failed to create game');

      const data = await response.json();
      setGameCode(data.code);
      setView('lobby');
    } catch (error) {
      console.error('Error creating game:', error);
    } finally {
      setCreating(false);
    }
  };

  // Timer logic
  useEffect(() => {
    if (!timerRunning || timeRemaining <= 0) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          setTimerRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timerRunning, timeRemaining]);

  // Handle game status changes
  useEffect(() => {
    if (!game) return;

    if (game.status === 'lobby') {
      setView('lobby');
    } else if (game.status === 'active' && game.current_round > 0) {
      setView('playing');
      if (!timerRunning && timeRemaining === 0) {
        setTimeRemaining(game.timer_seconds);
      }
    } else if (game.status === 'completed') {
      setView('winner');
    }
  }, [game?.status, game?.current_round]);

  // Start the game
  const handleStartGame = async () => {
    await startGame();
    setTimeRemaining(timerSeconds);
    setTimerRunning(true);
  };

  // Start timer
  const handleStartTimer = () => {
    setTimerRunning(true);
  };

  // Pause timer
  const handlePauseTimer = () => {
    setTimerRunning(false);
  };

  // Add time
  const handleAddTime = () => {
    setTimeRemaining((prev) => prev + 30);
  };

  // End round and judge
  const handleEndRound = async () => {
    setTimerRunning(false);
    setView('judging');
    setJudging(true);
    setCurrentSubmissionIndex(0);

    // Fetch submissions
    const subs = await fetchSubmissions();
    setSubmissions(subs);

    // Trigger judgment
    const results = await triggerJudgment();
    if (results?.results) {
      setSubmissions(results.results);
    }

    setJudging(false);
  };

  // Show next submission
  const handleNextSubmission = () => {
    if (currentSubmissionIndex < submissions.length - 1) {
      setCurrentSubmissionIndex((prev) => prev + 1);
    } else {
      // All submissions shown, go to leaderboard
      handleShowLeaderboard();
    }
  };

  // Show leaderboard
  const handleShowLeaderboard = async () => {
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
      await nextRound();
      setTimeRemaining(timerSeconds);
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

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1
            className="text-3xl font-bold text-gradient"
            style={{ fontFamily: 'var(--font-space-grotesk)' }}
          >
            WORDMASTER
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
                    label="Your Name"
                    value={facilitatorName}
                    onChange={(e) => setFacilitatorName(e.target.value)}
                    placeholder="Facilitator"
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
                      <label className="block text-sm font-medium text-[#FAFAF5]/80 mb-1">Timer</label>
                      <select
                        value={timerSeconds}
                        onChange={(e) => setTimerSeconds(Number(e.target.value))}
                        className="w-full px-4 py-3 rounded-lg bg-[#FAFAF5]/10 border border-[#FAFAF5]/20 text-[#FAFAF5]"
                      >
                        {[120, 150, 180, 210, 240, 300].map((n) => (
                          <option key={n} value={n}>{Math.floor(n / 60)}:{(n % 60).toString().padStart(2, '0')}</option>
                        ))}
                      </select>
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
              </div>

              <Card className="mb-6">
                <h3 className="text-xl font-semibold mb-4">
                  Players ({game.game_players?.length || 0})
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {game.game_players?.map((gp) => (
                    <div
                      key={gp.id}
                      className="flex items-center gap-2 p-3 rounded-lg bg-[#FAFAF5]/5"
                    >
                      <span className="text-2xl">{gp.player?.avatar || '👤'}</span>
                      <div>
                        <p className="font-medium">{gp.player?.display_name}</p>
                        {gp.player?.team?.name && (
                          <p className="text-xs text-[#FAFAF5]/50">{gp.player.team.name}</p>
                        )}
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
                <p className={`text-7xl font-mono font-bold ${
                  timeRemaining <= 30 ? 'text-[#FF2E6C]' :
                  timeRemaining <= 60 ? 'text-[#F59E0B]' :
                  'text-[#FFE500]'
                }`}>
                  {formatTime(timeRemaining)}
                </p>
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

          {/* Judging View */}
          {view === 'judging' && (
            <motion.div
              key="judging"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {judging ? (
                <div className="text-center py-20">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="text-6xl mb-4"
                  >
                    ⚖️
                  </motion.div>
                  <p className="text-2xl">The judges are deliberating...</p>
                </div>
              ) : submissions.length > 0 ? (
                <div>
                  <div className="text-center mb-4">
                    <p className="text-[#FAFAF5]/60">
                      Submission {currentSubmissionIndex + 1} of {submissions.length}
                    </p>
                  </div>

                  <Card variant="glow" className="mb-6">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-3xl">{submissions[currentSubmissionIndex]?.player?.avatar || '👤'}</span>
                      <h3 className="text-xl font-bold">
                        {submissions[currentSubmissionIndex]?.player?.display_name}
                      </h3>
                    </div>

                    <div className="bg-[#0A0A0F] rounded-lg p-4 mb-4 font-mono text-sm">
                      {submissions[currentSubmissionIndex]?.content}
                    </div>

                    {submissions[currentSubmissionIndex]?.ai_score && (
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <span className="text-2xl">🎭</span>
                          <p className="text-[#FAFAF5]/80 italic">
                            "{submissions[currentSubmissionIndex]?.alex_quote}"
                          </p>
                        </div>
                        <div className="flex items-start gap-3">
                          <span className="text-2xl">👑</span>
                          <p className="text-[#FAFAF5] font-semibold">
                            "{submissions[currentSubmissionIndex]?.greg_quote}"
                          </p>
                        </div>
                        <div className="text-center mt-4">
                          <span className={`inline-block px-6 py-2 rounded-full text-3xl font-bold score-${submissions[currentSubmissionIndex]?.ai_score}`}>
                            {submissions[currentSubmissionIndex]?.ai_score} points
                          </span>
                        </div>
                      </div>
                    )}
                  </Card>

                  <div className="flex justify-center">
                    <Button onClick={handleNextSubmission} size="lg">
                      {currentSubmissionIndex < submissions.length - 1 ? 'Next Submission' : 'Show Leaderboard'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-20">
                  <p className="text-xl text-[#FAFAF5]/60">No submissions this round</p>
                  <Button onClick={handleShowLeaderboard} size="lg" className="mt-4">
                    Show Leaderboard
                  </Button>
                </div>
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
                    <Button onClick={() => setView('winner')} size="lg">
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
                    WORDMASTER
                  </h2>
                  <p className="text-5xl font-bold mb-4">{leaderboard[0].display_name}</p>
                  <p className="text-2xl text-[#FAFAF5]/60">{leaderboard[0].score} points</p>
                </>
              )}

              <div className="mt-12">
                <Button onClick={() => { setGameCode(null); setView('setup'); }} variant="ghost" size="lg">
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
