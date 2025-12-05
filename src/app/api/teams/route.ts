import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

// GET /api/teams - List all teams
export async function GET() {
  try {
    const supabase = createServiceClient();

    const { data: teams, error } = await supabase
      .from('teams')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch teams' }, { status: 500 });
    }

    return NextResponse.json(teams || []);
  } catch (error) {
    console.error('Error in GET /api/teams:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/teams - Create a new team
export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const body = await request.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    // Check if team exists
    const { data: existing } = await supabase
      .from('teams')
      .select('*')
      .eq('name', name)
      .single();

    if (existing) {
      return NextResponse.json(existing);
    }

    // Create team
    const { data: team, error } = await supabase
      .from('teams')
      .insert({ name })
      .select()
      .single();

    if (error) {
      console.error('Error creating team:', error);
      return NextResponse.json({ error: 'Failed to create team' }, { status: 500 });
    }

    return NextResponse.json(team);
  } catch (error) {
    console.error('Error in POST /api/teams:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
