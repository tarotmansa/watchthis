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
    inputText?: string;
    castId?: {
      fid: number;
      hash: string;
    };
  };
}

// Frame home page - lists recent markets
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    // Handle frame interactions
    const frameData: FrameRequest = req.body;
    const buttonIndex = frameData.untrustedData.buttonIndex;
    
    // Get recent markets
    const { data: markets, error } = await supabase
      .from('markets')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (error || !markets || markets.length === 0) {
      const html = generateFrameHtml(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/frame/image/no-markets`,
        `${process.env.NEXT_PUBLIC_APP_URL}/api/frames/`,
        [{ label: 'No markets yet' }]
      );
      return res.status(200).send(html);
    }

    // Show first market
    const market = markets[0];
    const html = generateFrameHtml(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/frame/image/${market.market_id}`,
      `${process.env.NEXT_PUBLIC_APP_URL}/api/frames/market/${market.market_id}`,
      [
        { label: 'Bet YES' },
        { label: 'Bet NO' },
        { label: 'Details' }
      ],
      'Enter bet amount (USDC)'
    );
    return res.status(200).send(html);
  }

  // GET request - return initial frame
  const html = generateFrameHtml(
    `${process.env.NEXT_PUBLIC_APP_URL}/api/frame/image/home`,
    `${process.env.NEXT_PUBLIC_APP_URL}/api/frames/`,
    [{ label: 'View Markets' }]
  );
  return res.status(200).send(html);
}

function generateFrameHtml(imageUrl: string, postUrl: string, buttons: { label: string }[], inputText?: string): string {
  const buttonTags = buttons.map((button, index) => 
    `<meta property="fc:frame:button:${index + 1}" content="${button.label}" />`
  ).join('\n    ');

  const inputTag = inputText ? `<meta property="fc:frame:input:text" content="${inputText}" />` : '';

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width" />
    <meta property="fc:frame" content="vNext" />
    <meta property="fc:frame:image" content="${imageUrl}" />
    <meta property="fc:frame:post_url" content="${postUrl}" />
    ${buttonTags}
    ${inputTag}
    <meta property="og:image" content="${imageUrl}" />
    <title>iWager Prediction Markets</title>
  </head>
  <body>
    <div style="padding: 2rem; font-family: monospace; text-align: center;">
      <h1>🎯 iWager Prediction Markets</h1>
      <p>Interactive betting frames powered by Farcaster</p>
    </div>
  </body>
</html>`;
}