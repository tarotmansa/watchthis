import { NextApiRequest, NextApiResponse } from 'next';

interface NeynarWebhookData {
  type: string;
  object: {
    hash: string;
    thread_hash: string;
    parent_hash?: string | null;
    parent_url?: string | null;
    root_parent_url?: string | null;
    parent_author?: {
      fid: number;
    } | null;
    author: {
      object: string;
      fid: number;
      custody_address: string;
      username: string;
      display_name: string;
      pfp_url: string;
      profile: {
        bio: {
          text: string;
        };
      };
      follower_count: number;
      following_count: number;
      verifications: string[];
      verified_addresses: {
        eth_addresses: string[];
        sol_addresses: string[];
      };
      active_status: string;
      power_badge: boolean;
    };
    text: string;
    timestamp: string;
    embeds: any[];
    reactions: {
      likes_count: number;
      recasts_count: number;
      likes: any[];
      recasts: any[];
    };
    replies: {
      count: number;
    };
    channel?: {
      id: string;
      name: string;
      parent_url: string;
      image_url: string;
      viewer_context?: {
        following: boolean;
      };
    } | null;
    mentioned_profiles: any[];
  };
}

interface NeynarWebhookPayload {
  data: NeynarWebhookData;
  created_at: number;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('🚀 Webhook endpoint hit:', {
    method: req.method,
    timestamp: new Date().toISOString(),
    headers: req.headers,
  });

  if (req.method !== 'POST') {
    console.log('❌ Invalid method:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const payload: NeynarWebhookPayload = req.body;
    console.log('📦 Raw webhook payload:', JSON.stringify(payload, null, 2));

    const { data } = payload;

    // Check if this is a cast creation event
    if (data.type === 'cast.created') {
      const cast = data.object;
      console.log('📝 New cast detected:', {
        hash: cast.hash,
        author: cast.author.username,
        fid: cast.author.fid,
        text: cast.text,
        channel: cast.channel?.id || 'no-channel',
        timestamp: cast.timestamp,
      });

      // Check if the cast mentions @watchthis
      if (cast.text.includes('@watchthis')) {
        console.log('🎯 @watchthis mention detected!', {
          hash: cast.hash,
          author: cast.author.username,
          fid: cast.author.fid,
          text: cast.text,
          channel: cast.channel?.id || 'no-channel',
          timestamp: cast.timestamp,
          mentioned_profiles: cast.mentioned_profiles,
        });

        // Log the full mention for analysis
        console.log('🔍 Full mention analysis:', {
          castHash: cast.hash,
          authorFid: cast.author.fid,
          authorUsername: cast.author.username,
          authorDisplayName: cast.author.display_name,
          castText: cast.text,
          channelId: cast.channel?.id,
          channelName: cast.channel?.name,
          timestamp: cast.timestamp,
          hasParent: !!cast.parent_hash,
          parentHash: cast.parent_hash,
          threadHash: cast.thread_hash,
          mentionedProfiles: cast.mentioned_profiles.length,
          embedsCount: cast.embeds.length,
          likesCount: cast.reactions.likes_count,
          recastsCount: cast.reactions.recasts_count,
          repliesCount: cast.replies.count,
        });

        // TODO: In next iteration, this is where we'll add validation logic
        console.log('✅ @watchthis mention logged successfully');
      } else {
        console.log('ℹ️ Cast does not mention @watchthis, ignoring');
      }
    } else {
      console.log('ℹ️ Non-cast event received:', data.type);
    }

    // Always respond with success to acknowledge receipt
    res.status(200).json({ 
      success: true, 
      message: 'Webhook processed successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('💥 Error processing webhook:', error);
    
    // Log error details for debugging
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      body: req.body,
    });

    res.status(500).json({ 
      error: 'Internal server error', 
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}