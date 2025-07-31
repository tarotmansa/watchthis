import { GetServerSideProps } from 'next';
import { supabase } from '../../../lib/supabase';
import Head from 'next/head';
import { useEffect, useState } from 'react';

interface Market {
  market_id: string;
  question: string;
  creator_username: string;
  ai_confidence: number;
  close_time: string;
  total_pool: number;
  yes_shares: number;
  no_shares: number;
  created_at: string;
}

interface MarketFrameProps {
  market: Market | null;
  marketId: string;
}

export default function MarketFrame({ market, marketId }: MarketFrameProps) {
  const [betAmount, setBetAmount] = useState('5');
  const [isLoading, setIsLoading] = useState(false);
  const [sdk, setSdk] = useState<any>(null);

  useEffect(() => {
    // Initialize Farcaster Mini App SDK
    const initSDK = async () => {
      try {
        const { sdk } = await import('@farcaster/miniapp-sdk');
        await sdk.actions.ready();
        setSdk(sdk);
        console.log('✅ Mini App SDK initialized');
      } catch (error) {
        console.error('❌ Failed to initialize Mini App SDK:', error);
      }
    };

    if (typeof window !== 'undefined') {
      initSDK();
    }
  }, []);

  const handleBet = async (betType: 'yes' | 'no') => {
    if (!sdk) {
      console.error('SDK not initialized');
      return;
    }

    setIsLoading(true);
    try {
      // In Function 6, this will handle actual betting
      console.log(`Bet ${betType.toUpperCase()} - $${betAmount} USDC`);
      
      // Show success message for now
      await sdk.actions.showToast({
        type: 'success',
        message: `Bet ${betType.toUpperCase()} $${betAmount} - Coming in Function 6!`
      });
    } catch (error) {
      console.error('Bet error:', error);
      if (sdk.actions.showToast) {
        await sdk.actions.showToast({
          type: 'error',
          message: 'Betting failed - try again'
        });
      }
    } finally {
      setIsLoading(false);
    }
  };
  if (!market) {
    return (
      <>
        <Head>
          <title>Market Not Found</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <meta property="fc:frame" content="vNext" />
          <meta property="fc:frame:image" content={`${process.env.NEXT_PUBLIC_APP_URL}/api/frame/image/error?message=Market not found`} />
          <meta property="fc:frame:button:1" content="Back to Home" />
          <meta property="fc:frame:post_url" content={`${process.env.NEXT_PUBLIC_APP_URL}/api/frames/`} />
          <meta property="og:image" content={`${process.env.NEXT_PUBLIC_APP_URL}/api/frame/image/error?message=Market not found`} />
        </Head>
        <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'monospace' }}>
          <h1>❌ Market Not Found</h1>
          <p>This market doesn't exist or has been removed.</p>
        </div>
      </>
    );
  }

  const totalShares = market.yes_shares + market.no_shares;
  const yesPercent = totalShares > 0 ? Math.round((market.yes_shares / totalShares) * 100) : 50;
  const noPercent = 100 - yesPercent;
  const aiConfidencePercent = Math.round(market.ai_confidence * 100);
  const closeDate = new Date(market.close_time).toLocaleDateString();

  return (
    <>
      <Head>
        <title>{market.question}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        
        {/* Farcaster Frame Meta Tags */}
        <meta property="fc:frame" content="vNext" />
        <meta property="fc:frame:image" content={`${process.env.NEXT_PUBLIC_APP_URL}/api/frame/image/${market.market_id}`} />
        <meta property="fc:frame:button:1" content="Bet YES" />
        <meta property="fc:frame:button:2" content="Bet NO" />
        <meta property="fc:frame:button:3" content="Details" />
        <meta property="fc:frame:input:text" content="Enter bet amount (USDC)" />
        <meta property="fc:frame:post_url" content={`${process.env.NEXT_PUBLIC_APP_URL}/api/frames/market/${market.market_id}`} />
        
        {/* Open Graph Tags */}
        <meta property="og:title" content={market.question} />
        <meta property="og:description" content={`AI Confidence: ${aiConfidencePercent}% • Pool: $${market.total_pool} USDC • Closes: ${closeDate}`} />
        <meta property="og:image" content={`${process.env.NEXT_PUBLIC_APP_URL}/api/frame/image/${market.market_id}`} />
        <meta property="og:url" content={`${process.env.NEXT_PUBLIC_APP_URL}/frames/market/${market.market_id}`} />
      </Head>

      <div style={{
        minHeight: '100vh',
        width: '100%',
        backgroundColor: '#0f172a',
        color: 'white',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        padding: '1rem',
        boxSizing: 'border-box'
      }}>
        {/* Header */}
        <div style={{
          marginBottom: '2rem',
          textAlign: 'center'
        }}>
          <h1 style={{
            fontSize: '1.5rem',
            fontWeight: 'bold',
            margin: '0 0 0.5rem 0',
            lineHeight: '1.4'
          }}>
            🎯 {market.question}
          </h1>
          <p style={{
            color: '#94a3b8',
            margin: '0',
            fontSize: '0.9rem'
          }}>
            iWager Prediction Market
          </p>
        </div>

        {/* Market Stats */}
        <div style={{
          backgroundColor: '#1e293b',
          borderRadius: '12px',
          padding: '1.5rem',
          marginBottom: '2rem',
          border: '1px solid #334155'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1rem',
            marginBottom: '1.5rem'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: '0.25rem' }}>AI CONFIDENCE</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10b981' }}>{aiConfidencePercent}%</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: '0.25rem' }}>TOTAL POOL</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#f59e0b' }}>${market.total_pool}</div>
            </div>
          </div>
          
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: '0.5rem' }}>CURRENT ODDS</div>
            <div style={{ 
              backgroundColor: '#0f172a', 
              borderRadius: '8px', 
              overflow: 'hidden',
              position: 'relative',
              height: '32px'
            }}>
              <div style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: `${yesPercent}%`,
                height: '100%',
                backgroundColor: '#10b981',
                transition: 'width 0.3s ease'
              }} />
              <div style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 1rem',
                fontSize: '0.9rem',
                fontWeight: 'bold'
              }}>
                <span style={{ color: yesPercent > 50 ? 'white' : '#10b981' }}>YES {yesPercent}%</span>
                <span style={{ color: noPercent > 50 ? 'white' : '#ef4444' }}>NO {noPercent}%</span>
              </div>
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1rem',
            fontSize: '0.8rem',
            color: '#94a3b8'
          }}>
            <div>
              <span>Closes: </span>
              <span style={{ color: 'white' }}>{closeDate}</span>
            </div>
            <div>
              <span>Creator: </span>
              <span style={{ color: 'white' }}>@{market.creator_username}</span>
            </div>
          </div>
        </div>

        {/* Betting Interface */}
        <div style={{
          backgroundColor: '#1e293b',
          borderRadius: '12px',
          padding: '1.5rem',
          marginBottom: '2rem',
          border: '1px solid #334155'
        }}>
          <h3 style={{
            margin: '0 0 1rem 0',
            fontSize: '1.1rem',
            fontWeight: 'bold'
          }}>
            Place Your Bet
          </h3>
          
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontSize: '0.9rem',
              color: '#94a3b8'
            }}>
              Bet Amount (USDC)
            </label>
            <input
              type="number"
              value={betAmount}
              onChange={(e) => setBetAmount(e.target.value)}
              placeholder="5"
              min="1"
              style={{
                width: '100%',
                padding: '0.75rem',
                backgroundColor: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '8px',
                color: 'white',
                fontSize: '1rem',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '0.75rem'
          }}>
            <button 
              onClick={() => handleBet('yes')}
              disabled={isLoading}
              style={{
                padding: '1rem',
                backgroundColor: isLoading ? '#6b7280' : '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: 'bold',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.7 : 1
              }}
            >
              {isLoading ? 'Processing...' : 'Bet YES'}
            </button>
            <button 
              onClick={() => handleBet('no')}
              disabled={isLoading}
              style={{
                padding: '1rem',
                backgroundColor: isLoading ? '#6b7280' : '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: 'bold',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.7 : 1
              }}
            >
              {isLoading ? 'Processing...' : 'Bet NO'}
            </button>
          </div>
        </div>

        {/* Status Message */}
        <div style={{
          backgroundColor: '#1e293b',
          borderRadius: '12px',
          padding: '1rem',
          border: '1px solid #334155',
          textAlign: 'center',
          color: '#94a3b8',
          fontSize: '0.9rem'
        }}>
          <p style={{ margin: '0 0 0.5rem 0' }}>🚧 Smart contract betting coming in Function 6</p>
          <p style={{ margin: '0', fontSize: '0.8rem' }}>
            Market ID: {market.market_id.substring(0, 16)}...
          </p>
        </div>
      </div>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { marketId } = context.params!;
  
  try {
    const { data: market, error } = await supabase
      .from('markets')
      .select('*')
      .eq('market_id', marketId)
      .single();

    if (error || !market) {
      return {
        props: {
          market: null,
          marketId: marketId as string
        }
      };
    }

    return {
      props: {
        market,
        marketId: marketId as string
      }
    };
  } catch (error) {
    console.error('Error fetching market:', error);
    return {
      props: {
        market: null,
        marketId: marketId as string
      }
    };
  }
};