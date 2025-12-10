import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

// GET /api/tasks - List all available tasks
export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient();

    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('*')
      .order('title', { ascending: true });

    if (error) {
      console.error('Error fetching tasks:', error);
      return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
    }

    return NextResponse.json(tasks || []);
  } catch (error) {
    console.error('Error in GET /api/tasks:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
