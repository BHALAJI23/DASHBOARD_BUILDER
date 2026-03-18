// Supabase Configuration
const SUPABASE_URL = 'https://orngjeymgimvmlrhyfbp.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_x3_HLxjAT27sffcng-9XdQ_bK4fKNnD';

export const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function initializeSupabase() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        return user;
    } catch (error) {
        console.error('Supabase initialization error:', error);
        return null;
    }
}
