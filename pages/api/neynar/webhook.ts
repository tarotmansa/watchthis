import { NextApiRequest, NextApiResponse } from 'next';
import { NeynarAPIClient } from '@neynar/nodejs-sdk';
import OpenAI from 'openai';
import { createMarket, extractTimeframe } from '../../../lib/market-creation';
import { supabase } from '../../../lib/supabase';

interface NeynarWebhookData {
  type: string;
  object: {
    hash: string;
    thread_hash: string;
    parent_hash?: string | null;
    parent_url?: string | null;
    root_parent_url?: string | null;
    parent_author?: {
      fid: number;
    } | null;
    author: {
      object: string;
      fid: number;
      custody_address: string;
      username: string;
      display_name: string;
      pfp_url: string;
      profile: {
        bio: {
          text: string;
        };
      };
      follower_count: number;
      following_count: number;
      verifications: string[];
      verified_addresses: {
        eth_addresses: string[];
        sol_addresses: string[];
      };
      active_status: string;
      power_badge: boolean;
    };
    text: string;
    timestamp: string;
    embeds: any[];
    reactions: {
      likes_count: number;
      recasts_count: number;
      likes: any[];
      recasts: any[];
    };
    replies: {
      count: number;
    };
    channel?: {
      id: string;
      name: string;
      parent_url: string;
      image_url: string;
      viewer_context?: {
        following: boolean;
      };
    } | null;
    mentioned_profiles: any[];
  };
}

interface NeynarWebhookPayload {
  data: NeynarWebhookData;
  created_at: number;
}

interface ValidationResult {
  valid: boolean;
  error?: string;
  errorType?: 'FORMAT_ERROR' | 'VAGUE_ERROR' | 'TIMEFRAME_ERROR';
}

interface AIValidationResult {
  valid: boolean;
  error?: string;
  confidence?: number;
  reasoning?: string;
}

function validateMarketRequest(text: string): ValidationResult {
  console.log('🔍 Starting validation for text:', text);

  // Must start with @watchthis
  if (!text.toLowerCase().includes('@watchthis')) {
    return { 
      valid: false, 
      error: 'Must include @watchthis', 
      errorType: 'FORMAT_ERROR' 
    };
  }

  // Check for subjective terms that make predictions too vague
  const subjectiveTerms = ['happy', 'sad', 'successful', 'good', 'bad', 'amazing', 'terrible'];
  const hasSubjectiveTerms = subjectiveTerms.some(term => 
    text.toLowerCase().includes(term.toLowerCase())
  );
  
  if (hasSubjectiveTerms) {
    return { 
      valid: false, 
      error: 'Too vague! Be specific about the outcome and measurement.', 
      errorType: 'VAGUE_ERROR' 
    };
  }

  // Check for vague quantities
  const vageQuantities = ['many', 'few', 'around', 'approximately', 'some', 'several'];
  const hasVagueQuantities = vageQuantities.some(term => 
    text.toLowerCase().includes(term.toLowerCase())
  );
  
  if (hasVagueQuantities) {
    return { 
      valid: false, 
      error: 'Too vague! Be specific about quantities and measurements.', 
      errorType: 'VAGUE_ERROR' 
    };
  }

  // Check for conditional statements
  if (text.toLowerCase().includes(' if ') && text.toLowerCase().includes(' then ')) {
    return { 
      valid: false, 
      error: 'No conditional statements. Make direct predictions.', 
      errorType: 'FORMAT_ERROR' 
    };
  }

  // Extract and validate timeframe
  const timeframePatterns = [
    /\b(\d+h|\d+hr|\d+hour|\d+hours)\b/i,
    /\b(\d+d|\d+day|\d+days)\b/i,
    /\b(today|tomorrow)\b/i,
    /\b(december|january|february|march|april|may|june|july|august|september|october|november)\s+\d{1,2}(st|nd|rd|th)?\b/i,
    /\bby\s+(december|january|february|march|april|may|june|july|august|september|october|november)\s+\d{1,2}(st|nd|rd|th)?\b/i,
    /\b(this\s+week|next\s+week|this\s+month|next\s+month)\b/i,
    /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/, // Date format like 12/31/2024
    /\b(24h|1week|1w)\b/i,
    /\b(EOY|eoy|end\s+of\s+year)\b/i // End of year
  ];

  const hasValidTimeframe = timeframePatterns.some(pattern => pattern.test(text));
  
  if (!hasValidTimeframe) {
    return { 
      valid: false, 
      error: 'Use a valid timeframe: 1h, 24h, today, tomorrow, December 31st, etc.', 
      errorType: 'TIMEFRAME_ERROR' 
    };
  }

  console.log('✅ Validation passed for text:', text);
  return { valid: true };
}

async function aiValidateMarketRequest(text: string): Promise<AIValidationResult> {
  try {
    const openrouterApiKey = process.env.OPENROUTER_API_KEY;
    
    if (!openrouterApiKey) {
      console.error('❌ Missing OPENROUTER_API_KEY');
      return { 
        valid: false, 
        error: 'AI validation unavailable - missing API key',
        confidence: 0
      };
    }

    const openai = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: openrouterApiKey,
    });

    console.log('🤖 Initializing AI validation...');
    console.log('📝 Text to validate:', text);
    console.log('🔧 Using model: mistralai/mistral-7b-instruct');
    console.log('🌐 API endpoint: https://openrouter.ai/api/v1');
    
    const startTime = Date.now();

    const prompt = `You are a prediction market validator. Analyze this prediction request and determine if it's valid for a betting market.

PREDICTION REQUEST: "${text}"

Evaluate based on these criteria:
1. MEASURABLE: Can the outcome be objectively measured/verified?
2. TIME-BOUND: Does it have a clear resolution timeframe?
3. SPECIFIC: Is it specific enough to avoid ambiguity?
4. RESOLVABLE: Can we determine a clear winner/outcome?
5. NOT SUBJECTIVE: Avoids opinions, feelings, or subjective judgments?

INVALID EXAMPLES:
- "Bitcoin will be successful" (too subjective)
- "Many people will buy ETH" (vague quantity)
- "If BTC rises then ETH will follow" (conditional)
- "Crypto will moon soon" (vague timeframe and outcome)

VALID EXAMPLES:
- "BTC hits $100k by December 31st, 2024"
- "ETH outperforms BTC today"
- "Tesla stock closes above $300 by Friday"

Response format (JSON only):
{
  "valid": true/false,
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation of decision",
  "error": "Error message if invalid (null if valid)"
}`;

    console.log('📤 Sending request to OpenRouter API...');
    const completion = await openai.chat.completions.create({
      model: "mistralai/mistral-7b-instruct",
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.1,
      max_tokens: 200,
    });

    const responseTime = Date.now() - startTime;
    const response = completion.choices[0].message.content?.trim();
    
    console.log('📥 AI API Response received');
    console.log('⏱️ Response time:', responseTime + 'ms');
    console.log('🤖 Raw AI response:', response);
    console.log('📊 API usage:', {
      model: completion.model,
      promptTokens: completion.usage?.prompt_tokens,
      completionTokens: completion.usage?.completion_tokens,
      totalTokens: completion.usage?.total_tokens,
    });

    if (!response) {
      throw new Error('Empty response from AI');
    }

    // Parse JSON response
    console.log('🔄 Parsing AI response...');
    let aiResult;
    try {
      aiResult = JSON.parse(response);
      console.log('✅ JSON parsing successful');
      console.log('📋 Parsed AI result:', aiResult);
    } catch (parseError) {
      console.error('❌ JSON parsing failed');
      console.error('📝 Original response:', response);
      console.error('🐛 Parse error:', parseError);
      throw new Error('Invalid JSON response from AI');
    }

    const result: AIValidationResult = {
      valid: aiResult.valid === true,
      confidence: aiResult.confidence || 0,
      reasoning: aiResult.reasoning || '',
      error: aiResult.error || undefined
    };

    console.log('✅ AI validation processing complete');
    console.log('📊 Final validation result:', {
      valid: result.valid,
      confidence: result.confidence,
      confidencePercent: Math.round((result.confidence || 0) * 100) + '%',
      reasoning: result.reasoning,
      error: result.error,
      processingTime: responseTime + 'ms'
    });
    
    return result;

  } catch (error) {
    console.error('\n💥 AI VALIDATION ERROR OCCURRED');
    console.error('🐛 Error type:', error instanceof Error ? error.constructor.name : 'Unknown');
    console.error('📝 Error message:', error instanceof Error ? error.message : 'Unknown error');
    console.error('📊 Error details:', {
      text: text,
      apiKey: process.env.OPENROUTER_API_KEY ? 'Present' : 'Missing',
      timestamp: new Date().toISOString(),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return {
      valid: false,
      error: 'AI validation failed - technical error',
      confidence: 0,
      reasoning: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function sendBotReplyWithFrame(parentHash: string, replyText: string, marketId: string): Promise<boolean> {
  try {
    const neynarApiKey = process.env.NEYNAR_API_KEY;
    const botSignerUuid = process.env.BOT_SIGNER_UUID;
    
    if (!neynarApiKey || !botSignerUuid) {
      console.error('❌ Missing required environment variables: NEYNAR_API_KEY or BOT_SIGNER_UUID');
      return false;
    }

    const client = new NeynarAPIClient(neynarApiKey);
    
    console.log('🤖 Publishing direct frame cast (not embed):', {
      parentHash,
      replyText: replyText.substring(0, 100) + '...',
      marketId,
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    // Ensure proper HTTPS URL formatting for ngrok compatibility
    const baseUrl = appUrl?.endsWith('/') ? appUrl.slice(0, -1) : appUrl;
    const frameUrl = `${baseUrl}/api/frame/${marketId}`;

    console.log('🖼️ Publishing cast with frame embed - using proper Farcaster frame embedding');
    
    // Publish the success message with the frame as an embed (not plain text)
    const cast = await client.publishCast(botSignerUuid, replyText, {
      replyTo: parentHash,
      embeds: [
        {
          url: frameUrl
        }
      ]
    });

    console.log('✅ Frame cast sent successfully:', {
      castHash: cast.hash,
      parentHash,
      frameUrl,
    });

    return true;
  } catch (error) {
    console.error('💥 Error sending frame cast:', error);
    console.error('Frame details:', {
      parentHash,
      replyText,
      marketId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    
    // Fallback to regular reply
    return await sendBotReply(parentHash, replyText);
  }
}

async function sendBotReply(parentHash: string, replyText: string): Promise<boolean> {
  try {
    const neynarApiKey = process.env.NEYNAR_API_KEY;
    const botSignerUuid = process.env.BOT_SIGNER_UUID;
    
    if (!neynarApiKey || !botSignerUuid) {
      console.error('❌ Missing required environment variables: NEYNAR_API_KEY or BOT_SIGNER_UUID');
      return false;
    }

    const client = new NeynarAPIClient(neynarApiKey);
    
    console.log('🤖 Sending regular bot reply:', {
      parentHash,
      replyText: replyText.substring(0, 100) + '...',
    });

    const cast = await client.publishCast(botSignerUuid, replyText, {
      replyTo: parentHash,
    });

    console.log('✅ Bot reply sent successfully:', {
      castHash: cast.hash,
      parentHash,
    });

    return true;
  } catch (error) {
    console.error('💥 Error sending bot reply:', error);
    console.error('Reply details:', {
      parentHash,
      replyText,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return false;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('🚀 Webhook endpoint hit:', {
    method: req.method,
    timestamp: new Date().toISOString(),
    userAgent: req.headers['user-agent'],
    contentType: req.headers['content-type'],
  });

  if (req.method !== 'POST') {
    console.log('❌ Invalid method:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const payload = req.body;
    console.log('📦 Raw webhook payload:', JSON.stringify(payload, null, 2));

    // Handle the actual Neynar webhook structure
    if (payload.type === 'cast.created') {
      const cast = payload.data;
      console.log('📝 New cast detected:', {
        hash: cast.hash,
        author: cast.author.username,
        fid: cast.author.fid,
        text: cast.text,
        channel: cast.channel?.id || 'no-channel',
        timestamp: cast.timestamp,
      });

      // Check if the cast mentions @watchthis
      console.log('🔍 Checking for @watchthis mention in text:', cast.text);
      if (cast.text.includes('@watchthis')) {
        console.log('🎯 @watchthis mention detected!', {
          hash: cast.hash,
          author: cast.author.username,
          fid: cast.author.fid,
          text: cast.text,
          channel: cast.channel?.id || 'no-channel',
          timestamp: cast.timestamp,
          mentioned_profiles: cast.mentioned_profiles,
        });

        // Log the full mention for analysis
        console.log('🔍 Full mention analysis:', {
          castHash: cast.hash,
          authorFid: cast.author.fid,
          authorUsername: cast.author.username,
          authorDisplayName: cast.author.display_name,
          castText: cast.text,
          channelId: cast.channel?.id,
          channelName: cast.channel?.name,
          timestamp: cast.timestamp,
          hasParent: !!cast.parent_hash,
          parentHash: cast.parent_hash,
          threadHash: cast.thread_hash,
          mentionedProfiles: cast.mentioned_profiles.length,
          embedsCount: cast.embeds.length,
          likesCount: cast.reactions.likes_count,
          recastsCount: cast.reactions.recasts_count,
          repliesCount: cast.replies.count,
        });

        // Function 2: Basic format validation
        console.log('\n🔍 STARTING VALIDATION PIPELINE');
        console.log('📝 Cast Details:', {
          hash: cast.hash,
          author: cast.author.username,
          fid: cast.author.fid,
          text: cast.text,
          timestamp: cast.timestamp,
        });
        
        const validation = validateMarketRequest(cast.text);
        
        if (validation.valid) {
          console.log('✅ BASIC VALIDATION PASSED');
          console.log('📊 Basic validation result:', {
            valid: validation.valid,
            text: cast.text,
          });
          
          // Function 3: AI-powered validation with fallback
          const aiValidation = await aiValidateMarketRequest(cast.text);
          
          console.log('\n🤖 STARTING AI VALIDATION');
          
          // Check if AI validation failed due to technical issues
          if (aiValidation.error === 'AI validation unavailable - missing API key' || 
              aiValidation.error === 'AI validation failed - technical error') {
            console.log('⚠️  AI VALIDATION FALLBACK TRIGGERED');
            console.log('📋 Fallback details:', {
              hash: cast.hash,
              error: aiValidation.error,
              reasoning: aiValidation.reasoning,
              fallbackAction: 'Proceeding with basic validation and market creation'
            });
            
            // Fallback: proceed with basic validation and create market
            console.log('\n💾 STARTING MARKET CREATION (FALLBACK MODE)');
            
            const question = cast.text.replace('@watchthis', '').trim();
            const timeframe = extractTimeframe(cast.text);
            
            const market = await createMarket({
              question,
              creatorFid: cast.author.fid,
              creatorUsername: cast.author.username,
              channelId: cast.channel?.id,
              channelName: cast.channel?.name,
              timeframe,
              castHash: cast.hash,
              aiConfidence: 0.8, // Default confidence for fallback
              aiReasoning: 'Basic validation passed, AI validation unavailable',
            });
            
            if (market) {
              const fallbackMessage = `✅ Market created! "${question}"\n\n⚠️ AI validation unavailable (using basic validation)\n⏰ Closes: ${timeframe}\n🆔 Market ID: ${market.market_id}\n\n🔄 Next: Smart contract betting (Function 6)`;
              await sendBotReplyWithFrame(cast.hash, fallbackMessage, market.market_id);
              console.log('✅ FALLBACK MARKET CREATION + NATIVE FRAME SUCCESS');
            } else {
              const fallbackMessage = `✅ Basic validation passed! "${question}"\n\n⚠️ AI validation and market creation unavailable\n🔄 Please try again later`;
              await sendBotReply(cast.hash, fallbackMessage);
              console.log('❌ FALLBACK MARKET CREATION FAILED');
            }
            
          } else if (aiValidation.valid) {
            console.log('🎉 AI VALIDATION PASSED');
            console.log('📊 AI validation results:', {
              valid: aiValidation.valid,
              confidence: aiValidation.confidence,
              confidencePercent: Math.round((aiValidation.confidence || 0) * 100) + '%',
              reasoning: aiValidation.reasoning,
              predictionText: cast.text.replace('@watchthis', '').trim(),
            });
            
            // Function 4: Market database storage
            console.log('\n💾 STARTING MARKET CREATION (FUNCTION 4)');
            
            const question = cast.text.replace('@watchthis', '').trim();
            const timeframe = extractTimeframe(cast.text);
            
            const market = await createMarket({
              question,
              creatorFid: cast.author.fid,
              creatorUsername: cast.author.username,
              channelId: cast.channel?.id,
              channelName: cast.channel?.name,
              timeframe,
              castHash: cast.hash,
              aiConfidence: Math.round((aiValidation.confidence || 0) * 100) / 100,
              aiReasoning: aiValidation.reasoning,
            });
            
            if (market) {
              console.log('✅ MARKET CREATED SUCCESSFULLY');
              console.log('📊 Market details:', {
                id: market.id,
                market_id: market.market_id,
                question: market.question,
                timeframe: market.timeframe,
                close_time: market.close_time,
                creator: market.creator_username,
                ai_confidence: market.ai_confidence,
              });
              
              // Function 5: Generate and share frame using new architecture
              console.log('\n🖼️ STARTING FRAME GENERATION (FUNCTION 5)');
              
              const appUrl = process.env.NEXT_PUBLIC_APP_URL;
              const frameUrl = `${appUrl}/api/frame/${market.market_id}`;
              
              console.log('🔗 New Frame URL generated:', frameUrl);
              
              // Send success response with native frame using new architecture
              const successMessage = `✅ Market created! "${question}"\n\n🤖 AI Confidence: ${Math.round((aiValidation.confidence || 0) * 100)}%\n⏰ Closes: ${timeframe}\n🆔 Market ID: ${market.market_id}\n\n🔄 Next: Smart contract betting (Function 6)`;
              await sendBotReplyWithFrame(cast.hash, successMessage, market.market_id);
              console.log('✅ MARKET CREATION + NATIVE FRAME RESPONSE SENT');
              
            } else {
              console.log('❌ MARKET CREATION FAILED');
              
              // Fallback: send validation success but market creation failed
              const fallbackMessage = `✅ Prediction validated! "${question}"\n\n🤖 AI Confidence: ${Math.round((aiValidation.confidence || 0) * 100)}%\n⚠️ Market creation failed - please try again\n🔄 Next: Market creation retry`;
              await sendBotReply(cast.hash, fallbackMessage);
              console.log('⚠️ MARKET CREATION FALLBACK RESPONSE SENT');
            }
            
          } else {
            console.log('❌ AI VALIDATION FAILED');
            console.log('📋 AI rejection details:', {
              valid: aiValidation.valid,
              error: aiValidation.error,
              reasoning: aiValidation.reasoning,
              confidence: aiValidation.confidence,
              predictionText: cast.text.replace('@watchthis', '').trim(),
            });
            
            // Send AI validation error response
            const aiErrorMessage = `❌ AI Validation Failed: ${aiValidation.error}\n\n🤖 Reason: ${aiValidation.reasoning}\n\n💡 Try making your prediction more specific and measurable.`;
            await sendBotReply(cast.hash, aiErrorMessage);
            console.log('❌ ERROR RESPONSE SENT - validation pipeline complete');
          }
        } else {
          console.log('\n❌ BASIC VALIDATION FAILED');
          console.log('📋 Basic validation rejection details:', {
            hash: cast.hash,
            author: cast.author.username,
            fid: cast.author.fid,
            text: cast.text,
            error: validation.error,
            errorType: validation.errorType,
            skipAI: 'AI validation skipped due to basic validation failure'
          });
          
          // Send error response based on error type
          let errorMessage = '';
          if (validation.errorType === 'FORMAT_ERROR') {
            errorMessage = `❌ Format Error: ${validation.error}\n\nTry: "@watchthis BTC hits $100k by December 31st"`;
            console.log('📝 Sending FORMAT_ERROR response');
          } else if (validation.errorType === 'VAGUE_ERROR') {
            errorMessage = `❌ Too Vague: ${validation.error}\n\nBe specific about measurements and outcomes.`;
            console.log('📝 Sending VAGUE_ERROR response');
          } else if (validation.errorType === 'TIMEFRAME_ERROR') {
            errorMessage = `❌ Invalid Timeframe: ${validation.error}\n\nExamples: 1h, 24h, today, tomorrow, December 31st`;
            console.log('📝 Sending TIMEFRAME_ERROR response');
          }
          
          await sendBotReply(cast.hash, errorMessage);
          console.log('❌ BASIC VALIDATION ERROR RESPONSE SENT - pipeline complete');
        }
      } else {
        console.log('ℹ️ Cast does not mention @watchthis, ignoring');
      }
    } else {
      console.log('ℹ️ Non-cast event received:', payload.type);
    }

    // Always respond with success to acknowledge receipt
    res.status(200).json({ 
      success: true, 
      message: 'Webhook processed successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('💥 Error processing webhook:', error);
    
    // Log error details for debugging
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      body: req.body,
    });

    res.status(500).json({ 
      error: 'Internal server error', 
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}