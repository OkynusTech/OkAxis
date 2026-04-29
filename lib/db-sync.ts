import type { AppState } from './types';

// Supabase DB sync temporarily disabled - using localStorage only
// TODO: Implement PostgreSQL sync via backend API

// Load app state for a user (localStorage only for now)
export async function loadStateFromDB(userEmail: string): Promise<AppState | null> {
    // Temporarily disabled - just use localStorage
    return null;
}

// Save app state for a user (localStorage only for now)
export async function saveStateToDB(userEmail: string, state: AppState): Promise<void> {
    // Temporarily disabled - localStorage is used instead
}

// Debounced sync — avoids hammering Supabase on rapid successive saves
let syncTimer: ReturnType<typeof setTimeout> | null = null;

export function queueDBSync(userEmail: string | undefined, state: AppState): void {
    // Temporarily disabled - just use localStorage
}
