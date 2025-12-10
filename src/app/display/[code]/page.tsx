'use client';

import { use, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameState } from '@/hooks/useGameState';
import { RichTextDisplay } from '@/components/ui/RichTextDisplay';
import type { Submission, ReflectionResponse } from '@/types/database';

export default function DisplayPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const { game, fetchLeaderboard, fetchSubmissions, fetchReflection } = useGameState({ code, autoRefresh: true });
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [timerExpired, setTimerExpired] = useState(false);
  const [leaderboard, setLeaderboard] = useState<{ rank: number; display_name: string; score: number; avatar?: string }[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [submittedPlayerIds, setSubmittedPlayerIds] = useState<Set<string>>(new Set());
  const [reflection, setReflection] = useState<ReflectionResponse | null>(null);

  // Timer sync from server timestamp
  useEffect(() => {
    if (!game || game.status !== 'active') return;

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

  // Reset timer expired state and submission tracking when moving to a new round
  useEffect(() => {
    if (game?.status !== 'active') {
      setTimerExpired(false);
    }
    // Clear submitted player IDs when round changes (new round = fresh submissions)
    setSubmittedPlayerIds(new Set());
  }, [game?.status, game?.current_round]);

  // Fetch submissions periodically during active game to show who has submitted
  const fetchCurrentSubmissions = useCallback(async () => {
    if (!game || game.status !== 'active') return;
    const subs = await fetchSubmissions();
    setSubmittedPlayerIds(new Set(subs.map((s: Submission) => s.player_id)));
  }, [game, fetchSubmissions]);

  useEffect(() => {
    if (game?.status === 'active') {
      fetchCurrentSubmissions();
      // Poll for new submissions every 3 seconds
      const interval = setInterval(fetchCurrentSubmissions, 3000);
      return () => clearInterval(interval);
    }
  }, [game?.status, fetchCurrentSubmissions]);

  // Fetch leaderboard immediately when status changes and poll during leaderboard/completed
  useEffect(() => {
    if (game?.status === 'completed' || game?.status === 'leaderboard' || game?.status === 'reflection') {
      // Fetch immediately
      fetchLeaderboard().then((lb) => {
        if (lb) setLeaderboard(lb.leaderboard);
      });

      // Poll every 2 seconds to catch updates
      const interval = setInterval(() => {
        fetchLeaderboard().then((lb) => {
          if (lb) setLeaderboard(lb.leaderboard);
        });
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [game?.status, fetchLeaderboard]);

  // Fetch submissions when judging
  useEffect(() => {
    if (game?.status === 'judging') {
      fetchSubmissions().then((subs) => {
        setSubmissions(subs);
      });
    }
  }, [game?.status, fetchSubmissions]);

  // Fetch reflection when status changes to reflection
  useEffect(() => {
    if (game?.status === 'reflection') {
      // Fetch immediately
      fetchReflection().then((ref) => {
        if (ref) setReflection(ref);
      });

      // Poll every 2 seconds in case it's still being generated
      const interval = setInterval(() => {
        fetchReflection().then((ref) => {
          if (ref) setReflection(ref);
        });
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [game?.status, fetchReflection]);

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!game) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-4xl"
        >
          Loading...
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 overflow-hidden">
      {/* Background gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-[#2D1B69]/30 via-[#0A0A0F] to-[#FF2E6C]/20 pointer-events-none" />

      <AnimatePresence mode="wait">
        {/* Lobby */}
        {game.status === 'lobby' && (
          <motion.div
            key="lobby"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center relative z-10"
          >
            <motion.h1
              initial={{ y: -50 }}
              animate={{ y: 0 }}
              className="text-5xl md:text-7xl font-bold mb-8"
              style={{ fontFamily: 'var(--font-space-grotesk)' }}
            >
              <span className="text-gradient">WORD</span>
              <span className="text-[#FAFAF5]">WRANGLER</span>
            </motion.h1>

            <p className="text-2xl text-[#FAFAF5]/60 mb-8">Join at wordwrangler.vercel.app/play</p>

            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="text-[12rem] font-mono font-bold text-[#FFE500] tracking-[0.3em] glow-primary"
            >
              {code}
            </motion.div>

            <div className="mt-12 grid grid-cols-3 md:grid-cols-5 gap-4 max-w-4xl mx-auto">
              {game.game_players?.map((gp, index) => (
                <motion.div
                  key={gp.id}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex flex-col items-center p-4 rounded-xl bg-[#FAFAF5]/5"
                >
                  <span className="text-4xl mb-2">{gp.player?.avatar || '👤'}</span>
                  <span className="text-lg font-medium truncate max-w-full">{gp.player?.display_name}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Active Game - Show Task and Timer */}
        {game.status === 'active' && (
          <motion.div
            key="active"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center relative z-10 w-full max-w-5xl"
          >
            {/* Round indicator */}
            <p className="text-2xl text-[#FAFAF5]/60 mb-4">
              Round {game.current_round} of {game.total_rounds}
            </p>

            {/* Timer */}
            {timerExpired ? (
              <motion.div
                initial={{ scale: 0.5 }}
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 0.8, repeat: Infinity }}
                className="mb-8"
              >
                <p className="text-[8rem] font-bold text-[#FF2E6C]" style={{ fontFamily: 'var(--font-space-grotesk)' }}>
                  TIME&apos;S UP!
                </p>
              </motion.div>
            ) : (
              <motion.div
                className={`text-[14rem] font-mono font-bold mb-8 ${
                  timeRemaining <= 30 ? 'text-[#FF2E6C]' :
                  timeRemaining <= 60 ? 'text-[#F59E0B]' :
                  'text-[#FFE500]'
                }`}
                animate={timeRemaining <= 10 ? { scale: [1, 1.05, 1] } : {}}
                transition={{ duration: 1, repeat: timeRemaining <= 10 ? Infinity : 0 }}
              >
                {formatTime(timeRemaining)}
              </motion.div>
            )}

            {/* Task */}
            {game.current_task?.task && (
              <motion.div
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="scanlines rounded-2xl bg-[#FAFAF5]/5 p-12 border border-[#FFE500]/30 mb-8"
              >
                <h2 className="text-4xl md:text-5xl font-bold text-[#FFE500] mb-6" style={{ fontFamily: 'var(--font-space-grotesk)' }}>
                  {game.current_task.task.title}
                </h2>
                <p className="text-2xl md:text-3xl text-[#FAFAF5]/90 leading-relaxed">
                  {game.current_task.task.description}
                </p>
              </motion.div>
            )}

            {/* Submission Status */}
            {game.game_players && game.game_players.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-8"
              >
                <p className="text-xl text-[#FAFAF5]/60 mb-4">
                  Submissions: {submittedPlayerIds.size} / {game.game_players.length}
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                  {game.game_players.map((gp) => {
                    const hasSubmitted = submittedPlayerIds.has(gp.player_id);
                    return (
                      <motion.div
                        key={gp.id}
                        animate={hasSubmitted ? { scale: [1, 1.1, 1] } : {}}
                        transition={{ duration: 0.3 }}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full ${
                          hasSubmitted
                            ? 'bg-[#22C55E]/20 border border-[#22C55E]/50'
                            : 'bg-[#FAFAF5]/5 border border-[#FAFAF5]/20'
                        }`}
                      >
                        <span className="text-2xl">{gp.player?.avatar || '👤'}</span>
                        <span className={`text-lg ${hasSubmitted ? 'text-[#22C55E]' : 'text-[#FAFAF5]/60'}`}>
                          {gp.player?.display_name}
                        </span>
                        {hasSubmitted && <span className="text-[#22C55E]">✓</span>}
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Judging - Show all submissions for human judging */}
        {game.status === 'judging' && (
          <motion.div
            key="judging"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center relative z-10 w-full max-w-6xl"
          >
            <h2 className="text-4xl font-bold text-[#FFE500] mb-8" style={{ fontFamily: 'var(--font-space-grotesk)' }}>
              Time to Judge!
            </h2>

            {submissions.length === 0 ? (
              <p className="text-2xl text-[#FAFAF5]/60">No submissions this round</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {submissions.map((submission, index) => (
                  <motion.div
                    key={submission.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="rounded-2xl bg-[#FAFAF5]/5 p-6 border border-[#FFE500]/30 text-left"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-4xl">{submission.player?.avatar || '👤'}</span>
                      <div>
                        <h3 className="text-2xl font-bold">{submission.player?.display_name}</h3>
                      </div>
                    </div>
                    <div className="bg-[#0A0A0F] rounded-xl p-4 text-lg">
                      <RichTextDisplay content={submission.content} />
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Leaderboard - Show Rankings */}
        {game.status === 'leaderboard' && (
          <motion.div
            key="leaderboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center relative z-10 w-full max-w-4xl"
          >
            <motion.h2
              initial={{ y: -30 }}
              animate={{ y: 0 }}
              className="text-5xl font-bold text-[#FFE500] mb-8"
              style={{ fontFamily: 'var(--font-space-grotesk)' }}
            >
              Leaderboard
            </motion.h2>

            <p className="text-2xl text-[#FAFAF5]/60 mb-8">
              Round {game.current_round} of {game.total_rounds}
            </p>

            {leaderboard.length === 0 ? (
              <div className="text-center py-16">
                <motion.div
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="text-3xl text-[#FAFAF5]/60"
                >
                  Loading scores...
                </motion.div>
              </div>
            ) : (
              <div className="space-y-4">
                {leaderboard.map((entry, index) => (
                  <motion.div
                    key={entry.display_name}
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`flex items-center gap-6 p-6 rounded-2xl ${
                      index === 0
                        ? 'bg-[#FFE500]/20 border-2 border-[#FFE500]/50'
                        : 'bg-[#FAFAF5]/5 border border-[#FAFAF5]/10'
                    }`}
                  >
                    <span className="text-4xl font-bold w-16 text-center">
                      {index === 0 ? '👑' : `#${entry.rank}`}
                    </span>
                    <span className="text-5xl">{entry.avatar || '👤'}</span>
                    <span className="flex-1 text-3xl font-semibold">{entry.display_name}</span>
                    <span className={`text-5xl font-bold ${index === 0 ? 'text-[#FFE500]' : 'text-[#FAFAF5]'}`}>
                      {entry.score}
                    </span>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Reflection - Taskmaster observations */}
        {game.status === 'reflection' && (
          <motion.div
            key="reflection"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center relative z-10 w-full max-w-5xl"
          >
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-[6rem] mb-6"
            >
              🎭
            </motion.div>

            <motion.h2
              initial={{ y: -30 }}
              animate={{ y: 0 }}
              className="text-5xl font-bold text-[#FFE500] mb-8"
              style={{ fontFamily: 'var(--font-space-grotesk)' }}
            >
              The Taskmaster Reflects...
            </motion.h2>

            {!reflection ? (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-2xl text-[#FAFAF5]/60"
              >
                Generating insights...
              </motion.p>
            ) : (
              <div className="space-y-8 text-left">
                {/* Opening Observation */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl bg-[#FAFAF5]/5 p-8 border border-[#FFE500]/30"
                >
                  <p className="text-2xl leading-relaxed text-[#FAFAF5]/90">{reflection.opening_observation}</p>
                </motion.div>

                {/* Three Insights */}
                <div className="grid gap-6">
                  {reflection.three_insights.map((insight, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -30 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 + index * 0.15 }}
                      className="rounded-2xl bg-[#FAFAF5]/5 p-6 border border-[#FAFAF5]/10"
                    >
                      <h3 className="text-2xl font-bold text-[#FFE500] mb-3" style={{ fontFamily: 'var(--font-space-grotesk)' }}>
                        {insight.title}
                      </h3>
                      <p className="text-xl text-[#FAFAF5]/80 mb-4">{insight.observation}</p>
                      <p className="text-lg text-[#FAFAF5]/60 italic">&ldquo;{insight.question_for_team}&rdquo;</p>
                    </motion.div>
                  ))}
                </div>

                {/* The AI Question */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                  className="rounded-2xl bg-[#2D1B69]/30 p-8 border border-[#FF2E6C]/30"
                >
                  <h3 className="text-2xl font-bold text-[#FF2E6C] mb-4" style={{ fontFamily: 'var(--font-space-grotesk)' }}>
                    The Question
                  </h3>
                  <p className="text-xl text-[#FAFAF5]/80 mb-3">{reflection.the_ai_question.observation}</p>
                  <p className="text-lg text-[#FAFAF5]/60 mb-3"><strong>Tension:</strong> {reflection.the_ai_question.tension}</p>
                  <p className="text-xl text-[#FFE500]"><strong>Reframe:</strong> {reflection.the_ai_question.reframe}</p>
                </motion.div>

                {/* Closing Provocation */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.9 }}
                  className="rounded-2xl bg-[#FFE500]/10 p-8 border border-[#FFE500]/50 text-center"
                >
                  <p className="text-2xl font-semibold text-[#FAFAF5]">{reflection.closing_provocation}</p>
                </motion.div>
              </div>
            )}
          </motion.div>
        )}

        {/* Completed - Show Winner */}
        {game.status === 'completed' && leaderboard.length > 0 && (
          <motion.div
            key="completed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center relative z-10"
          >
            <motion.div
              animate={{
                rotate: [0, 10, -10, 0],
                scale: [1, 1.2, 1]
              }}
              transition={{ duration: 0.8, repeat: 3 }}
              className="text-[12rem] mb-8"
            >
              🏆
            </motion.div>

            <motion.h2
              initial={{ y: 50 }}
              animate={{ y: 0 }}
              className="text-6xl font-bold text-[#FFE500] mb-4"
              style={{ fontFamily: 'var(--font-space-grotesk)' }}
            >
              WORDWRANGLER
            </motion.h2>

            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: "spring" }}
              className="text-8xl font-bold mb-4"
            >
              {leaderboard[0]?.display_name}
            </motion.div>

            <p className="text-4xl text-[#FAFAF5]/60">
              {leaderboard[0]?.score} points
            </p>

            {/* Runner ups */}
            <div className="flex justify-center gap-12 mt-12">
              {leaderboard.slice(1, 4).map((entry, index) => (
                <motion.div
                  key={entry.display_name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                  className="text-center"
                >
                  <span className="text-4xl">{entry.avatar || '👤'}</span>
                  <p className="text-xl font-medium">{entry.display_name}</p>
                  <p className="text-lg text-[#FAFAF5]/60">{entry.score} pts</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
