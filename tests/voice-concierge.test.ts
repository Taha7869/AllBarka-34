import { searchCatalog } from '../src/lib/catalogDiscovery';
import { PRODUCTS } from '../src/data/products';
import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { once } from 'node:events';
import { createAiChatRouter } from '../src/lib/aiChatRouter';
import { createVoiceRouter } from '../src/lib/voiceRouter';
import { getVoiceConfig, validateVoiceWav, transcribeVoice, VoiceError } from '../src/lib/voiceTranscription';
import { encodeVoiceWav, prepareVoiceAudio } from '../src/services/voiceInput';
import { voiceTranslations } from '../src/contexts/voiceTranslations';

const config = { key: 'isolated-voice-fixture', model: 'whisper-large-v3' };
async function wav(seconds = 1) {
  const samples = Float32Array.from({ length: Math.round(seconds * 16000) }, (_, i) => Math.sin(i * 0.1) * 0.1);
  return Buffer.from(await encodeVoiceWav(samples).arrayBuffer());
}
const answer = (text = 'pista 250g aur badam 1kg') => new Response(JSON.stringify({ text, duration: 1, segments: [{ no_speech_prob: 0.01, avg_logprob: -0.1 }] }));
test('free-tier gate and model allowlist fail closed without changing account configuration', () => {
  assert.equal(getVoiceConfig({ GROQ_API_KEY: 'fixture' }), null);
  assert.equal(getVoiceConfig({ GROQ_API_KEY:'fixture', VOICE_GROQ_FREE_TIER_CONFIRMED:'true', GROQ_VOICE_MODEL:'unapproved-model' }), null);
  assert.equal(getVoiceConfig({ GROQ_API_KEY:'fixture', VOICE_GROQ_FREE_TIER_CONFIRMED:'true' })?.model, 'whisper-large-v3');
});
test('canonical WAV validates bytes and actual duration, not supplied MIME or duration metadata', async () => {
  const audio = await wav(); assert.equal(validateVoiceWav(audio), 1);
  assert.throws(() => validateVoiceWav(Buffer.alloc(2 * 1024 * 1024 + 1)), (e: VoiceError) => e.status === 413);
  const wrong = Buffer.from(audio); wrong.writeUInt32LE(8000, 24);
  assert.throws(() => validateVoiceWav(wrong), /VOICE_INVALID_AUDIO/);
  assert.throws(() => validateVoiceWav(Buffer.concat([audio,Buffer.alloc(2)])), /VOICE_INVALID_AUDIO/);
  const long = Buffer.alloc(44 + 60 * 32000 + 2); audio.copy(long,0,0,44); long.writeUInt32LE(long.length - 8,4);long.writeUInt32LE(long.length - 44,40);
  assert.throws(() => validateVoiceWav(long), /VOICE_AUDIO_TOO_LONG/);
  const silence = Buffer.from(audio);silence.fill(0,44);
  assert.throws(() => validateVoiceWav(silence), /VOICE_NO_SPEECH/);
});
test('24, 30, 45 and 60-second PCM fits one request; metadata is scanned with strict chunk bounds', async () => {
  for (const seconds of [24, 30, 45, 60]) {
    const audio = await wav(seconds);
    assert.equal(validateVoiceWav(audio), seconds);
    assert.equal(audio.length, 44 + seconds * 32000);
  }
  const audio = await wav();
  const chunk = (id: string, data: Buffer) => {
    const header = Buffer.alloc(8); header.write(id); header.writeUInt32LE(data.length, 4);
    return Buffer.concat([header, data, Buffer.alloc(data.length % 2)]);
  };
  const riff = (...chunks: Buffer[]) => {
    const result = Buffer.concat([audio.subarray(0, 12), ...chunks]); result.writeUInt32LE(result.length - 8, 4); return result;
  };
  const fmt = audio.subarray(12, 36), data = audio.subarray(36);
  const metadata = riff(chunk('JUNK', Buffer.from('odd')), fmt, chunk('LIST', Buffer.from('fixture')), data, chunk('JUNK', Buffer.alloc(30, 255)));
  assert.equal(validateVoiceWav(metadata), 1);
  for (const invalid of [riff(fmt, fmt, data), riff(fmt, data, data), riff(data, fmt), riff(fmt), riff(chunk('fmt ', Buffer.alloc(2)), data)]) {
    assert.throws(() => validateVoiceWav(invalid), /VOICE_INVALID_AUDIO/);
  }
  const overrun = Buffer.from(metadata); overrun.writeUInt32LE(0xffffffff, 16);
  assert.throws(() => validateVoiceWav(overrun), /VOICE_INVALID_AUDIO/);
  const trailing = riff(fmt, data, Buffer.from([1]));
  assert.throws(() => validateVoiceWav(trailing), /VOICE_INVALID_AUDIO/);
  const silentMetadata = Buffer.from(metadata);
  const offset = silentMetadata.indexOf(Buffer.from('data')) + 8; silentMetadata.fill(0, offset, offset + 32000);
  assert.throws(() => validateVoiceWav(silentMetadata), /VOICE_NO_SPEECH/, 'metadata bytes must not masquerade as speech');
  for (const invalid of [undefined, null, {}, 'audio', Buffer.alloc(0)]) assert.throws(() => validateVoiceWav(invalid as any), /VOICE_INVALID_AUDIO/);
});
test('browser preparation bounds render allocation before overrun, reports truncation and closes decoder on errors/cancel', async () => {
  const originalAudio = globalThis.AudioContext, originalOffline = globalThis.OfflineAudioContext;
  let duration = 45, closed = 0, allocated = 0, decodeCalls = 0;
  (globalThis as any).AudioContext = class {
    async decodeAudioData() { decodeCalls++; return { duration }; }
    async close() { closed++; }
  };
  (globalThis as any).OfflineAudioContext = class {
    destination = {};
    constructor(_channels: number, length: number, rate: number) { allocated = length; assert.equal(rate, 16000); }
    createBufferSource() { return { connect() {}, start() {} }; }
    async startRendering() { return { getChannelData: () => new Float32Array(allocated).fill(.1) }; }
  };
  try {
    for (const seconds of [24, 30, 45, 60, 60.01, 600]) {
      duration = seconds;
      const result = await prepareVoiceAudio(new Blob(['fixture']), new AbortController().signal);
      assert.equal(result.truncated, seconds > 60);
      assert.equal(allocated, Math.min(960000, Math.ceil(seconds * 16000)));
      assert.equal(validateVoiceWav(Buffer.from(await result.audio.arrayBuffer())), Math.min(seconds, 60));
    }
    const before = decodeCalls;
    await assert.rejects(prepareVoiceAudio(new Blob([new Uint8Array(4 * 1024 * 1024 + 1)]), new AbortController().signal), /VOICE_AUDIO_TOO_LARGE/);
    const cancelled = new AbortController(); cancelled.abort();
    await assert.rejects(prepareVoiceAudio(new Blob(['fixture']), cancelled.signal), /VOICE_CANCELLED/);
    assert.equal(decodeCalls, before);
    duration = Infinity;
    await assert.rejects(prepareVoiceAudio(new Blob(['fixture']), new AbortController().signal), /VOICE_INVALID_AUDIO/);
    assert.equal(closed, decodeCalls);
  } finally {
    if (originalAudio) globalThis.AudioContext = originalAudio; else delete (globalThis as any).AudioContext;
    if (originalOffline) globalThis.OfflineAudioContext = originalOffline; else delete (globalThis as any).OfflineAudioContext;
  }
});
test('longer transcript is preserved for editing while response size remains bounded; translations cover recovery', async () => {
  const audio = await wav(45), signal = new AbortController().signal;
  const text = 'pista 250g '.repeat(120).trim();
  assert.ok(text.length > 1000);
  assert.equal(await transcribeVoice(audio, config, signal, async () => new Response(JSON.stringify({ text, duration: 45, segments: [] }))), text);
  await assert.rejects(transcribeVoice(audio, config, signal, async () => answer('x'.repeat(4001))), /VOICE_NO_SPEECH/);
  for (const language of ['en', 'ur', 'ar']) for (const key of ['voice.remaining', 'voice.truncated', 'voice.shorten', 'voice.VOICE_INVALID_AUDIO']) assert.ok(voiceTranslations[language][key]);
});
test('provider wire format is bounded multilingual transcription, never translation/chat or a fallback model', async () => {
  const audio = await wav(); let calls = 0;
  const fetcher: typeof fetch = async (url, init) => {
    calls++;assert.equal(url,'https://api.groq.com/openai/v1/audio/transcriptions');
    assert.equal((init!.headers as any).Authorization, 'Bearer isolated-voice-fixture');
    const form = init!.body as FormData;
    assert.equal(form.get('model'),'whisper-large-v3');assert.equal(form.get('response_format'),'verbose_json');
    assert.match(String(form.get('prompt')),/Pista.*Kaju.*Badam/); assert.equal(form.get('language'),null);
    assert.deepEqual(Buffer.from(await (form.get('file') as Blob).arrayBuffer()),audio);
    return answer('پستہ 250 گرام، badam 1kg، tasting flight');
  };
  assert.equal(await transcribeVoice(audio,config,new AbortController().signal,fetcher),'پستہ 250 گرام، badam 1kg، tasting flight');assert.equal(calls,1);
});
test('quota, provider bodies, malformed/oversized responses and noise are contained', async () => {
  const audio = await wav(), signal = new AbortController().signal;
  await assert.rejects(transcribeVoice(audio,config,signal,async()=>new Response('private-provider-details',{status:429})), /VOICE_QUOTA_EXCEEDED/);
  await assert.rejects(transcribeVoice(audio,config,signal,async()=>new Response('private-provider-details',{status:500})), /VOICE_PROVIDER_UNAVAILABLE/);
  await assert.rejects(transcribeVoice(audio,config,signal,async()=>new Response('x'.repeat(65537))), /VOICE_PROVIDER_UNAVAILABLE/);
  await assert.rejects(transcribeVoice(audio,config,signal,async()=>new Response(JSON.stringify({text:'hallucinated noise',duration:1,segments:[{no_speech_prob:0.99,avg_logprob:-2}]}))), /VOICE_NO_SPEECH/);
  const controller = new AbortController();controller.abort();let called=false;
  await assert.rejects(transcribeVoice(audio,config,controller.signal,async()=>{called=true;return answer();}), /VOICE_CANCELLED/);assert.equal(called,false);
});
test('real HTTP router enforces auth/limiter, byte limit, configuration and private-safe errors before upstream work', async () => {
  let enabled = false, calls = 0;
  const app = express();
  app.use(createVoiceRouter({
    authenticateOptionalUser: (req,res,next) => req.get('Authorization') === 'Bearer denied' ? res.status(401).end() : next(),
    limiter: (req,res,next) => req.get('X-Fixture-Rate') ? res.status(429).end() : next(),
    getConfig: () => enabled ? config : null,
    fetcher: async () => {calls++;return answer('khajoor aur tasting flight');},
  }));
  const server = app.listen(0,'127.0.0.1');await once(server,'listening');
  const url = `http://127.0.0.1:${(server.address() as any).port}/api/concierge/transcribe`;
  const send = (body: Uint8Array, headers: Record<string,string> = {}) => fetch(url,{method:'POST',headers:{'Content-Type':'audio/wav',...headers},body:body as any});
  try {
    assert.equal((await send(await wav())).status,503);assert.equal(calls,0);enabled=true;
    assert.equal((await send(await wav(),{Authorization:'Bearer denied'})).status,401);
    assert.equal((await send(await wav(),{'X-Fixture-Rate':'limited'})).status,429);
    assert.equal((await send(Buffer.alloc(2*1024*1024+1))).status,413);
    assert.equal((await send(Buffer.from('not audio'))).status,400);assert.equal(calls,0);
    const empty = await send(Buffer.alloc(0)); assert.equal(empty.status, 400); assert.deepEqual(await empty.json(), { code: 'VOICE_INVALID_AUDIO' }); assert.equal(calls, 0);
    const response = await send(await wav());assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');
    assert.deepEqual(await response.json(),{text:'khajoor aur tasting flight'});assert.equal(calls,1);
  } finally {server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}
});
test('deadline aborts provider work, rejects overlap and releases a completed request slot', async () => {
  let calls = 0; let started!: () => void;
  const reached = new Promise<void>(resolve=>{started=resolve;});
  const app=express();app.use(createVoiceRouter({authenticateOptionalUser:(_q,_s,n)=>n(),limiter:(_q,_s,n)=>n(),getConfig:()=>config,timeoutMs:200,
    fetcher:async(_url,init)=>{calls++;started();await new Promise((_resolve,reject)=>init!.signal!.addEventListener('abort',()=>reject(new Error('aborted')),{once:true}));return answer();}}));
  const server=app.listen(0,'127.0.0.1');await once(server,'listening');const url=`http://127.0.0.1:${(server.address() as any).port}/api/concierge/transcribe`;
  const send=async()=>fetch(url,{method:'POST',headers:{'Content-Type':'audio/wav'},body:await wav() as any});
  try {
    const first=send();await reached;assert.equal((await send()).status,429);const timed=await first;assert.equal(timed.status,503);assert.deepEqual(await timed.json(),{code:'VOICE_TIMEOUT'});assert.equal(calls,1);
    const next=await send();assert.equal(next.status,503);assert.equal(calls,2);
  } finally {server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}
});

test('existing AI router mounts transcription with both authentication and limiter guards', async () => {
  let guards=0;const app=express();app.use(createAiChatRouter({getDb:()=>null,
    authenticateOptionalUser:(_q,_s,n)=>{guards++;n();},patronChatLimiter:(_q,_s,n)=>{guards++;n();}}));
  const server=app.listen(0,'127.0.0.1');await once(server,'listening');
  try {
    const response=await fetch(`http://127.0.0.1:${(server.address() as any).port}/api/concierge/transcribe`,{method:'POST',headers:{'Content-Type':'audio/wav'},body:'invalid'});
    assert.ok([400,503].includes(response.status));assert.match((await response.json()).code,/^VOICE_/);assert.equal(guards,2);
  } finally {server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));}
});

test('reviewed product/weight keywords find canonical products without selecting or changing a variant', () => {
  const before=JSON.stringify(PRODUCTS);
  for(const query of ['pista 250g','pista 250 gram','پستہ ۲۵۰ گرام','فستق ٢٥٠ غرام'])assert.equal(searchCatalog(PRODUCTS,query)[0]?.id,'pista',query);
  for(const query of ['badam 1kg','بادام ۱ کلو گرام','badam 1000g'])assert.equal(searchCatalog(PRODUCTS,query)[0]?.id,'badam',query);
  assert.equal(searchCatalog(PRODUCTS,'tasting flight')[0]?.id,'bundle-tasting-flight');
  assert.equal(JSON.stringify(PRODUCTS),before);
});
