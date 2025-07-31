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
  const action = req.query.action as string; // 'yes' or 'no'
  const amount = req.query.amount as string;

  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    // Handle bet confirmation
    const frameData: FrameRequest = req.body;
    const buttonIndex = frameData.untrustedData.buttonIndex;

    if (buttonIndex === 1) {
      // Confirm bet - in Function 6 this will execute the actual bet
      // For now, just show success message
      const html = generateFrameHtml(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/frame/image/bet-success?marketId=${marketId}&action=${action}&amount=${amount}`,
        `${process.env.NEXT_PUBLIC_APP_URL}/api/frames/market/${marketId}`,
        [
          { label: 'Back to Market' },
          { label: 'View All Markets' }
        ],
        undefined,
        `Bet ${action.toUpperCase()} Confirmed!`
      );
      return res.status(200).send(html);
    } else {
      // Cancel bet - go back to market
      const html = generateFrameHtml(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/frame/image/${marketId}`,
        `${process.env.NEXT_PUBLIC_APP_URL}/api/frames/market/${marketId}`,
        [
          { label: 'Bet YES' },
          { label: 'Bet NO' },
          { label: 'Details' }
        ],
        'Enter bet amount (USDC)',
        'Back to Market'
      );
      return res.status(200).send(html);
    }
  }

  // GET request - show bet confirmation
  const html = generateFrameHtml(
    `${process.env.NEXT_PUBLIC_APP_URL}/api/frame/image/bet-confirm?marketId=${marketId}&action=${action}&amount=${amount}`,
    `${process.env.NEXT_PUBLIC_APP_URL}/api/frames/bet/${marketId}?action=${action}&amount=${amount}`,
    [
      { label: `Confirm ${action.toUpperCase()} $${amount}` },
      { label: 'Cancel' }
    ],
    undefined,
    `Confirm ${action.toUpperCase()} Bet`
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
    <title>${title || 'iWager Bet'}</title>
  </head>
  <body>
    <div style="padding: 2rem; font-family: monospace; text-align: center;">
      <h1>🎯 iWager Bet</h1>
      <p>${title || 'Confirm your bet'}</p>
    </div>
  </body>
</html>`;
}