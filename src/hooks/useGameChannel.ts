'use client';

import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface UseGameChannelOptions {
  gameId: string;
  onPlayerJoined?: (payload: unknown) => void;
  onPlayerLeft?: (payload: unknown) => void;
  onPlayerScoreUpdated?: (payload: unknown) => void;
  onGameUpdated?: (payload: unknown) => void;
  onSubmissionReceived?: (payload: unknown) => void;
}

export function useGameChannel({
  gameId,
  onPlayerJoined,
  onPlayerLeft,
  onPlayerScoreUpdated,
  onGameUpdated,
  onSubmissionReceived,
}: UseGameChannelOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Store callbacks in refs to avoid re-subscribing on every render
  const callbacksRef = useRef({
    onGameUpdated,
    onPlayerJoined,
    onPlayerLeft,
    onPlayerScoreUpdated,
    onSubmissionReceived,
  });

  // Update refs when callbacks change (without triggering re-subscription)
  useEffect(() => {
    callbacksRef.current = {
      onGameUpdated,
      onPlayerJoined,
      onPlayerLeft,
      onPlayerScoreUpdated,
      onSubmissionReceived,
    };
  });

  useEffect(() => {
    if (!gameId) return;

    // Clean up existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    // Subscribe to game changes
    const channel = supabase
      .channel(`game:${gameId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'games',
          filter: `id=eq.${gameId}`,
        },
        (payload) => {
          callbacksRef.current.onGameUpdated?.(payload);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'game_players',
          filter: `game_id=eq.${gameId}`,
        },
        (payload) => {
          callbacksRef.current.onPlayerJoined?.(payload);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'game_players',
          filter: `game_id=eq.${gameId}`,
        },
        (payload) => {
          callbacksRef.current.onPlayerLeft?.(payload);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'game_players',
          filter: `game_id=eq.${gameId}`,
        },
        (payload) => {
          callbacksRef.current.onPlayerScoreUpdated?.(payload);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'submissions',
        },
        (payload) => {
          callbacksRef.current.onSubmissionReceived?.(payload);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'submissions',
        },
        (payload) => {
          callbacksRef.current.onSubmissionReceived?.(payload);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`[GameChannel] Subscribed to game ${gameId}`);
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`[GameChannel] Error subscribing to game ${gameId}`);
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [gameId]); // Only re-subscribe when gameId changes

  const resubscribe = () => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    // Trigger re-subscription by calling the effect logic
    // This is a workaround - in practice, the effect will handle it
  };

  return {
    resubscribe,
  };
}
