import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

// POST /api/players - Create or get player by email
export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const body = await request.json();
    const { email, display_name, avatar, team_id } = body;

    if (!email) {
      return NextResponse.json({ error: 'email is required' }, { status: 400 });
    }

    // Check if player exists
    const { data: existing } = await supabase
      .from('players')
      .select('*, team:teams(*)')
      .eq('email', email.toLowerCase())
      .single();

    if (existing) {
      // Update if new info provided
      if (display_name || avatar || team_id) {
        const updates: Record<string, string> = {};
        if (display_name) updates.display_name = display_name;
        if (avatar) updates.avatar = avatar;
        if (team_id) updates.team_id = team_id;

        const { data: updated } = await supabase
          .from('players')
          .update(updates)
          .eq('id', existing.id)
          .select('*, team:teams(*)')
          .single();

        return NextResponse.json(updated || existing);
      }

      return NextResponse.json(existing);
    }

    // Create new player
    if (!display_name) {
      return NextResponse.json({ error: 'display_name is required for new players' }, { status: 400 });
    }

    const { data: player, error } = await supabase
      .from('players')
      .insert({
        email: email.toLowerCase(),
        display_name,
        avatar: avatar || null,
        team_id: team_id || null,
      })
      .select('*, team:teams(*)')
      .single();

    if (error) {
      console.error('Error creating player:', error);
      return NextResponse.json({ error: 'Failed to create player' }, { status: 500 });
    }

    return NextResponse.json(player);
  } catch (error) {
    console.error('Error in POST /api/players:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/players - Search players
export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (email) {
      // Get player by email
      const { data: player } = await supabase
        .from('players')
        .select('*, team:teams(*)')
        .eq('email', email.toLowerCase())
        .single();

      if (!player) {
        return NextResponse.json({ error: 'Player not found' }, { status: 404 });
      }

      return NextResponse.json(player);
    }

    // List all players
    const { data: players } = await supabase
      .from('players')
      .select('*, team:teams(*)')
      .order('display_name', { ascending: true })
      .limit(100);

    return NextResponse.json(players || []);
  } catch (error) {
    console.error('Error in GET /api/players:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
