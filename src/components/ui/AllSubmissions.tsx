'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RichTextDisplay } from './RichTextDisplay';
import type { Submission, Task } from '@/types/database';

interface RoundData {
  round_number: number;
  task: Task;
  submissions: (Submission & { player: { display_name: string; avatar: string | null } })[];
}

interface AllSubmissionsProps {
  gameCode: string;
  variant?: 'display' | 'player' | 'facilitator';
}

export function AllSubmissions({ gameCode, variant = 'display' }: AllSubmissionsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [rounds, setRounds] = useState<RoundData[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedRounds, setExpandedRounds] = useState<Set<number>>(new Set());

  // Fetch all submissions when expanded
  useEffect(() => {
    if (isExpanded && rounds.length === 0) {
      setLoading(true);
      fetch(`/api/games/${gameCode}/submissions?all=true`)
        .then(res => res.json())
        .then(data => {
          setRounds(data.rounds || []);
          // Auto-expand first round
          if (data.rounds?.length > 0) {
            setExpandedRounds(new Set([1]));
          }
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [isExpanded, gameCode, rounds.length]);

  const toggleRound = (roundNumber: number) => {
    setExpandedRounds(prev => {
      const next = new Set(prev);
      if (next.has(roundNumber)) {
        next.delete(roundNumber);
      } else {
        next.add(roundNumber);
      }
      return next;
    });
  };

  // Size variants
  const sizes = {
    display: {
      container: 'mt-8',
      button: 'text-xl px-6 py-3',
      roundHeader: 'text-xl',
      taskTitle: 'text-lg',
      taskDesc: 'text-base',
      playerName: 'text-lg',
      content: 'text-base',
    },
    player: {
      container: 'mt-4',
      button: 'text-sm px-4 py-2',
      roundHeader: 'text-base',
      taskTitle: 'text-sm',
      taskDesc: 'text-xs',
      playerName: 'text-sm',
      content: 'text-sm',
    },
    facilitator: {
      container: 'mt-6',
      button: 'text-base px-5 py-2.5',
      roundHeader: 'text-lg',
      taskTitle: 'text-base',
      taskDesc: 'text-sm',
      playerName: 'text-base',
      content: 'text-sm',
    },
  };

  const s = sizes[variant];

  return (
    <div className={s.container}>
      {/* Toggle Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full ${s.button} rounded-xl bg-[#FAFAF5]/5 border border-[#FAFAF5]/20
          hover:bg-[#FAFAF5]/10 hover:border-[#FFE500]/30 transition-all
          flex items-center justify-center gap-2 text-[#FAFAF5]/70 hover:text-[#FAFAF5]`}
      >
        <span>{isExpanded ? '▼' : '▶'}</span>
        <span>View All Submissions</span>
        {rounds.length > 0 && (
          <span className="text-[#FAFAF5]/50">
            ({rounds.reduce((acc, r) => acc + r.submissions.length, 0)} total)
          </span>
        )}
      </button>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="mt-4 space-y-4">
              {loading ? (
                <div className="text-center py-8">
                  <motion.p
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="text-[#FAFAF5]/60"
                  >
                    Loading submissions...
                  </motion.p>
                </div>
              ) : rounds.length === 0 ? (
                <p className="text-center py-8 text-[#FAFAF5]/60">No submissions found</p>
              ) : (
                rounds.map((round) => (
                  <div
                    key={round.round_number}
                    className="rounded-xl bg-[#FAFAF5]/5 border border-[#FAFAF5]/10 overflow-hidden"
                  >
                    {/* Round Header - Clickable */}
                    <button
                      onClick={() => toggleRound(round.round_number)}
                      className="w-full p-4 flex items-center justify-between hover:bg-[#FAFAF5]/5 transition-colors text-left"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <span className={`font-bold text-[#FFE500] ${s.roundHeader}`}>
                            Round {round.round_number}
                          </span>
                          <span className="text-[#FAFAF5]/50 text-sm">
                            {round.submissions.length} submission{round.submissions.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <p className={`text-[#FAFAF5]/70 ${s.taskTitle} mt-1`}>
                          {round.task?.title}
                        </p>
                      </div>
                      <span className="text-[#FAFAF5]/50 text-lg">
                        {expandedRounds.has(round.round_number) ? '▼' : '▶'}
                      </span>
                    </button>

                    {/* Round Submissions */}
                    <AnimatePresence>
                      {expandedRounds.has(round.round_number) && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <div className="border-t border-[#FAFAF5]/10 p-4 space-y-4">
                            {/* Task Description */}
                            <p className={`text-[#FAFAF5]/60 ${s.taskDesc} italic`}>
                              {round.task?.description}
                            </p>

                            {/* Submissions */}
                            <div className="space-y-3">
                              {round.submissions.map((submission) => (
                                <div
                                  key={submission.id}
                                  className="rounded-lg bg-[#0A0A0F] p-4"
                                >
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="text-xl">{submission.player?.avatar || '👤'}</span>
                                    <span className={`font-medium text-[#FAFAF5] ${s.playerName}`}>
                                      {submission.player?.display_name}
                                    </span>
                                  </div>
                                  <div className={s.content}>
                                    <RichTextDisplay content={submission.content} />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
