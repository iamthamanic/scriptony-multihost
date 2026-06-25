/**
 * Built-in Kokoro voice ids (mirror tools/kokoro-server/main.py KOKORO_VOICES).
 * Fallback when sidecar HTTP is slow — selection works; synthesis needs running sidecar.
 * Location: src/lib/api/kokoro-voice-catalog.ts
 */

import type { VoiceEntry } from "./local-tts-api";

export const KOKORO_VOICE_CATALOG: VoiceEntry[] = [
  { id: "af_bella", name: "Bella (US Female)", lang: "en", gender: "female" },
  { id: "af_nicole", name: "Nicole (US Female)", lang: "en", gender: "female" },
  { id: "af_sky", name: "Sky (US Female)", lang: "en", gender: "female" },
  { id: "am_adam", name: "Adam (US Male)", lang: "en", gender: "male" },
  { id: "am_echo", name: "Echo (US Male)", lang: "en", gender: "male" },
  { id: "am_eric", name: "Eric (US Male)", lang: "en", gender: "male" },
  { id: "am_fenrir", name: "Fenrir (US Male)", lang: "en", gender: "male" },
  { id: "am_liam", name: "Liam (US Male)", lang: "en", gender: "male" },
  { id: "am_michael", name: "Michael (US Male)", lang: "en", gender: "male" },
  { id: "am_onyx", name: "Onyx (US Male)", lang: "en", gender: "male" },
  {
    id: "bf_isabella",
    name: "Isabella (UK Female)",
    lang: "en-gb",
    gender: "female",
  },
  { id: "bm_george", name: "George (UK Male)", lang: "en-gb", gender: "male" },
  { id: "bf_emma", name: "Emma (UK Female)", lang: "en-gb", gender: "female" },
  { id: "bm_lewis", name: "Lewis (UK Male)", lang: "en-gb", gender: "male" },
  { id: "jf_alpha", name: "Alpha (JP Female)", lang: "ja", gender: "female" },
  { id: "jm_kumo", name: "Kumo (JP Male)", lang: "ja", gender: "male" },
  {
    id: "zf_xiaobei",
    name: "Xiaobei (ZH Female)",
    lang: "zh",
    gender: "female",
  },
  { id: "zm_yunjian", name: "Yunjian (ZH Male)", lang: "zh", gender: "male" },
];
