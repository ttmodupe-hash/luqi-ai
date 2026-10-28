/** No keys, remote image URLs or provider SDKs in the browser. */
import { PilotChatError } from './ai-pilot';
import { requestPilotJson, pilotFailureCode } from './pilot-request';
import { spatialReply, type SpatialMode, type SpatialReply } from './spatial-vision-contract';

export type SpatialProvider = 'gemini' | 'openai';
export async function askSpatialVision(
  token: string, question: string, dataUrl: string, mode: SpatialMode,
  language: string, provider: SpatialProvider, serialCropConfirmed: boolean,
  signal: AbortSignal, request: typeof fetch = fetch,
): Promise<SpatialReply> {
  if (!token || token.length > 4096 || !question.trim() || question.length > 500 ||
      !language.trim() || language.length > 50 ||
      !['EXAM_3D', 'CONTRACT_SHIELD', 'SERIAL_AUDIT'].includes(mode) ||
      !['gemini', 'openai'].includes(provider) ||
      (mode === 'SERIAL_AUDIT' && serialCropConfirmed !== true) ||
      !dataUrl.startsWith('data:image/jpeg;base64,') || dataUrl.length > 466_700) {
    throw new PilotChatError('INVALID_INPUT');
  }
  try {
    const response = await requestPilotJson(request, '/api/v1/spatial-vision', {
      method: 'POST', signal, headers: {
        'Content-Type': 'application/json', Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        question: question.trim(), mode, language, provider, consent: true,
        serialCropConfirmed: mode === 'SERIAL_AUDIT' ? true : undefined,
        image: { mimeType: 'image/jpeg', data: dataUrl.slice('data:image/jpeg;base64,'.length) },
      }),
    });
    if (response.status === 401) throw new PilotChatError('AUTH_REQUIRED');
    if (!response.ok) throw new PilotChatError(pilotFailureCode(response.status, response.body));
    const parsed = spatialReply.safeParse(response.body);
    if (!parsed.success) throw new PilotChatError('RESPONSE_UNCONFIRMED');
    return parsed.data;
  } catch (error) {
    if (error instanceof PilotChatError) throw error;
    throw new PilotChatError('RESPONSE_UNCONFIRMED');
  }
}
