import { NextPage } from 'next';

const Home: NextPage = () => {
  return (
    <div style={{ padding: '2rem', fontFamily: 'monospace' }}>
      <h1>iWager @watchthis Bot</h1>
      <p>Status: Function 1 - Webhook Detection Active</p>
      <p>Webhook endpoint: <code>/api/neynar/webhook</code></p>
      <p>Monitoring for @watchthis mentions...</p>
      
      <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
        <h3>Development Progress</h3>
        <ul>
          <li>✅ Function 1: Webhook detection and mention logging</li>
          <li>⏳ Function 2: Format validation (next iteration)</li>
          <li>⏳ Function 3: AI-powered validation</li>
          <li>⏳ Function 4: Market database storage</li>
          <li>⏳ Function 5: Frame generation</li>
          <li>⏳ Function 6: Smart contract betting</li>
          <li>⏳ Function 7: Market resolution and payouts</li>
        </ul>
      </div>
    </div>
  );
};

export default Home;