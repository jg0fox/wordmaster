'use client';

import { use, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameState } from '@/hooks/useGameState';
import type { Submission } from '@/types/database';

export default function DisplayPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const { game, fetchLeaderboard, fetchSubmissions } = useGameState({ code, autoRefresh: true });
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [leaderboard, setLeaderboard] = useState<{ rank: number; display_name: string; score: number; avatar?: string }[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [showingSubmission, setShowingSubmission] = useState<number>(0);

  // Timer countdown
  useEffect(() => {
    if (game?.status === 'active' && game.timer_seconds) {
      setTimeRemaining(game.timer_seconds);
    }
  }, [game?.current_round]);

  useEffect(() => {
    if (game?.status !== 'active' || timeRemaining <= 0) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [game?.status, timeRemaining]);

  // Fetch leaderboard when needed
  useEffect(() => {
    if (game?.status === 'completed' || game?.status === 'judging') {
      fetchLeaderboard().then((lb) => {
        if (lb) setLeaderboard(lb.leaderboard);
      });
    }
  }, [game?.status, fetchLeaderboard]);

  // Fetch submissions when judging
  useEffect(() => {
    if (game?.status === 'judging') {
      fetchSubmissions().then((subs) => {
        setSubmissions(subs);
        setShowingSubmission(0);
      });
    }
  }, [game?.status, fetchSubmissions]);

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

            {/* Task */}
            {game.current_task?.task && (
              <motion.div
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="scanlines rounded-2xl bg-[#FAFAF5]/5 p-12 border border-[#FFE500]/30"
              >
                <h2 className="text-4xl md:text-5xl font-bold text-[#FFE500] mb-6" style={{ fontFamily: 'var(--font-space-grotesk)' }}>
                  {game.current_task.task.title}
                </h2>
                <p className="text-2xl md:text-3xl text-[#FAFAF5]/90 leading-relaxed">
                  {game.current_task.task.description}
                </p>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Judging */}
        {game.status === 'judging' && submissions.length > 0 && (
          <motion.div
            key="judging"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center relative z-10 w-full max-w-4xl"
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="rounded-2xl bg-[#FAFAF5]/5 p-12 border-2 border-[#FFE500]/50"
            >
              <div className="flex items-center justify-center gap-4 mb-8">
                <span className="text-6xl">{submissions[showingSubmission]?.player?.avatar || '👤'}</span>
                <h2 className="text-4xl font-bold">
                  {submissions[showingSubmission]?.player?.display_name}
                </h2>
              </div>

              <div className="bg-[#0A0A0F] rounded-xl p-8 mb-8 font-mono text-2xl text-left">
                {submissions[showingSubmission]?.content}
              </div>

              {submissions[showingSubmission]?.ai_score && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  <div className="flex items-start gap-4 text-left">
                    <span className="text-4xl">🎭</span>
                    <p className="text-xl text-[#FAFAF5]/80 italic">
                      "{submissions[showingSubmission]?.alex_quote}"
                    </p>
                  </div>

                  <div className="flex items-start gap-4 text-left">
                    <span className="text-4xl">👑</span>
                    <p className="text-2xl text-[#FAFAF5] font-semibold">
                      "{submissions[showingSubmission]?.greg_quote}"
                    </p>
                  </div>

                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", bounce: 0.5 }}
                    className="pt-8"
                  >
                    <span className={`inline-block px-12 py-6 rounded-full text-6xl font-bold score-${submissions[showingSubmission]?.ai_score}`}>
                      {submissions[showingSubmission]?.ai_score}
                    </span>
                  </motion.div>
                </motion.div>
              )}
            </motion.div>
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
