import { corsHeaders } from './cors.ts';

export type JsonResponse = Record<string, unknown>;

export function json(status: number, body: JsonResponse): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
