import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../../lib/supabase';

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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { marketId } = req.query;

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
    const userInput = frameData.untrustedData.inputText || '5';

    // Get market data
    const { data: market, error } = await supabase
      .from('markets')
      .select('*')
      .eq('market_id', marketId)
      .single();

    if (error || !market) {
      const html = generateFrameHtml(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/frame/image/error?message=Market not found`,
        `${process.env.NEXT_PUBLIC_APP_URL}/api/frames/`,
        [{ label: 'Back to Home' }],
        undefined,
        'Market Not Found'
      );
      return res.status(404).send(html);
    }

    if (buttonIndex === 1) {
      // Bet YES
      const html = generateFrameHtml(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/frame/image/bet-confirm?marketId=${marketId}&action=yes&amount=${userInput}`,
        `${process.env.NEXT_PUBLIC_APP_URL}/api/frames/bet/${marketId}?action=yes&amount=${userInput}`,
        [
          { label: 'Confirm YES Bet' },
          { label: 'Back to Market' }
        ],
        undefined,
        `Confirm YES Bet - $${userInput}`
      );
      return res.status(200).send(html);
    } else if (buttonIndex === 2) {
      // Bet NO
      const html = generateFrameHtml(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/frame/image/bet-confirm?marketId=${marketId}&action=no&amount=${userInput}`,
        `${process.env.NEXT_PUBLIC_APP_URL}/api/frames/bet/${marketId}?action=no&amount=${userInput}`,
        [
          { label: 'Confirm NO Bet' },
          { label: 'Back to Market' }
        ],
        undefined,
        `Confirm NO Bet - $${userInput}`
      );
      return res.status(200).send(html);
    } else if (buttonIndex === 3) {
      // Details
      const html = generateFrameHtml(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/frame/image/${marketId}?view=details`,
        `${process.env.NEXT_PUBLIC_APP_URL}/api/frames/market/${marketId}`,
        [
          { label: 'Back to Market' },
          { label: 'View All Markets' }
        ],
        undefined,
        `Market Details: ${market.question}`
      );
      return res.status(200).send(html);
    }
  }

  // GET request - return market frame
  const { data: market, error } = await supabase
    .from('markets')
    .select('*')
    .eq('market_id', marketId)
    .single();

  if (error || !market) {
    const html = generateFrameHtml(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/frame/image/error?message=Market not found`,
      `${process.env.NEXT_PUBLIC_APP_URL}/api/frames/`,
      [{ label: 'Back to Home' }],
      undefined,
      'Market Not Found'
    );
    return res.status(404).send(html);
  }

  const html = generateFrameHtml(
    `${process.env.NEXT_PUBLIC_APP_URL}/api/frame/image/${marketId}`,
    `${process.env.NEXT_PUBLIC_APP_URL}/api/frames/market/${marketId}`,
    [
      { label: 'Bet YES' },
      { label: 'Bet NO' },
      { label: 'Details' }
    ],
    'Enter bet amount (USDC)',
    market.question
  );
  return res.status(200).send(html);
}

function generateFrameHtml(imageUrl: string, postUrl: string, buttons: { label: string }[], inputText?: string, title?: string): string {
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
    <title>${title || 'iWager Market'}</title>
  </head>
  <body>
    <div style="padding: 2rem; font-family: monospace; text-align: center;">
      <h1>🎯 iWager Market</h1>
      <p>${title || 'Prediction Market'}</p>
    </div>
  </body>
</html>`;
}