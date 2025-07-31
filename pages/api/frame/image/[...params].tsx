import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../../lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Add CORS headers for frame image compatibility
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
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

function generateMarketImage(res: NextApiResponse, market: any) {
  // Calculate odds
  const totalShares = market.yes_shares + market.no_shares;
  const yesPercent = totalShares > 0 ? Math.round((market.yes_shares / totalShares) * 100) : 50;
  const noPercent = 100 - yesPercent;
  
  const closeDate = new Date(market.close_time).toLocaleDateString();
  
  const svg = `
<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      .title { font: bold 32px sans-serif; fill: #1f2937; }
      .question { font: 28px sans-serif; fill: #374151; }
      .stats { font: 24px sans-serif; fill: #6b7280; }
      .odds { font: bold 28px sans-serif; }
      .yes { fill: #10b981; }
      .no { fill: #ef4444; }
      .bg { fill: #f9fafb; }
      .border { fill: none; stroke: #d1d5db; stroke-width: 2; }
    </style>
  </defs>
  
  <!-- Background -->
  <rect width="1200" height="630" class="bg"/>
  <rect width="1200" height="630" class="border"/>
  
  <!-- Header -->
  <text x="600" y="80" text-anchor="middle" class="title">🎯 iWager Prediction Market</text>
  
  <!-- Question (wrapped) -->
  <text x="600" y="140" text-anchor="middle" class="question">${wrapText(market.question, 50)}</text>
  
  <!-- Pool info -->
  <text x="600" y="220" text-anchor="middle" class="stats">💰 Pool: $${market.total_pool} USDC</text>
  <text x="600" y="260" text-anchor="middle" class="stats">⏰ Closes: ${closeDate}</text>
  
  <!-- Odds -->
  <text x="300" y="350" text-anchor="middle" class="odds yes">📈 YES: ${yesPercent}%</text>
  <text x="900" y="350" text-anchor="middle" class="odds no">📉 NO: ${noPercent}%</text>
  
  <!-- Progress bar background -->
  <rect x="200" y="380" width="800" height="40" fill="#e5e7eb" rx="20"/>
  
  <!-- YES progress -->
  <rect x="200" y="380" width="${(yesPercent / 100) * 800}" height="40" fill="#10b981" rx="20"/>
  
  <!-- Values -->
  <text x="300" y="450" text-anchor="middle" class="stats">$${market.yes_shares}</text>
  <text x="900" y="450" text-anchor="middle" class="stats">$${market.no_shares}</text>
  
  <!-- Instructions -->
  <text x="600" y="520" text-anchor="middle" class="stats">👆 Click below to bet $5 or view details 👆</text>
  
  <!-- Call to action -->
  <text x="600" y="580" text-anchor="middle" class="title" style="fill:#10b981;">🟢 BET YES    🔴 BET NO    📊 DETAILS</text>
</svg>`;

  // Farcaster prefers PNG images over SVG for frames  
  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Cache-Control', 'public, max-age=60'); // Cache for 1 minute
  res.setHeader('Access-Control-Allow-Origin', '*');
  return res.send(svg);
}

function generateDetailsImage(res: NextApiResponse, market: any) {
  const createdDate = new Date(market.created_at).toLocaleDateString();
  const closeDate = new Date(market.close_time).toLocaleDateString();
  const aiConfidence = Math.round(market.ai_confidence * 100);
  
  const svg = `
<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      .title { font: bold 32px sans-serif; fill: #1f2937; }
      .question { font: 28px sans-serif; fill: #374151; }
      .label { font: bold 22px sans-serif; fill: #6b7280; }
      .value { font: 22px sans-serif; fill: #374151; }
      .bg { fill: #f9fafb; }
      .border { fill: none; stroke: #d1d5db; stroke-width: 2; }
    </style>
  </defs>
  
  <!-- Background -->
  <rect width="1200" height="630" class="bg"/>
  <rect width="1200" height="630" class="border"/>
  
  <!-- Header -->
  <text x="400" y="40" text-anchor="middle" class="title">📊 Market Details</text>
  
  <!-- Question -->
  <text x="400" y="80" text-anchor="middle" class="question">${wrapText(market.question, 35)}</text>
  
  <!-- Details -->
  <text x="50" y="140" class="label">Creator:</text>
  <text x="200" y="140" class="value">@${market.creator_username}</text>
  
  <text x="50" y="170" class="label">Created:</text>
  <text x="200" y="170" class="value">${createdDate}</text>
  
  <text x="50" y="200" class="label">Closes:</text>
  <text x="200" y="200" class="value">${closeDate}</text>
  
  <text x="50" y="230" class="label">AI Confidence:</text>
  <text x="200" y="230" class="value">${aiConfidence}%</text>
  
  <text x="50" y="260" class="label">Market ID:</text>
  <text x="200" y="260" class="value">${market.market_id.substring(0, 20)}...</text>
  
  <text x="50" y="290" class="label">Total Pool:</text>
  <text x="200" y="290" class="value">$${market.total_pool} USDC</text>
  
  <text x="50" y="320" class="label">Participants:</text>
  <text x="200" y="320" class="value">${market.participants.length} users</text>
  
  <!-- Back instruction -->
  <text x="400" y="380" text-anchor="middle" class="label">Click "Back to Market" to return</text>
</svg>`;

  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=300'); // Cache for 5 minutes
  return res.send(svg);
}

function generateBetResponseImage(req: NextApiRequest, res: NextApiResponse) {
  const action = req.query.action as string || 'YES';
  
  const svg = `
<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      .title { font: bold 36px sans-serif; fill: #1f2937; }
      .subtitle { font: 28px sans-serif; fill: #6b7280; }
      .message { font: 24px sans-serif; fill: #374151; }
      .bg { fill: #f9fafb; }
      .border { fill: none; stroke: #d1d5db; stroke-width: 2; }
    </style>
  </defs>
  
  <!-- Background -->
  <rect width="1200" height="630" class="bg"/>
  <rect width="1200" height="630" class="border"/>
  
  <!-- Header -->
  <text x="400" y="80" text-anchor="middle" class="title">🚧 Betting Coming Soon!</text>
  
  <!-- Action -->
  <text x="400" y="140" text-anchor="middle" class="subtitle">You clicked: Bet ${action} $5</text>
  
  <!-- Message -->
  <text x="400" y="200" text-anchor="middle" class="message">USDC betting will be implemented</text>
  <text x="400" y="230" text-anchor="middle" class="message">in Function 6: Smart Contract Integration</text>
  
  <text x="400" y="280" text-anchor="middle" class="message">For now, this is just a preview of the</text>
  <text x="400" y="310" text-anchor="middle" class="message">betting interface that will be available soon!</text>
  
  <!-- Back instruction -->
  <text x="400" y="370" text-anchor="middle" class="subtitle">Click "Back to Market" to return</text>
</svg>`;

  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
  return res.send(svg);
}

function generateErrorImage(res: NextApiResponse, message: string) {
  const svg = `
<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      .title { font: bold 32px sans-serif; fill: #ef4444; }
      .message { font: 24px sans-serif; fill: #6b7280; }
      .bg { fill: #fef2f2; }
      .border { fill: none; stroke: #fecaca; stroke-width: 2; }
    </style>
  </defs>
  
  <!-- Background -->
  <rect width="1200" height="630" class="bg"/>
  <rect width="1200" height="630" class="border"/>
  
  <!-- Error -->
  <text x="400" y="180" text-anchor="middle" class="title">❌ Error</text>
  <text x="400" y="220" text-anchor="middle" class="message">${message}</text>
  <text x="400" y="260" text-anchor="middle" class="message">Please try again later</text>
</svg>`;

  res.setHeader('Content-Type', 'image/svg+xml');
  return res.send(svg);
}

function generateHomeImage(res: NextApiResponse) {
  const svg = `
<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      .title { font: bold 36px sans-serif; fill: #1f2937; }
      .subtitle { font: 28px sans-serif; fill: #374151; }
      .description { font: 22px sans-serif; fill: #6b7280; }
      .bg { fill: #f9fafb; }
      .border { fill: none; stroke: #d1d5db; stroke-width: 2; }
    </style>
  </defs>
  
  <!-- Background -->
  <rect width="1200" height="630" class="bg"/>
  <rect width="1200" height="630" class="border"/>
  
  <!-- Header -->
  <text x="600" y="100" text-anchor="middle" class="title">🎯 iWager Prediction Markets</text>
  <text x="600" y="160" text-anchor="middle" class="subtitle">Bet on the future with USDC</text>
  
  <!-- Description -->
  <text x="600" y="250" text-anchor="middle" class="description">✅ AI-validated predictions</text>
  <text x="600" y="290" text-anchor="middle" class="description">💰 Smart contract betting</text>
  <text x="600" y="330" text-anchor="middle" class="description">🏆 Transparent outcomes</text>
  
  <!-- Call to action -->
  <text x="600" y="450" text-anchor="middle" class="subtitle">Click "View Markets" to start betting!</text>
  
  <!-- Footer -->
  <text x="600" y="550" text-anchor="middle" class="description">Powered by Farcaster Frames • Built with Claude</text>
</svg>`;

  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=300');
  return res.send(svg);
}

function generateNoMarketsImage(res: NextApiResponse) {
  const svg = `
<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      .title { font: bold 32px sans-serif; fill: #6b7280; }
      .message { font: 24px sans-serif; fill: #9ca3af; }
      .bg { fill: #f9fafb; }
      .border { fill: none; stroke: #d1d5db; stroke-width: 2; }
    </style>
  </defs>
  
  <!-- Background -->
  <rect width="1200" height="630" class="bg"/>
  <rect width="1200" height="630" class="border"/>
  
  <!-- Content -->
  <text x="600" y="250" text-anchor="middle" class="title">📭 No Markets Available</text>
  <text x="600" y="320" text-anchor="middle" class="message">Be the first to create a prediction!</text>
  <text x="600" y="360" text-anchor="middle" class="message">Mention @watchthis with your prediction on Farcaster</text>
</svg>`;

  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=60');
  return res.send(svg);
}

function generateBetConfirmImage(req: NextApiRequest, res: NextApiResponse) {
  const marketId = req.query.marketId as string;
  const action = req.query.action as string || 'YES';
  const amount = req.query.amount as string || '5';
  
  const svg = `
<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      .title { font: bold 32px sans-serif; fill: #1f2937; }
      .action { font: bold 36px sans-serif; fill: ${action.toLowerCase() === 'yes' ? '#10b981' : '#ef4444'}; }
      .amount { font: bold 28px sans-serif; fill: #374151; }
      .message { font: 22px sans-serif; fill: #6b7280; }
      .bg { fill: #f9fafb; }
      .border { fill: none; stroke: #d1d5db; stroke-width: 2; }
    </style>
  </defs>
  
  <!-- Background -->
  <rect width="1200" height="630" class="bg"/>
  <rect width="1200" height="630" class="border"/>
  
  <!-- Header -->
  <text x="600" y="120" text-anchor="middle" class="title">🎯 Confirm Your Bet</text>
  
  <!-- Bet details -->
  <text x="600" y="220" text-anchor="middle" class="action">${action.toUpperCase()}</text>
  <text x="600" y="280" text-anchor="middle" class="amount">$${amount} USDC</text>
  
  <!-- Warning -->
  <text x="600" y="360" text-anchor="middle" class="message">⚠️ Function 6: Smart contract betting coming soon</text>
  <text x="600" y="400" text-anchor="middle" class="message">This is a preview of the betting interface</text>
  
  <!-- Instructions -->
  <text x="600" y="480" text-anchor="middle" class="message">Click "Confirm" to proceed or "Cancel" to go back</text>
</svg>`;

  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=60');
  return res.send(svg);
}

function generateBetSuccessImage(req: NextApiRequest, res: NextApiResponse) {
  const action = req.query.action as string || 'YES';
  const amount = req.query.amount as string || '5';
  
  const svg = `
<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      .title { font: bold 36px sans-serif; fill: #10b981; }
      .action { font: bold 32px sans-serif; fill: ${action.toLowerCase() === 'yes' ? '#10b981' : '#ef4444'}; }
      .amount { font: bold 28px sans-serif; fill: #374151; }
      .message { font: 22px sans-serif; fill: #6b7280; }
      .bg { fill: #f0fdf4; }
      .border { fill: none; stroke: #bbf7d0; stroke-width: 2; }
    </style>
  </defs>
  
  <!-- Background -->
  <rect width="1200" height="630" class="bg"/>
  <rect width="1200" height="630" class="border"/>
  
  <!-- Header -->
  <text x="600" y="120" text-anchor="middle" class="title">✅ Bet Confirmed!</text>
  
  <!-- Bet details -->
  <text x="600" y="220" text-anchor="middle" class="message">Your bet:</text>
  <text x="600" y="280" text-anchor="middle" class="action">${action.toUpperCase()} - $${amount} USDC</text>
  
  <!-- Status -->
  <text x="600" y="360" text-anchor="middle" class="message">🚧 Smart contract integration coming in Function 6</text>
  <text x="600" y="400" text-anchor="middle" class="message">Your bet will be processed when implemented</text>
  
  <!-- Instructions -->
  <text x="600" y="500" text-anchor="middle" class="message">Navigate back to view more markets or details</text>
</svg>`;

  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=300');
  return res.send(svg);
}

function wrapText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';
  
  for (const word of words) {
    if ((currentLine + word).length <= maxLength) {
      currentLine += (currentLine ? ' ' : '') + word;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  
  if (currentLine) lines.push(currentLine);
  
  // Return first line only for SVG simplicity
  return lines[0] + (lines.length > 1 ? '...' : '');
}