'use client';

import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface UseGameChannelOptions {
  gameId: string;
  onPlayerJoined?: (payload: unknown) => void;
  onPlayerLeft?: (payload: unknown) => void;
  onGameUpdated?: (payload: unknown) => void;
  onSubmissionReceived?: (payload: unknown) => void;
}

export function useGameChannel({
  gameId,
  onPlayerJoined,
  onPlayerLeft,
  onGameUpdated,
  onSubmissionReceived,
}: UseGameChannelOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null);

  const subscribe = useCallback(() => {
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
          onGameUpdated?.(payload);
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
          onPlayerJoined?.(payload);
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
          onPlayerLeft?.(payload);
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
          onSubmissionReceived?.(payload);
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
          onSubmissionReceived?.(payload);
        }
      )
      .subscribe();

    channelRef.current = channel;
  }, [gameId, onGameUpdated, onPlayerJoined, onPlayerLeft, onSubmissionReceived]);

  useEffect(() => {
    subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [subscribe]);

  return {
    resubscribe: subscribe,
  };
}
