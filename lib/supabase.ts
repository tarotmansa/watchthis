import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types based on bot spec schema
export interface Market {
  id?: string;
  market_id: string;
  question: string;
  creator_fid: number;
  creator_username: string;
  channel_id?: string;
  channel_name?: string;
  timeframe: string;
  close_time: string;
  resolved: boolean;
  outcome?: boolean;
  total_pool: number;
  yes_shares: number;
  no_shares: number;
  participants: number[];
  cast_hash: string;
  ai_confidence: number;
  ai_reasoning?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Bet {
  id?: string;
  market_id: string;
  user_fid: number;
  user_username: string;
  amount: number;
  is_yes: boolean;
  tx_hash?: string;
  created_at?: string;
}

export interface User {
  id?: string;
  fid: number;
  username: string;
  display_name: string;
  wallet_address?: string;
  total_bets: number;
  total_wagered: number;
  win_rate: number;
  created_at?: string;
  last_active?: string;
}