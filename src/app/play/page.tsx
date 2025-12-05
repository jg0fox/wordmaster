'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useGameSession } from '@/hooks/useGameState';

export default function PlayPage() {
  const router = useRouter();
  const [gameCode, setGameCode] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);
  const { gameCode: activeGameCode, loading: sessionLoading, joinSession, leaveSession } = useGameSession();

  // Check for existing active session
  useEffect(() => {
    if (sessionLoading) return;

    if (activeGameCode) {
      // Verify the game still exists and is active
      fetch(`/api/games/${activeGameCode}`)
        .then(res => res.json())
        .then(game => {
          if (game && game.status !== 'completed') {
            // Redirect to active game
            router.push(`/play/${activeGameCode}`);
          } else {
            // Game no longer exists or is completed, clear session
            leaveSession();
          }
        })
        .catch(() => {
          leaveSession();
        });
    }
  }, [activeGameCode, sessionLoading, router, leaveSession]);

  const handleJoin = async () => {
    if (!gameCode.trim()) {
      setError('Please enter a game code');
      return;
    }

    setChecking(true);
    setError('');

    try {
      const response = await fetch(`/api/games/${gameCode.toUpperCase()}`);
      if (!response.ok) {
        setError('Game not found');
        return;
      }

      const game = await response.json();
      if (game.status === 'completed') {
        setError('This game has ended');
        return;
      }

      // Save the game session
      joinSession(gameCode.toUpperCase());
      router.push(`/play/${gameCode.toUpperCase()}`);
    } catch {
      setError('Failed to join game');
    } finally {
      setChecking(false);
    }
  };

  // Show loading while checking for active session
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
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="fixed inset-0 bg-gradient-to-br from-[#2D1B69]/20 via-transparent to-[#FF2E6C]/10 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm relative z-10"
      >
        <h1
          className="text-4xl font-bold text-center mb-2"
          style={{ fontFamily: 'var(--font-space-grotesk)' }}
        >
          <span className="text-gradient">WORD</span>
          <span className="text-[#FAFAF5]">WRANGLER</span>
        </h1>

        <p className="text-center text-[#FAFAF5]/60 mb-8">
          Enter the game code to join
        </p>

        <div className="space-y-4">
          <Input
            value={gameCode}
            onChange={(e) => setGameCode(e.target.value.toUpperCase())}
            placeholder="GAME CODE"
            className="text-center text-2xl font-mono tracking-widest"
            maxLength={6}
            error={error}
          />

          <Button
            onClick={handleJoin}
            disabled={checking || !gameCode.trim()}
            className="w-full"
            size="lg"
          >
            {checking ? 'Checking...' : 'Join Game'}
          </Button>
        </div>

        <p className="text-center text-sm text-[#FAFAF5]/40 mt-8">
          Ask your host for the game code
        </p>
      </motion.div>
    </div>
  );
}
