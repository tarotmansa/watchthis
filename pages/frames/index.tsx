import { GetServerSideProps } from 'next';
import { supabase } from '../../lib/supabase';
import Head from 'next/head';
import Link from 'next/link';

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

interface FramesHomeProps {
  markets: Market[];
}

export default function FramesHome({ markets }: FramesHomeProps) {
  return (
    <>
      <Head>
        <title>iWager Prediction Markets</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        
        {/* Farcaster Frame Meta Tags */}
        <meta property="fc:frame" content="vNext" />
        <meta property="fc:frame:image" content={`${process.env.NEXT_PUBLIC_APP_URL}/api/frame/image/home`} />
        <meta property="fc:frame:button:1" content="View Markets" />
        <meta property="fc:frame:post_url" content={`${process.env.NEXT_PUBLIC_APP_URL}/api/frames/`} />
        
        {/* Open Graph Tags */}
        <meta property="og:title" content="iWager Prediction Markets" />
        <meta property="og:description" content="AI-validated prediction markets on Farcaster" />
        <meta property="og:image" content={`${process.env.NEXT_PUBLIC_APP_URL}/api/frame/image/home`} />
        <meta property="og:url" content={`${process.env.NEXT_PUBLIC_APP_URL}/frames/`} />
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
            fontSize: '2rem',
            fontWeight: 'bold',
            margin: '0 0 0.5rem 0',
            background: 'linear-gradient(45deg, #10b981, #3b82f6)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            🎯 iWager
          </h1>
          <p style={{
            color: '#94a3b8',
            margin: '0',
            fontSize: '1.1rem'
          }}>
            AI-Validated Prediction Markets
          </p>
        </div>

        {/* Features */}
        <div style={{
          backgroundColor: '#1e293b',
          borderRadius: '12px',
          padding: '1.5rem',
          marginBottom: '2rem',
          border: '1px solid #334155'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            textAlign: 'center'
          }}>
            <div>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>✅</div>
              <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>AI Validated</div>
              <div style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Smart prediction filtering</div>
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>💰</div>
              <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>USDC Betting</div>
              <div style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Smart contract powered</div>
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🏆</div>
              <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>Transparent</div>
              <div style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Verifiable outcomes</div>
            </div>
          </div>
        </div>

        {/* Markets */}
        {markets.length > 0 ? (
          <>
            <h2 style={{
              fontSize: '1.3rem',
              fontWeight: 'bold',
              margin: '0 0 1rem 0'
            }}>
              Active Markets
            </h2>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}>
              {markets.slice(0, 5).map((market) => {
                const totalShares = market.yes_shares + market.no_shares;
                const yesPercent = totalShares > 0 ? Math.round((market.yes_shares / totalShares) * 100) : 50;
                const aiConfidence = Math.round(market.ai_confidence * 100);
                const closeDate = new Date(market.close_time).toLocaleDateString();

                return (
                  <Link 
                    key={market.market_id} 
                    href={`/frames/market/${market.market_id}`}
                    style={{ textDecoration: 'none' }}
                  >
                    <div style={{
                      backgroundColor: '#1e293b',
                      borderRadius: '12px',
                      padding: '1.5rem',
                      border: '1px solid #334155',
                      cursor: 'pointer',
                      transition: 'border-color 0.2s ease'
                    }}>
                      <h3 style={{
                        fontSize: '1.1rem',
                        fontWeight: 'bold',
                        margin: '0 0 1rem 0',
                        color: 'white',
                        lineHeight: '1.4'
                      }}>
                        {market.question}
                      </h3>
                      
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                        gap: '1rem',
                        marginBottom: '1rem',
                        fontSize: '0.9rem'
                      }}>
                        <div>
                          <span style={{ color: '#94a3b8' }}>AI: </span>
                          <span style={{ color: '#10b981', fontWeight: 'bold' }}>{aiConfidence}%</span>
                        </div>
                        <div>
                          <span style={{ color: '#94a3b8' }}>Pool: </span>
                          <span style={{ color: '#f59e0b', fontWeight: 'bold' }}>${market.total_pool}</span>
                        </div>
                        <div>
                          <span style={{ color: '#94a3b8' }}>YES: </span>
                          <span style={{ color: '#10b981', fontWeight: 'bold' }}>{yesPercent}%</span>
                        </div>
                        <div>
                          <span style={{ color: '#94a3b8' }}>Closes: </span>
                          <span style={{ color: 'white' }}>{closeDate}</span>
                        </div>
                      </div>

                      <div style={{
                        backgroundColor: '#0f172a',
                        borderRadius: '6px',
                        height: '24px',
                        overflow: 'hidden',
                        position: 'relative'
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
                          right: 0,
                          top: 0,
                          width: `${100 - yesPercent}%`,
                          height: '100%',
                          backgroundColor: '#ef4444'
                        }} />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        ) : (
          <div style={{
            backgroundColor: '#1e293b',
            borderRadius: '12px',
            padding: '2rem',
            border: '1px solid #334155',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: '0 0 0.5rem 0' }}>
              No Markets Available
            </h3>
            <p style={{ color: '#94a3b8', margin: '0', fontSize: '0.9rem' }}>
              Be the first to create a prediction!
            </p>
            <p style={{ color: '#94a3b8', margin: '0.5rem 0 0 0', fontSize: '0.9rem' }}>
              Mention @watchthis with your prediction on Farcaster
            </p>
          </div>
        )}

        {/* Footer */}
        <div style={{
          marginTop: '2rem',
          textAlign: 'center',
          color: '#64748b',
          fontSize: '0.8rem',
          padding: '1rem'
        }}>
          <p style={{ margin: '0' }}>
            Powered by Farcaster Frames • Built with Claude
          </p>
        </div>
      </div>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async () => {
  try {
    const { data: markets, error } = await supabase
      .from('markets')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching markets:', error);
      return {
        props: {
          markets: []
        }
      };
    }

    return {
      props: {
        markets: markets || []
      }
    };
  } catch (error) {
    console.error('Error in getServerSideProps:', error);
    return {
      props: {
        markets: []
      }
    };
  }
};