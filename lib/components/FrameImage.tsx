import React from 'react';

interface FrameImageProps {
  market: {
    question: string;
    total_pool: number;
    close_time: string;
    yes_shares: number;
    no_shares: number;
  };
}

export function FrameImage({ market }: FrameImageProps) {
  const totalShares = market.yes_shares + market.no_shares;
  const yesPercent = totalShares > 0 ? Math.round((market.yes_shares / totalShares) * 100) : 50;
  const noPercent = 100 - yesPercent;
  const closeDate = new Date(market.close_time).toLocaleDateString();

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        backgroundColor: '#f0f2f5',
        padding: '40px',
        fontFamily: '"SF Pro", "system-ui", "BlinkMacSystemFont", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", sans-serif',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          maxWidth: '1000px',
          backgroundColor: 'white',
          borderRadius: '24px',
          padding: '48px',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)',
        }}
      >
        <h1 style={{ fontSize: '48px', margin: '0 0 24px 0', color: '#111827' }}>
          {market.question}
        </h1>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ fontSize: '28px', color: '#6b7280', marginRight: '16px' }}>💰 Pool:</span>
            <span style={{ fontSize: '32px', fontWeight: 'bold', color: '#111827' }}>${market.total_pool} USDC</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ fontSize: '28px', color: '#6b7280', marginRight: '16px' }}>⏰ Closes:</span>
            <span style={{ fontSize: '32px', fontWeight: 'bold', color: '#111827' }}>{closeDate}</span>
          </div>
        </div>
        <div style={{ display: 'flex', width: '100%', gap: '24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, backgroundColor: '#f3f4f6', borderRadius: '16px', padding: '32px' }}>
            <span style={{ fontSize: '36px', fontWeight: 'bold', color: '#10b981', marginBottom: '16px' }}>YES: {yesPercent}%</span>
            <div style={{ width: '100%', height: '16px', backgroundColor: '#e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
              <div style={{ width: `${yesPercent}%`, height: '100%', backgroundColor: '#10b981' }} />
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, backgroundColor: '#f3f4f6', borderRadius: '16px', padding: '32px' }}>
            <span style={{ fontSize: '36px', fontWeight: 'bold', color: '#ef4444', marginBottom: '16px' }}>NO: {noPercent}%</span>
            <div style={{ width: '100%', height: '16px', backgroundColor: '#e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
              <div style={{ width: `${noPercent}%`, height: '100%', backgroundColor: '#ef4444' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
