import { supabase, Market } from './supabase';
import { randomUUID } from 'crypto';

interface CreateMarketData {
  question: string;
  creatorFid: number;
  creatorUsername: string;
  channelId?: string;
  channelName?: string;
  timeframe: string;
  castHash: string;
  aiConfidence: number;
  aiReasoning?: string;
}

export function extractTimeframe(text: string): string {
  // Extract timeframe from prediction text
  const timeframePatterns = [
    { pattern: /\b(\d+h|\d+hr|\d+hour|\d+hours)\b/i, type: 'hours' },
    { pattern: /\b(\d+d|\d+day|\d+days)\b/i, type: 'days' },
    { pattern: /\btoday\b/i, type: 'today' },
    { pattern: /\btomorrow\b/i, type: 'tomorrow' },
    { pattern: /\b(december|january|february|march|april|may|june|july|august|september|october|november)\s+\d{1,2}(st|nd|rd|th)?\b/i, type: 'date' },
    { pattern: /\bby\s+(december|january|february|march|april|may|june|july|august|september|october|november)\s+\d{1,2}(st|nd|rd|th)?\b/i, type: 'date' },
    { pattern: /\b(this\s+week|next\s+week)\b/i, type: 'week' },
    { pattern: /\b(this\s+month|next\s+month)\b/i, type: 'month' },
    { pattern: /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/, type: 'date' },
    { pattern: /\b(24h|1week|1w)\b/i, type: 'standard' },
    { pattern: /\b(EOY|eoy|end\s+of\s+year)\b/i, type: 'eoy' }
  ];

  for (const { pattern, type } of timeframePatterns) {
    const match = text.match(pattern);
    if (match) {
      return match[0].toLowerCase();
    }
  }

  return 'unknown';
}

export function calculateCloseTime(timeframe: string): Date {
  const now = new Date();
  const timeframeLower = timeframe.toLowerCase();

  // Hours
  if (timeframeLower.includes('h')) {
    const hours = parseInt(timeframeLower.match(/\d+/)?.[0] || '24');
    return new Date(now.getTime() + hours * 60 * 60 * 1000);
  }

  // Days
  if (timeframeLower.includes('d')) {
    const days = parseInt(timeframeLower.match(/\d+/)?.[0] || '1');
    return new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  }

  // Today
  if (timeframeLower === 'today') {
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);
    return endOfDay;
  }

  // Tomorrow
  if (timeframeLower === 'tomorrow') {
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    tomorrow.setHours(23, 59, 59, 999);
    return tomorrow;
  }

  // EOY (End of Year)
  if (timeframeLower.includes('eoy') || timeframeLower.includes('end of year')) {
    const year = now.getFullYear();
    const endOfYear = new Date(year, 11, 31, 23, 59, 59, 999); // December 31st
    return endOfYear;
  }

  // Specific dates (December 31st, etc.)
  if (timeframeLower.includes('december') && timeframeLower.includes('31')) {
    const year = now.getFullYear();
    const endOfYear = new Date(year, 11, 31, 23, 59, 59, 999); // December 31st
    return endOfYear;
  }

  // Week/Month
  if (timeframeLower.includes('week')) {
    return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  }
  if (timeframeLower.includes('month')) {
    return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  }

  // Default: 24 hours
  return new Date(now.getTime() + 24 * 60 * 60 * 1000);
}

export function generateMarketId(question: string, creatorFid: number): string {
  // Create a truly unique market ID using Node.js crypto.randomUUID
  try {
    return `market_${randomUUID().replace(/-/g, '').slice(0, 16)}`;
  } catch (error) {
    console.log('⚠️ randomUUID not available, using fallback');
  }
  
  // Fallback with multiple entropy sources
  const timestamp = Date.now();
  const random1 = Math.random().toString(36).substring(2, 8);
  const random2 = Math.random().toString(36).substring(2, 8);
  const microseconds = process.hrtime.bigint().toString().slice(-6);
  
  const hash = Buffer.from(`${question}-${creatorFid}-${timestamp}-${random1}-${random2}-${microseconds}`)
    .toString('base64')
    .replace(/[+/=]/g, '')
    .slice(0, 20);
    
  return `market_${hash}`;
}

export async function createMarket(data: CreateMarketData): Promise<Market | null> {
  try {
    console.log('💾 Creating market in Supabase...');
    console.log('📋 Market data:', {
      question: data.question,
      creatorFid: data.creatorFid,
      creatorUsername: data.creatorUsername,
      timeframe: data.timeframe,
      castHash: data.castHash,
      aiConfidence: data.aiConfidence,
    });

    // Try up to 3 times to generate a unique market ID
    let marketId: string;
    let attempts = 0;
    const maxAttempts = 3;
    
    do {
      marketId = generateMarketId(data.question, data.creatorFid);
      attempts++;
      
      console.log(`🔍 Attempt ${attempts}: Generated market ID: ${marketId}`);
      
      // Check if this market ID already exists
      const { data: existingMarket, error: queryError } = await supabase
        .from('markets')
        .select('market_id')
        .eq('market_id', marketId)
        .single();
      
      console.log('📊 Query result:', { 
        existingMarket, 
        queryError: queryError?.message,
        marketId 
      });
        
      if (queryError && queryError.code === 'PGRST116') {
        // No rows found - this means the ID is unique
        console.log(`✅ Unique market ID found: ${marketId}`);
        break;
      } else if (!existingMarket && !queryError) {
        // No existing market found - ID is unique
        console.log(`✅ Unique market ID confirmed: ${marketId}`);
        break;
      }
      
      console.log(`⚠️ Market ID collision attempt ${attempts}: ${marketId} already exists, trying again...`);
      
    } while (attempts < maxAttempts);
    
    if (attempts >= maxAttempts) {
      console.error('❌ Failed to generate unique market ID after 3 attempts');
      return null;
    }

    const closeTime = calculateCloseTime(data.timeframe);

    const market: Omit<Market, 'id' | 'created_at' | 'updated_at'> = {
      market_id: marketId,
      question: data.question,
      creator_fid: data.creatorFid,
      creator_username: data.creatorUsername,
      channel_id: data.channelId || undefined,
      channel_name: data.channelName || undefined,
      timeframe: data.timeframe,
      close_time: closeTime.toISOString(),
      resolved: false,
      outcome: undefined,
      total_pool: 0,
      yes_shares: 0,
      no_shares: 0,
      participants: [],
      cast_hash: data.castHash,
      ai_confidence: data.aiConfidence,
      ai_reasoning: data.aiReasoning || undefined,
    };

    console.log('🔄 Inserting market into database...');
    const { data: insertedMarket, error } = await supabase
      .from('markets')
      .insert(market)
      .select()
      .single();

    if (error) {
      console.error('❌ Database error:', error);
      return null;
    }

    console.log('✅ Market created successfully:', {
      id: insertedMarket.id,
      market_id: insertedMarket.market_id,
      question: insertedMarket.question,
      close_time: insertedMarket.close_time,
    });

    return insertedMarket as Market;

  } catch (error) {
    console.error('💥 Error creating market:', error);
    return null;
  }
}

export async function getMarketByHash(castHash: string): Promise<Market | null> {
  try {
    const { data, error } = await supabase
      .from('markets')
      .select('*')
      .eq('cast_hash', castHash)
      .single();

    if (error) {
      console.error('❌ Error fetching market:', error);
      return null;
    }

    return data as Market;
  } catch (error) {
    console.error('💥 Error fetching market:', error);
    return null;
  }
}

export async function getAllMarkets(): Promise<Market[]> {
  try {
    const { data, error } = await supabase
      .from('markets')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching markets:', error);
      return [];
    }

    return data as Market[];
  } catch (error) {
    console.error('💥 Error fetching markets:', error);
    return [];
  }
}