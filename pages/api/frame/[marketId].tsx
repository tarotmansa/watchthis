import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../lib/supabase';

interface FrameRequest {
  trustedData?: {
    messageBytes: string;
  };
  untrustedData: {
    fid: number;
    url: string;
    messageHash: string;
    timestamp: number;
    network: number;
    buttonIndex?: number;
    castId?: {
      fid: number;
      hash: string;
    };
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { marketId } = req.query;

  // Add CORS headers for frame compatibility
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Handle HEAD requests (used by frame validators)
  if (req.method === 'HEAD') {
    return handleGetFrame(req, res, marketId as string);
  }

  if (req.method === 'GET') {
    // Return the initial frame
    return handleGetFrame(req, res, marketId as string);
  }

  if (req.method === 'POST') {
    // Handle frame interactions (button clicks)
    return handleFrameInteraction(req, res, marketId as string);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

async function handleGetFrame(req: NextApiRequest, res: NextApiResponse, marketId: string) {
  try {
    console.log('🖼️ Generating frame for market:', marketId);

    // Get market data from Supabase
    const { data: market, error } = await supabase
      .from('markets')
      .select('*')
      .eq('market_id', marketId)
      .single();

    if (error || !market) {
      console.error('❌ Market not found:', marketId);
      return res.status(404).json({ error: 'Market not found' });
    }

    console.log('📊 Market data:', {
      question: market.question,
      total_pool: market.total_pool,
      yes_shares: market.yes_shares,
      no_shares: market.no_shares,
      close_time: market.close_time,
    });

    // Generate frame HTML
    const frameHtml = generateFrameHtml(market);
    
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Cache-Control', 'max-age=0');
    return res.send(frameHtml);

  } catch (error) {
    console.error('💥 Error generating frame:', error);
    return res.status(500).json({ error: 'Failed to generate frame' });
  }
}

async function handleFrameInteraction(req: NextApiRequest, res: NextApiResponse, marketId: string) {
  try {
    const frameData: FrameRequest = req.body;
    const buttonIndex = frameData.untrustedData.buttonIndex;
    const userFid = frameData.untrustedData.fid;

    console.log('🎯 Frame interaction:', {
      marketId,
      buttonIndex,
      userFid,
    });

    if (buttonIndex === 1) {
      // Bet YES button clicked
      return handleBetAction(res, marketId, userFid, true);
    } else if (buttonIndex === 2) {
      // Bet NO button clicked  
      return handleBetAction(res, marketId, userFid, false);
    } else if (buttonIndex === 3) {
      // Details button clicked
      return handleDetailsAction(res, marketId);
    }

    return res.status(400).json({ error: 'Invalid button' });

  } catch (error) {
    console.error('💥 Error handling frame interaction:', error);
    return res.status(500).json({ error: 'Failed to handle interaction' });
  }
}

async function handleBetAction(res: NextApiResponse, marketId: string, userFid: number, isYes: boolean) {
  // For now, just show a "coming soon" message
  // In Function 6, we'll implement actual USDC betting
  
  const action = isYes ? 'YES' : 'NO';
  const frameHtml = generateBetResponseFrame(marketId, action);
  
  res.setHeader('Content-Type', 'text/html');
  return res.send(frameHtml);
}

async function handleDetailsAction(res: NextApiResponse, marketId: string) {
  try {
    // Get detailed market info
    const { data: market, error } = await supabase
      .from('markets')
      .select('*')
      .eq('market_id', marketId)
      .single();

    if (error || !market) {
      return res.status(404).json({ error: 'Market not found' });
    }

    const frameHtml = generateDetailsFrame(market);
    
    res.setHeader('Content-Type', 'text/html');
    return res.send(frameHtml);
    
  } catch (error) {
    console.error('💥 Error showing details:', error);
    return res.status(500).json({ error: 'Failed to show details' });
  }
}

function generateFrameHtml(market: any): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  // Ensure proper HTTPS URLs with trailing slashes for ngrok compatibility
  const baseUrl = appUrl?.endsWith('/') ? appUrl.slice(0, -1) : appUrl;
  const imageUrl = `${baseUrl}/api/frame/image/${market.market_id}`;
  const frameUrl = `${baseUrl}/api/frame/${market.market_id}`;

  // Calculate odds
  const totalShares = market.yes_shares + market.no_shares;
  const yesPercent = totalShares > 0 ? Math.round((market.yes_shares / totalShares) * 100) : 50;
  const noPercent = 100 - yesPercent;

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta property="fc:frame" content="vNext" />
    <meta property="fc:frame:image" content="${imageUrl}" />
    <meta property="fc:frame:post_url" content="${frameUrl}" />
    <meta property="fc:frame:button:1" content="Bet YES" />
    <meta property="fc:frame:button:2" content="Bet NO" />
    <meta property="fc:frame:button:3" content="Details" />
    <meta property="fc:frame:input:text" content="Enter bet amount" />
    <meta property="og:title" content="${market.question}" />
    <meta property="og:description" content="AI Confidence: ${Math.round(market.ai_confidence * 100)}% • Pool: $${market.total_pool} USDC" />
    <meta property="og:image" content="${imageUrl}" />
    <title>${market.question}</title>
  </head>
<body>
  <div style="min-height: 100vh; width: 100%; background-color: #0f172a; color: white; font-family: system-ui, sans-serif; padding: 1rem; box-sizing: border-box;">
    <div style="text-align: center; margin-bottom: 2rem;">
      <h1 style="font-size: 1.5rem; margin: 0 0 0.5rem 0;">🎯 ${market.question}</h1>
      <p style="color: #94a3b8; margin: 0;">iWager Prediction Market</p>
    </div>
    
    <div style="background-color: #1e293b; border-radius: 12px; padding: 1.5rem; margin-bottom: 2rem; border: 1px solid #334155;">
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
        <div style="text-align: center;">
          <div style="color: #94a3b8; font-size: 0.8rem;">AI CONFIDENCE</div>
          <div style="font-size: 1.5rem; font-weight: bold; color: #10b981;">${Math.round(market.ai_confidence * 100)}%</div>
        </div>
        <div style="text-align: center;">
          <div style="color: #94a3b8; font-size: 0.8rem;">TOTAL POOL</div>
          <div style="font-size: 1.5rem; font-weight: bold; color: #f59e0b;">$${market.total_pool}</div>
        </div>
      </div>
      
      <div style="background-color: #0f172a; border-radius: 8px; height: 32px; position: relative; overflow: hidden;">
        <div style="position: absolute; left: 0; top: 0; width: ${yesPercent}%; height: 100%; background-color: #10b981;"></div>
        <div style="position: absolute; right: 0; top: 0; width: ${noPercent}%; height: 100%; background-color: #ef4444;"></div>
        <div style="position: absolute; left: 0; top: 0; width: 100%; height: 100%; display: flex; align-items: center; justify-content: space-between; padding: 0 1rem; font-size: 0.9rem; font-weight: bold;">
          <span style="color: ${yesPercent > 50 ? 'white' : '#10b981'};">YES ${yesPercent}%</span>
          <span style="color: ${noPercent > 50 ? 'white' : '#ef4444'};">NO ${noPercent}%</span>
        </div>
      </div>
    </div>
    
    <div style="background-color: #1e293b; border-radius: 12px; padding: 1rem; border: 1px solid #334155; text-align: center;">
      <p style="margin: 0; color: #94a3b8; font-size: 0.9rem;">💰 Pool: $${market.total_pool} USDC • ⏰ Closes: ${new Date(market.close_time).toLocaleDateString()}</p>
      <p style="margin: 0.5rem 0 0 0; color: #64748b; font-size: 0.8rem;">Market ID: ${market.market_id.substring(0, 16)}...</p>
    </div>
  </div>
</body>
</html>`;
}

function generateBetResponseFrame(marketId: string, action: string): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const imageUrl = `${appUrl}/api/frame/image/bet-response?action=${action}`;
  const frameUrl = `${appUrl}/api/frame/${marketId}`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Bet ${action} - Coming Soon!</title>
  
  <!-- Farcaster Frame meta tags -->
  <meta property="fc:frame" content="vNext">
  <meta property="fc:frame:image" content="${imageUrl}">
  <meta property="fc:frame:post_url" content="${frameUrl}">
  <meta property="fc:frame:button:1" content="← Back to Market">
  
  <!-- Open Graph tags -->
  <meta property="og:title" content="Betting ${action} - Coming Soon!">
  <meta property="og:description" content="USDC betting will be available in Function 6">
  <meta property="og:image" content="${imageUrl}">
</head>
<body>
  <div style="padding: 2rem; font-family: monospace; text-align: center;">
    <h1>🚧 Betting Coming Soon!</h1>
    <p>You clicked: Bet ${action} $5</p>
    <p>USDC betting will be implemented in Function 6</p>
  </div>
</body>
</html>`;
}

function generateDetailsFrame(market: any): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const imageUrl = `${appUrl}/api/frame/image/${market.market_id}?view=details`;
  const frameUrl = `${appUrl}/api/frame/${market.market_id}`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Market Details: ${market.question}</title>
  
  <!-- Farcaster Frame meta tags -->
  <meta property="fc:frame" content="vNext">
  <meta property="fc:frame:image" content="${imageUrl}">
  <meta property="fc:frame:post_url" content="${frameUrl}">
  <meta property="fc:frame:button:1" content="← Back to Market">
  
  <!-- Open Graph tags -->
  <meta property="og:title" content="Market Details: ${market.question}">
  <meta property="og:description" content="Created by ${market.creator_username} • AI Confidence: ${Math.round(market.ai_confidence * 100)}%">
  <meta property="og:image" content="${imageUrl}">
</head>
<body>
  <div style="padding: 2rem; font-family: monospace;">
    <h1>📊 Market Details</h1>
    <h2>${market.question}</h2>
    <p><strong>Creator:</strong> ${market.creator_username}</p>
    <p><strong>Created:</strong> ${new Date(market.created_at).toLocaleDateString()}</p>
    <p><strong>Closes:</strong> ${new Date(market.close_time).toLocaleDateString()}</p>
    <p><strong>AI Confidence:</strong> ${Math.round(market.ai_confidence * 100)}%</p>
    <p><strong>Market ID:</strong> ${market.market_id}</p>
  </div>
</body>
</html>`;
}