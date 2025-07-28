# iWager Bot - Cursor Development Specification (@watchthis testing bot)

## Development Methodology - ITERATIVE APPROACH

**CRITICAL**: Cursor should develop this bot using iterative, function-by-function approach. Build ONE function at a time, ship it for testing, verify it works, then move to the next function.

### Development Sequence
1. **Function 1**: Webhook detection - just log @watchthis mentions
2. **Ship & Test**: Verify webhook receives mentions correctly
3. **Function 2**: Basic format validation - accept/reject with simple rules
4. **Ship & Test**: Tag @watchthis with valid/invalid formats, verify responses
5. **Function 3**: AI-powered validation using OpenAI
6. **Ship & Test**: Test complex validation scenarios
7. **Function 4**: Market database storage
8. **Ship & Test**: Verify markets save correctly to database
9. **Function 5**: Frame generation (no betting yet)
10. **Ship & Test**: Verify frames render in Farcaster feeds
11. **Function 6**: Smart contract deployment and betting
12. **Ship & Test**: Test real USDC betting functionality
13. **Function 7**: Market resolution and payouts
14. **Ship & Test**: End-to-end betting and payout flow

### Development Rules for Cursor
- **One function per deployment cycle**
- **Test each function thoroughly before moving to next**
- **Use console.log extensively for debugging**
- **Deploy to staging after each function completion**
- **Get explicit approval before moving to next function**
- **Keep functions simple and focused**
- **Write tests for each function as you build it**

## Project Overview

**Product**: iWager Farcaster Prediction Markets Bot  
**Bot Handle**: `@watchthis` (testing bot)  
**Platform**: Farcaster (Base network)  
**Primary Function**: Natural language prediction market creation via bot tagging  
**Core Pattern**: Users tag `@watchthis [prediction] by [timeframe]` to create markets

## Core Architecture

### Component 1: Mention Detection & Validation
**Purpose**: Detect @watchthis mentions and validate market requests
- Monitor Farcaster for @watchthis mentions via Neynar webhooks
- Parse natural language predictions using AI validation
- Respond with market creation or helpful error messages

### Component 2: Market Frame Generation
**Purpose**: Create embedded betting interfaces in channel feeds
- Generate Farcaster Frames with betting UI
- Display real-time odds, pool size, participant stats
- Enable direct USDC wallet connection and betting

### Component 3: Smart Contract Integration
**Purpose**: Handle USDC escrow and automated payouts
- Deploy on Base network for low fees
- Manage betting pools and share calculations
- Automate winner distributions after resolution

## ULTRA-BUDGET Testing Infrastructure

### Required Services (Minimize Costs)
**Total Monthly Cost: ~$49** (just Neynar Starter - already purchased)

**Database**: MongoDB Atlas Free Tier
- **Cost**: $0 (512MB storage - sufficient for testing)
- **Setup**: 5 minutes, create free cluster
- **Limitations**: 512MB limit (handles 1000+ test markets)

**Hosting**: Vercel Free Tier  
- **Cost**: $0 (100GB bandwidth/month)
- **Features**: Auto-deploy from GitHub, serverless functions
- **Limitations**: Sufficient for webhook testing

**AI Validation**: OpenAI Pay-as-you-go
- **Cost**: ~$10-20/month (minimal usage during testing)
- **Strategy**: Use GPT-3.5-turbo (cheaper than GPT-4)
- **Optimization**: Cache validation results, limit calls during development

**Blockchain**: Base Sepolia Testnet (for initial testing)
- **Cost**: $0 (free testnet ETH from faucets)
- **Migration**: Move to Base mainnet only when ready for real USDC testing
- **Real testing**: $50 in USDC for final validation

**Monitoring**: Free tier tools only
- **Vercel Analytics**: Included free
- **Console.log**: For debugging webhook processing
- **MongoDB Atlas basic monitoring**: Included free

```javascript
// Required Dependencies
{
  "dependencies": {
    "@neynar/nodejs-sdk": "^1.x",
    "@coinbase/wallet-sdk": "^3.x", 
    "next": "^14.x",
    "ethers": "^6.x",
    "openai": "^4.x",
    "mongodb": "^6.x"
  }
}
```

### Core Services
- **Webhook Handler**: Neynar webhook processing
- **AI Validator**: OpenAI GPT-4 for market quality assessment  
- **Frame Generator**: Next.js Frame creation and serving
- **Smart Contract**: Solidity contracts for betting mechanics
- **Database**: MongoDB for market and user data

## Bot Validation Logic

### Natural Language Format Requirements
```javascript
const VALID_PATTERNS = [
  /^@watchthis .+ by (today|tomorrow|\d+h|\d+d|December \d+|January \d+)$/i,
  /^@watchthis .+ hits \$\d+k? by .+$/i,
  /^@watchthis .+ outperforms .+ (today|this week|this month)$/i
];

const INVALID_PATTERNS = [
  /\b(happy|sad|successful|good|bad)\b/i,  // subjective terms
  /\b(many|few|around|approximately)\b/i,  // vague quantities
  /\bif .+ then .+\b/i                     // conditional statements
];
```

### Timeframe Options
- `1h`, `6h`, `24h` - Short-term predictions
- `today`, `tomorrow` - Day-based outcomes  
- `3d`, `1week` - Medium-term predictions
- `December 31st`, `January 15th` - Specific dates

### Validation Pipeline
```javascript
async function validateMarketRequest(mention) {
  // 1. Format validation
  if (!mention.text.startsWith('@watchthis')) {
    return { valid: false, error: 'Must start with @watchthis' };
  }
  
  // 2. Extract and validate timeframe
  const timeframe = extractTimeframe(mention.text);
  if (!isValidTimeframe(timeframe)) {
    return { valid: false, error: 'Invalid timeframe. Use: 1h, 24h, today, tomorrow, etc.' };
  }
  
  // 3. AI ambiguity check via OpenAI
  const ambiguityScore = await checkAmbiguity(mention.text);
  if (ambiguityScore > 0.7) {
    return { valid: false, error: 'Prediction too vague. Be more specific about the outcome.' };
  }
  
  // 4. Data validation for crypto predictions
  if (isCryptoPrediction(mention.text)) {
    const dataCheck = await validateCryptoData(mention.text);
    if (!dataCheck.valid) {
      return { valid: false, error: dataCheck.suggestion };
    }
  }
  
  return { valid: true, market: createMarketData(mention.text, timeframe) };
}
```

## API Integration Requirements

### Neynar Webhook Setup
```javascript
// webhook endpoint: /api/neynar/webhook
app.post('/api/neynar/webhook', async (req, res) => {
  const { data } = req.body;
  
  if (data.type === 'cast.created' && data.object.text.includes('@watchthis')) {
    await processMention(data.object);
  }
  
  res.status(200).json({ success: true });
});
```

### Frame Generation API
```javascript
// Generate betting frame
app.post('/api/frame/create', async (req, res) => {
  const { marketId, question, timeframe } = req.body;
  
  const frameHtml = generateFrameHtml({
    title: `iWager: ${question}`,
    image: generateMarketImage(marketId),
    buttons: ['Bet YES ($5)', 'Bet NO ($5)', 'View Details'],
    postUrl: `/api/frame/bet/${marketId}`
  });
  
  res.status(200).send(frameHtml);
});
```

## Smart Contract Specification

### Core Contract Structure
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract iWagerMarket is ReentrancyGuard {
    IERC20 public immutable USDC;
    
    struct Market {
        uint256 id;
        string question;
        address creator;
        uint256 totalPool;
        uint256 yesShares;
        uint256 noShares;
        uint256 closeTime;
        bool resolved;
        bool outcome;
    }
    
    mapping(uint256 => Market) public markets;
    mapping(uint256 => mapping(address => uint256)) public yesBets;
    mapping(uint256 => mapping(address => uint256)) public noBets;
    
    event MarketCreated(uint256 indexed marketId, string question);
    event BetPlaced(uint256 indexed marketId, address indexed user, bool isYes, uint256 amount);
    event MarketResolved(uint256 indexed marketId, bool outcome);
    
    function createMarket(string memory _question, uint256 _duration) external returns (uint256) {
        uint256 marketId = uint256(keccak256(abi.encode(_question, block.timestamp)));
        
        markets[marketId] = Market({
            id: marketId,
            question: _question,
            creator: msg.sender,
            totalPool: 0,
            yesShares: 0,
            noShares: 0,
            closeTime: block.timestamp + _duration,
            resolved: false,
            outcome: false
        });
        
        emit MarketCreated(marketId, _question);
        return marketId;
    }
    
    function placeBet(uint256 _marketId, bool _isYes, uint256 _amount) external nonReentrant {
        require(block.timestamp < markets[_marketId].closeTime, "Market closed");
        require(_amount > 0, "Amount must be > 0");
        
        USDC.transferFrom(msg.sender, address(this), _amount);
        
        if (_isYes) {
            yesBets[_marketId][msg.sender] += _amount;
            markets[_marketId].yesShares += _amount;
        } else {
            noBets[_marketId][msg.sender] += _amount;
            markets[_marketId].noShares += _amount;
        }
        
        markets[_marketId].totalPool += _amount;
        emit BetPlaced(_marketId, msg.sender, _isYes, _amount);
    }
}
```

## Database Schema

### MongoDB Collections
```javascript
// markets collection
{
  _id: ObjectId,
  marketId: String,
  question: String,
  creator: String, // FID
  channelId: String,
  timeframe: String,
  closeTime: Date,
  resolved: Boolean,
  outcome: Boolean,
  totalPool: Number,
  yesShares: Number,
  noShares: Number,
  participants: [String], // Array of FIDs
  createdAt: Date
}

// bets collection  
{
  _id: ObjectId,
  marketId: String,
  userFid: String,
  amount: Number,
  isYes: Boolean,
  txHash: String,
  timestamp: Date
}

// users collection
{
  _id: ObjectId,
  fid: String,
  address: String,
  totalBets: Number,
  winRate: Number,
  lastActive: Date
}
```

## Testing Requirements

### Unit Tests
```javascript
// Test bot validation logic
describe('Bot Validation', () => {
  test('accepts valid prediction format', () => {
    const valid = validateMarketRequest('@watchthis BTC hits $100k by December 31st');
    expect(valid.isValid).toBe(true);
  });
  
  test('rejects vague predictions', () => {
    const invalid = validateMarketRequest('@watchthis crypto goes up tomorrow');
    expect(invalid.isValid).toBe(false);
    expect(invalid.error).toContain('too vague');
  });
  
  test('handles timeframe extraction', () => {
    const timeframe = extractTimeframe('@watchthis ETH hits $5k by tomorrow');
    expect(timeframe).toBe('24h');
  });
});
```

### Integration Tests
```javascript
// Test full mention-to-frame flow
describe('End-to-End Flow', () => {
  test('processes mention and creates frame', async () => {
    const mention = createMockMention('@watchthis BTC hits $100k by December 31st');
    const result = await processMention(mention);
    
    expect(result.frameCreated).toBe(true);
    expect(result.marketId).toBeDefined();
  });
});
```

## Deployment Configuration

### Environment Variables (Minimal Setup)
```bash
# Required for testing (minimal cost)
NEYNAR_API_KEY=your_existing_neynar_key
MONGODB_URI=mongodb+srv://free-cluster-url
OPENAI_API_KEY=your_openai_key

# Bot account (free to create)
BOT_FID=your_watchthis_bot_fid
BOT_MNEMONIC=your_watchthis_bot_mnemonic

# Blockchain (start with testnet - free)
BASE_RPC_URL=https://sepolia.base.org  # Free testnet initially
PRIVATE_KEY=your_test_wallet_private_key

# Optional for initial testing
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

### Ultra-Budget Deployment Steps
1. **Create MongoDB Atlas free cluster** (5 minutes)
2. **Deploy to Vercel free tier** from GitHub (10 minutes)
3. **Configure Neynar webhooks** to point to Vercel URL (5 minutes)
4. **Set up @watchthis bot account** posting permissions (10 minutes)
5. **Test webhook reception** with live @watchthis mentions (5 minutes)
6. **Start Iteration 1** development (webhook detection)

## Error Handling

### Bot Response Examples
```javascript
const ERROR_RESPONSES = {
  FORMAT_ERROR: "Format your prediction like: @watchthis BTC hits $100k by December 31st",
  VAGUE_ERROR: "Too vague! Be specific about the outcome and measurement.",
  TIMEFRAME_ERROR: "Use a valid timeframe: 1h, 24h, today, tomorrow, December 31st, etc.",
  DUPLICATE_ERROR: "This market already exists. Check the channel for the existing prediction.",
  TECHNICAL_ERROR: "Technical issue creating market. Please try again in a moment."
};
```

### Graceful Degradation
- If OpenAI API fails, use rule-based validation
- If Frame generation fails, post simple text response with market details
- If smart contract deployment fails, queue for retry with exponential backoff

## Performance Requirements

### Response Times
- Bot mention detection: < 30 seconds
- Frame generation: < 5 seconds  
- Blockchain transactions: < 2 minutes on Base
- Market resolution: < 1 hour after timeframe expires

### Scalability Targets
- Handle 100+ concurrent mentions per hour
- Support 50+ active markets simultaneously
- Process 1000+ daily betting transactions
- Maintain 99.9% uptime for critical bot functions

## Security Considerations

### Input Validation
- Sanitize all user inputs before AI processing
- Rate limit mentions per user (max 5 per hour)
- Validate timeframes against reasonable bounds
- Check for spam and abuse patterns

### Smart Contract Security
- Use OpenZeppelin security patterns
- Implement reentrancy guards on betting functions
- Add emergency pause functionality
- Require multi-signature for contract upgrades

## Monitoring & Analytics

### Key Metrics to Track
- Mention response time and success rate
- Market creation success rate
- Frame engagement (clicks, bets placed)
- Smart contract transaction success rate
- User retention and betting frequency

### Logging Requirements
```javascript
// Log all bot interactions
logger.info({
  event: 'mention_processed',
  fid: mention.author.fid,
  channel: mention.channel,
  question: validatedMarket.question,
  success: true,
  processingTime: Date.now() - startTime
});
```

This specification provides Cursor with the technical requirements needed to build and test the iWager bot using @watchthis as the testing bot handle. The ultra-budget infrastructure setup minimizes costs while enabling full functionality testing.

**CRITICAL REMINDER FOR CURSOR**: Follow the iterative development approach. Build ONE function at a time, ship it, test it thoroughly, then move to the next iteration. Do not attempt to build the entire bot at once.

**Start with Iteration 1**: Webhook detection and mention logging. Get that working perfectly before moving to format validation in Iteration 2.

## Budget Summary

### Total Testing Costs
- **Neynar Starter**: $49/month ✅ (already purchased)
- **MongoDB Atlas**: $0/month (free tier)
- **Vercel Hosting**: $0/month (free tier)  
- **OpenAI API**: ~$15/month (minimal usage with caching)
- **Base Sepolia**: $0 (testnet - free)
- **Base Mainnet**: $50 one-time (for final USDC testing)

**Total Monthly**: ~$64/month during testing
**One-time costs**: ~$50 for final validation

### Cost Optimization Strategies
- **Cache OpenAI responses** to reduce API calls
- **Use testnet extensively** before mainnet deployment
- **Start with minimal test USDC** amounts ($5-10 bets)
- **Deploy incrementally** to catch issues early
- **Use console.log** instead of paid monitoring during development