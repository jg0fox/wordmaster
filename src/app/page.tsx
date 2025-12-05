'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      {/* Background effects */}
      <div className="fixed inset-0 bg-gradient-to-br from-[#2D1B69]/20 via-transparent to-[#FF2E6C]/10 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center max-w-2xl relative z-10"
      >
        {/* Logo/Title */}
        <motion.h1
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-6xl md:text-8xl font-bold mb-4"
          style={{ fontFamily: 'var(--font-space-grotesk)' }}
        >
          <span className="text-gradient">WORD</span>
          <span className="text-[#FAFAF5]">WRANGLER</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-xl md:text-2xl text-[#FAFAF5]/70 mb-12"
        >
          Creative chaos for content designers
        </motion.p>

        {/* Action buttons */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <Link href="/facilitator">
            <Button size="xl" variant="primary" className="w-full sm:w-auto">
              Host a Game
            </Button>
          </Link>

          <Link href="/play">
            <Button size="xl" variant="ghost" className="w-full sm:w-auto">
              Join a Game
            </Button>
          </Link>
        </motion.div>

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-16 text-sm text-[#FAFAF5]/40"
        >
          A Taskmaster-style party game for UX writers
        </motion.p>
      </motion.div>

      {/* Decorative elements */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.5 }}
        transition={{ delay: 1 }}
        className="absolute bottom-8 left-8 text-[#FFE500]/30 text-9xl font-bold select-none"
        style={{ fontFamily: 'var(--font-space-grotesk)' }}
      >
        ?!
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.3 }}
        transition={{ delay: 1.2 }}
        className="absolute top-8 right-8 text-[#FF2E6C]/30 text-7xl font-bold select-none rotate-12"
        style={{ fontFamily: 'var(--font-space-grotesk)' }}
      >
        *
      </motion.div>
    </div>
  );
}
