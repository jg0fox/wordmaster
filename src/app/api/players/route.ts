import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

// POST /api/players - Create a new player (no email required)
export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const body = await request.json();
    const { display_name, avatar } = body;

    // Validate display_name
    if (!display_name || typeof display_name !== 'string') {
      return NextResponse.json({ error: 'display_name is required' }, { status: 400 });
    }

    const trimmedName = display_name.trim();
    if (trimmedName.length === 0) {
      return NextResponse.json({ error: 'display_name cannot be empty' }, { status: 400 });
    }

    if (trimmedName.length > 50) {
      return NextResponse.json({ error: 'display_name exceeds maximum length of 50 characters' }, { status: 400 });
    }

    // Validate avatar if provided
    if (avatar && typeof avatar === 'string' && avatar.length > 50) {
      return NextResponse.json({ error: 'avatar exceeds maximum length' }, { status: 400 });
    }

    // Generate a unique placeholder email (database requires email field)
    const uniqueId = crypto.randomUUID();
    const placeholderEmail = `player_${uniqueId}@wordwrangler.local`;

    const { data: player, error } = await supabase
      .from('players')
      .insert({
        display_name: trimmedName,
        avatar: avatar || null,
        email: placeholderEmail,
      })
      .select('*')
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

// GET /api/players - List players
export async function GET() {
  try {
    const supabase = createServiceClient();

    // List all players
    const { data: players } = await supabase
      .from('players')
      .select('*')
      .order('display_name', { ascending: true })
      .limit(100);

    return NextResponse.json(players || []);
  } catch (error) {
    console.error('Error in GET /api/players:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
