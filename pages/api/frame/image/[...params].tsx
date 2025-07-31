import { NextApiRequest, NextApiResponse } from 'next';
import { ImageResponse } from '@vercel/og';
import { supabase } from '../../../../lib/supabase';
import { FrameImage } from '../../../../lib/components/FrameImage';

export const config = {
  runtime: 'edge',
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } });
    }

    const { params } = req.query;
    const [imageType, ...extraParams] = Array.isArray(params) ? params : [params];
    
    console.log('🖼️ Generating frame image for:', imageType);

    // Handle special image types
    if (imageType === 'home') {
      return generateHomeImage(res);
    }
    
    if (imageType === 'no-markets') {
      return generateNoMarketsImage(res);
    }
    
    if (imageType === 'error') {
      const message = req.query.message as string || 'Unknown error';
      return generateErrorImage(res, message);
    }
    
    if (imageType === 'bet-response') {
      return generateBetResponseImage(req, res);
    }
    
    if (imageType === 'bet-confirm') {
      return generateBetConfirmImage(req, res);
    }
    
    if (imageType === 'bet-success') {
      return generateBetSuccessImage(req, res);
    }

    // Handle market-specific images
    const marketId = imageType;
    const { data: market, error } = await supabase
      .from('markets')
      .select('*')
      .eq('market_id', marketId)
      .single();

    if (error || !market) {
      console.error('❌ Market not found for image:', marketId);
      return generateErrorImage(res, 'Market not found');
    }

    const view = req.query.view as string;
    
    if (view === 'details') {
      return generateDetailsImage(res, market);
    }
    
    return generateMarketImage(res, market);

  } catch (error) {
    console.error('💥 Error generating frame image:', error);
    return generateErrorImage(res, 'Failed to generate image');
  }
}

async function generateMarketImage(res: NextApiResponse, market: any) {
  return new ImageResponse(
    (
      <FrameImage market={market} />
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=60',
      },
    },
  );
}

function generateDetailsImage(res: NextApiResponse, market: any) {
  const createdDate = new Date(market.created_at).toLocaleDateString();
  const closeDate = new Date(market.close_time).toLocaleDateString();
  const aiConfidence = Math.round(market.ai_confidence * 100);

  return new ImageResponse(
    (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', backgroundColor: '#f0f2f5', padding: '40px' }}>
        <h2>Market Details</h2>
        <p>{market.question}</p>
        <p>Creator: @{market.creator_username}</p>
        <p>Created: {createdDate}</p>
        <p>Closes: {closeDate}</p>
        <p>AI Confidence: {aiConfidence}%</p>
        <p>Market ID: {market.market_id.substring(0, 20)}...</p>
        <p>Total Pool: ${market.total_pool} USDC</p>
        <p>Participants: {market.participants.length} users</p>
        <p>Click "Back to Market" to return</p>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=300',
      },
    },
  );
}

function generateBetResponseImage(req: NextApiRequest, res: NextApiResponse) {
  const action = req.query.action as string || 'YES';

  return new ImageResponse(
    (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', backgroundColor: '#f0f2f5', padding: '40px' }}>
        <h2>Betting Coming Soon!</h2>
        <p>You clicked: Bet {action} $5</p>
        <p>USDC betting will be implemented in Function 6: Smart Contract Integration</p>
        <p>For now, this is just a preview of the betting interface that will be available soon!</p>
        <p>Click "Back to Market" to return</p>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=3600',
      },
    },
  );
}

function generateErrorImage(res: NextApiResponse, message: string) {
  return new ImageResponse(
    (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', backgroundColor: '#fef2f2', padding: '40px', color: '#ef4444' }}>
        <h2>Error</h2>
        <p>{message}</p>
        <p>Please try again later</p>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    },
  );
}

function generateHomeImage(res: NextApiResponse) {
  return new ImageResponse(
    (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', backgroundColor: '#f0f2f5', padding: '40px' }}>
        <h2>iWager Prediction Markets</h2>
        <p>Bet on the future with USDC</p>
        <p>✅ AI-validated predictions</p>
        <p>💰 Smart contract betting</p>
        <p>🏆 Transparent outcomes</p>
        <p>Click "View Markets" to start betting!</p>
        <p>Powered by Farcaster Frames • Built with Claude</p>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=300',
      },
    },
  );
}

function generateNoMarketsImage(res: NextApiResponse) {
  return new ImageResponse(
    (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', backgroundColor: '#f0f2f5', padding: '40px' }}>
        <h2>No Markets Available</h2>
        <p>Be the first to create a prediction!</p>
        <p>Mention @watchthis with your prediction on Farcaster</p>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=60',
      },
    },
  );
}

function generateBetConfirmImage(req: NextApiRequest, res: NextApiResponse) {
  const action = req.query.action as string || 'YES';
  const amount = req.query.amount as string || '5';

  return new ImageResponse(
    (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', backgroundColor: '#f0f2f5', padding: '40px' }}>
        <h2>Confirm Your Bet</h2>
        <p>{action.toUpperCase()}</p>
        <p>${amount} USDC</p>
        <p>⚠️ Function 6: Smart contract betting coming soon</p>
        <p>This is a preview of the betting interface</p>
        <p>Click "Confirm" to proceed or "Cancel" to go back</p>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=60',
      },
    },
  );
}

function generateBetSuccessImage(req: NextApiRequest, res: NextApiResponse) {
  const action = req.query.action as string || 'YES';
  const amount = req.query.amount as string || '5';

  return new ImageResponse(
    (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', backgroundColor: '#f0fdf4', padding: '40px', color: '#10b981' }}>
        <h2>Bet Confirmed!</h2>
        <p>Your bet:</p>
        <p>{action.toUpperCase()} - ${amount} USDC</p>
        <p>🚧 Smart contract integration coming in Function 6</p>
        <p>Your bet will be processed when implemented</p>
        <p>Navigate back to view more markets or details</p>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=300',
      },
    },
  );
}
