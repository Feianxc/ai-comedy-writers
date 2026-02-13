import { NextRequest } from 'next/server';
import { z } from 'zod';
import { StreamService } from '@/lib/services/stream-service';
import { GenerateRoastRequest } from '@/types';
import { getPersonaById } from '@/lib/prompts/persona-prompts';
import { requireApiAuth } from '@/lib/api-auth';

const DANGEROUS_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

const streamUserAgentSchema = z
  .object({
    id: z.string().trim().min(1).max(100).optional(),
    displayName: z.string().trim().min(1).max(50),
    bio: z.string().max(200).optional(),
    interests: z.array(z.string().trim().min(1).max(50)).max(10).optional(),
    avatar: z.string().url().optional(),
  })
  .strict();

const streamUserPersonaSchema = z
  .object({
    id: z.string().trim().min(1).max(50),
  })
  .passthrough();

const streamBodySchema = z.object({
  topic: z.string().trim().min(1).max(200),
  userAgent: streamUserAgentSchema.partial().optional(),
  userPersona: streamUserPersonaSchema.optional(),
});

const jsonHeaders = { 'Content-Type': 'application/json' };

function createBadRequest(message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status: 400,
    headers: jsonHeaders,
  });
}

function hasDangerousKeys(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.some(hasDangerousKeys);
  }

  if (value && typeof value === 'object') {
    return Object.keys(value).some((key) => {
      if (DANGEROUS_KEYS.has(key)) {
        return true;
      }

      return hasDangerousKeys((value as Record<string, unknown>)[key]);
    });
  }

  return false;
}

/**
 * POST /api/generate/stream
 * SSE娴佸紡鐢熸垚鍚愭Ы浼氳瘽
 */
export async function POST(request: NextRequest) {
  const authResult = await requireApiAuth(request);
  if (!authResult.ok) {
    return authResult.response;
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return createBadRequest('Invalid JSON body');
  }

  if (hasDangerousKeys(body)) {
    return createBadRequest('Dangerous key detected in payload');
  }

  const bodyResult = streamBodySchema.safeParse(body);

  if (!bodyResult.success) {
    return createBadRequest('Invalid request body');
  }

  const defaultPersona = getPersonaById('toxic');
  if (!defaultPersona) {
    return new Response(JSON.stringify({ error: 'Default persona not found' }), {
      status: 500,
      headers: jsonHeaders,
    });
  }

  const { topic, userAgent: userAgentParam, userPersona: userPersonaParam } = bodyResult.data;

  const fallbackUserAgent: GenerateRoastRequest['userAgent'] = {
    displayName: 'User',
    id: 'user',
  };

  const userAgent: GenerateRoastRequest['userAgent'] =
    userAgentParam && typeof userAgentParam.displayName === 'string'
      ? { ...fallbackUserAgent, ...userAgentParam }
      : fallbackUserAgent;

  let userPersona: GenerateRoastRequest['userPersona'] = defaultPersona;
  if (userPersonaParam) {
    const foundPersona = getPersonaById(userPersonaParam.id);
    if (foundPersona) {
      userPersona = foundPersona;
    }
  }

  const streamService = new StreamService();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (eventName: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      };

      try {
        const generateRequest: GenerateRoastRequest = {
          topic,
          userAgent,
          userPersona,
        };

        const roastStream = streamService.createRoastStream(generateRequest);

        for await (const event of roastStream) {
          sendEvent(event.type, event.data);

          if (event.type === 'done' || event.type === 'error') {
            controller.close();
            break;
          }
        }
      } catch (error) {
        console.error('Stream error:', error);
        sendEvent('error', {
          code: 5000,
          error: 'STREAM_ERROR',
          message: error instanceof Error ? error.message : 'Unknown stream error',
        });
        controller.close();
      }
    },
    cancel() {
      // Stream cancelled by client
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
