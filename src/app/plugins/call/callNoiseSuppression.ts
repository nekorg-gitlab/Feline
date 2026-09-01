import type { NoiseSuppressionQuality } from '../../state/settings';

export type NoiseSuppressionPatch = () => void;

export function installNoiseSuppressionPatch(
  iframe: HTMLIFrameElement,
  getQuality: () => NoiseSuppressionQuality,
): NoiseSuppressionPatch {
  const win = iframe.contentWindow as (Window & typeof globalThis) | null;
  if (!win?.navigator?.mediaDevices?.getUserMedia) return () => {};

  const mediaDevices = win.navigator.mediaDevices;
  const nativeGUM = mediaDevices.getUserMedia.bind(mediaDevices) as (
    c: MediaStreamConstraints,
  ) => Promise<MediaStream>;

  const active = new Set<{ destroy: () => void; ctx: AudioContext; raw: MediaStream }>();

  const patched = async (constraints: MediaStreamConstraints): Promise<MediaStream> => {
    let effectiveConstraints: MediaStreamConstraints = constraints;
    if (constraints.audio) {
      const audioOpt: MediaTrackConstraints =
        typeof constraints.audio === 'boolean' ? {} : { ...(constraints.audio as MediaTrackConstraints) };
      (audioOpt as unknown as Record<string, unknown>).autoGainControl = false;
      (audioOpt as unknown as Record<string, unknown>).noiseSuppression = false;
      (audioOpt as unknown as Record<string, unknown>).echoCancellation = false;
      (audioOpt as unknown as Record<string, unknown>).googAutoGainControl = false;
      (audioOpt as unknown as Record<string, unknown>).googNoiseSuppression = false;
      effectiveConstraints = { ...constraints, audio: audioOpt };
    }
    const rawStream = await nativeGUM(effectiveConstraints);
    const quality = getQuality();
    const shouldDenoise = !!constraints.audio && quality !== 'off';
    if (!shouldDenoise) return rawStream;

    try {
      const { createDenoisedStream } = await import('../../utils/noiseSuppression');

      let audioContext: AudioContext | undefined;
      try {
        const AC =
          (win as unknown as { AudioContext?: typeof AudioContext }).AudioContext ?? AudioContext;
        audioContext = new AC({ sampleRate: 48000 } as AudioContextOptions);
        if (audioContext.state === 'suspended') await audioContext.resume().catch(() => {});
      } catch {
        audioContext = undefined;
      }

      const denoised = await createDenoisedStream(rawStream, quality, { audioContext });
      if (!denoised) {
        if (audioContext && audioContext.state !== 'closed') {
          audioContext.close().catch(() => {});
        }
        return rawStream;
      }

      const ctx = audioContext;
      const entry = { destroy: denoised.destroy, ctx: ctx as AudioContext, raw: rawStream };
      if (ctx) active.add(entry as never);

      const out = denoised.outputStream as MediaStream & { __felinePatched?: boolean };
      if (out.__felinePatched) return out;

      rawStream.getVideoTracks().forEach((t) => {
        if (!out.getTrackById(t.id)) out.addTrack(t);
      });

      const originalAudioTracks = out.getAudioTracks().slice();

      const cleanup = () => {
        try {
          denoised.destroy();
        } catch {}
        if (ctx && ctx.state !== 'closed') ctx.close().catch(() => {});
        try {
          rawStream.getTracks().forEach((t) => {
            try {
              t.stop();
            } catch {}
          });
        } catch {}
        if (ctx) active.delete(entry as never);
      };

      originalAudioTracks.forEach((track) => {
        const origStop = track.stop.bind(track);
        let stopped = false;
        track.stop = () => {
          if (stopped) return;
          stopped = true;
          try {
            origStop();
          } catch {}
          cleanup();
        };
        track.addEventListener('ended', cleanup, { once: true });
      });

      rawStream.getAudioTracks().forEach((t) => {
        t.addEventListener('ended', () => {
          if (out.getAudioTracks().every((at) => at.readyState === 'ended')) cleanup();
        });
      });

      const anyStream = out as MediaStream & { __felineCleanup?: () => void };
      anyStream.__felineCleanup = cleanup;
      out.__felinePatched = true;

      return out;
    } catch (e) {
      console.warn('[feline] noise suppression failed, using raw stream', e);
      return rawStream;
    }
  };

  (mediaDevices as unknown as { getUserMedia: typeof patched }).getUserMedia = patched;

  const RTCPeerPC = (win as unknown as { RTCPeerConnection?: typeof RTCPeerConnection })
    .RTCPeerConnection;
  let origAddTrack: typeof RTCPeerConnection.prototype.addTrack | undefined;
  if (RTCPeerPC?.prototype?.addTrack) {
    origAddTrack = RTCPeerPC.prototype.addTrack;
  }

  return () => {
    try {
      (mediaDevices as unknown as { getUserMedia: typeof nativeGUM }).getUserMedia = nativeGUM;
    } catch {}
    if (RTCPeerPC && origAddTrack) {
      RTCPeerPC.prototype.addTrack = origAddTrack;
    }
    active.forEach((e) => {
      try {
        e.destroy();
      } catch {}
      try {
        if (e.ctx.state !== 'closed') e.ctx.close().catch(() => {});
      } catch {}
      try {
        e.raw.getTracks().forEach((t) => {
          try {
            t.stop();
          } catch {}
        });
      } catch {}
    });
    active.clear();
  };
}
