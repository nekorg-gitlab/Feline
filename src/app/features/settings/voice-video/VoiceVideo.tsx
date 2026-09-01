import React, { MouseEventHandler, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Button,
  color,
  config,
  Icon,
  IconButton,
  Icons,
  Menu,
  MenuItem,
  PopOut,
  RectCords,
  Scroll,
  Text,
  toRem,
} from 'folds';
import FocusTrap from 'focus-trap-react';
import { Page, PageContent, PageHeader } from '../../../components/page';
import { SequenceCard } from '../../../components/sequence-card';
import { SettingTile } from '../../../components/setting-tile';
import { useSetting } from '../../../state/hooks/settings';
import { NoiseSuppressionQuality, settingsAtom } from '../../../state/settings';
import { SequenceCardStyle } from '../styles.css';
import { NOISE_SUPPRESSION_OPTIONS } from '../../../utils/noiseSuppression';
import { stopPropagation } from '../../../utils/keyboard';
import NotificationSound from '../../../../../public/sound/notification.ogg';

function useMediaDevices() {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [permission, setPermission] = useState<'unknown' | 'granted' | 'denied'>('unknown');

  const refresh = useCallback(async () => {
    try {
      const list = await navigator.mediaDevices.enumerateDevices();
      setDevices(list);
      const hasLabel = list.some((d) => !!d.label);
      setPermission(hasLabel ? 'granted' : 'unknown');
    } catch {
      setPermission('denied');
    }
  }, []);

  useEffect(() => {
    refresh();
    const handler = () => refresh();
    navigator.mediaDevices.addEventListener?.('devicechange', handler);
    return () => navigator.mediaDevices.removeEventListener?.('devicechange', handler);
  }, [refresh]);

  const requestPermission = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      stream.getTracks().forEach((t) => t.stop());
      setPermission('granted');
      await refresh();
    } catch {
      setPermission('denied');
    }
  }, [refresh]);

  return { devices, permission, refresh, requestPermission };
}

type DeviceSelectorProps = {
  label: string;
  devices: MediaDeviceInfo[];
  kind: MediaDeviceKind;
  value?: string;
  onChange: (deviceId: string) => void;
};

function DeviceSelector({ label, devices, kind, value, onChange }: DeviceSelectorProps) {
  const [cords, setCords] = useState<RectCords>();
  const filtered = devices.filter((d) => d.kind === kind);
  const selected = filtered.find((d) => d.deviceId === value);
  const display = selected?.label || (value ? `Device ${value.slice(0, 6)}` : 'Default');

  const handleOpen: MouseEventHandler<HTMLButtonElement> = (evt) => {
    setCords(evt.currentTarget.getBoundingClientRect());
  };

  return (
    <>
      <Button
        size="300"
        variant="Secondary"
        outlined
        fill="Soft"
        radii="300"
        after={<Icon size="300" src={Icons.ChevronBottom} />}
        onClick={handleOpen}
      >
        <Text size="T300" truncate>
          {filtered.length === 0 ? 'No devices' : display}
        </Text>
      </Button>
      <PopOut
        anchor={cords}
        offset={5}
        position="Bottom"
        align="End"
        content={
          <FocusTrap
            focusTrapOptions={{
              initialFocus: false,
              onDeactivate: () => setCords(undefined),
              clickOutsideDeactivates: true,
              isKeyForward: (evt: KeyboardEvent) =>
                evt.key === 'ArrowDown' || evt.key === 'ArrowRight',
              isKeyBackward: (evt: KeyboardEvent) =>
                evt.key === 'ArrowUp' || evt.key === 'ArrowLeft',
              escapeDeactivates: stopPropagation,
            }}
          >
            <Menu style={{ maxWidth: toRem(300), maxHeight: '40vh', overflowY: 'auto' }}>
              <Box direction="Column" gap="100" style={{ padding: config.space.S100 }}>
                <MenuItem
                  size="300"
                  variant={!value ? 'Primary' : 'Surface'}
                  radii="300"
                  onClick={() => {
                    onChange('');
                    setCords(undefined);
                  }}
                >
                  <Text size="T300">Default - {label}</Text>
                </MenuItem>
                {filtered.map((d) => (
                  <MenuItem
                    key={d.deviceId}
                    size="300"
                    variant={value === d.deviceId ? 'Primary' : 'Surface'}
                    radii="300"
                    onClick={() => {
                      onChange(d.deviceId);
                      setCords(undefined);
                    }}
                  >
                    <Text size="T300" truncate>
                      {d.label || `Device ${d.deviceId.slice(0, 8)}`}
                    </Text>
                  </MenuItem>
                ))}
                {filtered.length === 0 && (
                  <Text size="T200" priority="300" style={{ padding: config.space.S200 }}>
                    No {label.toLowerCase()} found.
                  </Text>
                )}
              </Box>
            </Menu>
          </FocusTrap>
        }
      />
    </>
  );
}

function VolumeSlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const percent = Math.max(0, Math.min(100, value));
  return (
    <Box style={{ flexGrow: 1, minWidth: toRem(120) }} alignItems="Center" gap="200">
      <Box
        style={{
          flexGrow: 1,
          height: toRem(8),
          borderRadius: '9999px',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <input
          type="range"
          min={0}
          max={100}
          value={percent}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label="Volume"
          style={{
            WebkitAppearance: 'none',
            appearance: 'none',
            width: '100%',
            height: toRem(8),
            borderRadius: '9999px',
            background: `linear-gradient(to right, ${color.Primary.Main} 0%, ${color.Primary.Main} ${percent}%, ${color.Background.Container} ${percent}%, ${color.Background.Container} 100%)`,
            border: `1px solid ${color.SurfaceVariant.ContainerLine}`,
            outline: 'none',
            cursor: 'pointer',
            margin: 0,
          }}
        />
      </Box>
      <Text size="T300" style={{ minWidth: toRem(36), textAlign: 'right' }}>
        {percent}%
      </Text>
    </Box>
  );
}

function LevelBar({ level, color: barColor }: { level: number; color: string }) {
  return (
    <Box
      style={{
        flexGrow: 1,
        height: toRem(8),
        borderRadius: '9999px',
        background: color.Surface.Container,
        border: `1px solid ${color.Surface.ContainerLine}`,
        overflow: 'hidden',
      }}
    >
      <Box
        style={{
          height: '100%',
          width: `${Math.max(0, Math.min(100, level))}%`,
          background: barColor,
          transition: 'width 80ms linear',
        }}
      />
    </Box>
  );
}

function MicMonitor({
  deviceId,
  quality,
  speakerDeviceId,
  speakerVolume,
}: {
  deviceId?: string;
  quality: NoiseSuppressionQuality;
  speakerDeviceId?: string;
  speakerVolume: number;
}) {
  const [rawLevel, setRawLevel] = useState(0);
  const [procLevel, setProcLevel] = useState(0);
  const [active, setActive] = useState(false);
  const [playingMode, setPlayingMode] = useState<null | 'before' | 'after'>(null);

  const audioElRef = useRef<HTMLAudioElement>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const rawAnalyserRef = useRef<AnalyserNode | null>(null);
  const procAnalyserRef = useRef<AnalyserNode | null>(null);
  const inputStreamRef = useRef<MediaStream | null>(null);
  const outputStreamRef = useRef<MediaStream | null>(null);
  const denoiserRef = useRef<{ destroy: () => void } | null>(null);
  const rafRef = useRef<number | null>(null);

  const cleanup = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (ctxRef.current) {
      try {
        ctxRef.current.close();
      } catch {}
      ctxRef.current = null;
    }
    rawAnalyserRef.current = null;
    procAnalyserRef.current = null;
    inputStreamRef.current?.getTracks().forEach((t) => t.stop());
    inputStreamRef.current = null;
    if (denoiserRef.current) {
      try {
        denoiserRef.current.destroy();
      } catch {}
      denoiserRef.current = null;
    }
    outputStreamRef.current = null;
    if (audioElRef.current) {
      audioElRef.current.pause();
      audioElRef.current.srcObject = null;
    }
    setRawLevel(0);
    setProcLevel(0);
    setActive(false);
    setPlayingMode(null);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const computeRmsLevel = (analyser: AnalyserNode, data: Uint8Array<ArrayBufferLike>) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      analyser.getByteTimeDomainData(data as Uint8Array<ArrayBuffer>);
      let sum = 0;
      for (let i = 0; i < data.length; i += 1) {
        const v = (data[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / data.length);
      return Math.min(100, Math.round(rms * 400));
    };

    const setup = async () => {
      cleanup();
      try {
        const inputStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            deviceId: deviceId ? { exact: deviceId } : undefined,
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: true,
          } as MediaTrackConstraints,
        });
        if (cancelled) {
          inputStream.getTracks().forEach((t) => t.stop());
          return;
        }
        inputStreamRef.current = inputStream;

        const ctx = new AudioContext({ sampleRate: 48000 });
        ctxRef.current = ctx;
        if (ctx.state === 'suspended') {
          await ctx.resume().catch(() => {});
        }

        const rawSrc = ctx.createMediaStreamSource(inputStream);
        const rawAnalyser = ctx.createAnalyser();
        rawAnalyser.fftSize = 512;
        rawAnalyser.smoothingTimeConstant = 0.2;
        rawSrc.connect(rawAnalyser);
        rawAnalyserRef.current = rawAnalyser;

        let procAnalyser: AnalyserNode = rawAnalyser;
        let outputStream: MediaStream = inputStream;

        const rawData = new Uint8Array(rawAnalyser.fftSize);
        let procData = new Uint8Array(rawAnalyser.fftSize);
        let hasProc = false;

        const tick = () => {
          if (cancelled || !rawAnalyserRef.current) return;
          const r = computeRmsLevel(rawAnalyserRef.current, rawData);
          setRawLevel(r);
          const pAnalyser = procAnalyserRef.current;
          if (pAnalyser && hasProc) {
            if (procData.length !== pAnalyser.fftSize) procData = new Uint8Array(pAnalyser.fftSize);
            const p = computeRmsLevel(pAnalyser, procData);
            setProcLevel(p);
          } else {
            // when off or not ready, keep proc in sync with raw so they match (expected)
            setProcLevel(quality === 'off' ? r : r);
          }
          rafRef.current = requestAnimationFrame(tick);
        };

        procAnalyserRef.current = rawAnalyser;
        tick();
        setActive(true);

        if (quality !== 'off') {
          try {
            const { createDenoisedStream } = await import('../../../utils/noiseSuppression');
            const denoised = await createDenoisedStream(inputStream, quality, {
              audioContext: ctx,
            });
            if (cancelled) {
              denoised?.destroy();
              return;
            }
            if (denoised) {
              denoiserRef.current = denoised;
              outputStream = denoised.outputStream;
              outputStreamRef.current = outputStream;
              if (ctx.state === 'suspended') await ctx.resume().catch(() => {});
              const procSrc = ctx.createMediaStreamSource(outputStream);
              procAnalyser = ctx.createAnalyser();
              procAnalyser.fftSize = 512;
              procAnalyser.smoothingTimeConstant = 0.2;
              procSrc.connect(procAnalyser);
              procAnalyserRef.current = procAnalyser;
              hasProc = true;
              // if currently playing after, switch to denoised stream live
              if (playingMode === 'after' && audioElRef.current) {
                const el = audioElRef.current;
                const maybeSink = el as HTMLAudioElement & {
                  setSinkId?: (id: string) => Promise<void>;
                };
                if (speakerDeviceId && typeof maybeSink.setSinkId === 'function') {
                  await maybeSink.setSinkId(speakerDeviceId).catch(() => {});
                }
                el.srcObject = outputStream;
                el.volume = Math.max(0, Math.min(1, speakerVolume / 100));
                await el.play().catch(() => {});
              }
            }
          } catch {
            // keep raw as proc on failure
          }
        }

        if (!outputStreamRef.current) outputStreamRef.current = outputStream;
      } catch {
        setActive(false);
      }
    };

    setup();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [deviceId, quality, cleanup]); // eslint-disable-line react-hooks/exhaustive-deps

  const playMode = useCallback(
    async (mode: 'before' | 'after') => {
      const el = audioElRef.current;
      if (!el) return;
      if (ctxRef.current?.state === 'suspended') {
        await ctxRef.current.resume().catch(() => {});
      }
      // toggle off if same mode already playing
      if (playingMode === mode) {
        el.pause();
        el.srcObject = null;
        setPlayingMode(null);
        return;
      }
      // stop previous if different mode
      if (playingMode) {
        el.pause();
        el.srcObject = null;
      }
      const targetStream =
        mode === 'before'
          ? inputStreamRef.current
          : outputStreamRef.current || inputStreamRef.current;
      if (!targetStream) return;
      try {
        const maybeSink = el as HTMLAudioElement & { setSinkId?: (id: string) => Promise<void> };
        if (speakerDeviceId && typeof maybeSink.setSinkId === 'function') {
          await maybeSink.setSinkId(speakerDeviceId).catch(() => {});
        }
        el.srcObject = targetStream;
        el.volume = Math.max(0, Math.min(1, speakerVolume / 100));
        el.muted = false;
        await el.play();
        setPlayingMode(mode);
      } catch {
        setPlayingMode(null);
      }
    },
    [playingMode, speakerDeviceId, speakerVolume],
  );

  useEffect(() => {
    const el = audioElRef.current;
    if (el) el.volume = Math.max(0, Math.min(1, speakerVolume / 100));
  }, [speakerVolume]);

  useEffect(() => {
    if (!playingMode && audioElRef.current) {
      audioElRef.current.pause();
      audioElRef.current.srcObject = null;
    }
  }, [playingMode]);

  return (
    <Box direction="Column" gap="200">
      <Box direction="Column" gap="100">
        {quality === 'off' ? (
          <Box gap="200" alignItems="Center">
            <Text size="T200" priority="300" style={{ minWidth: toRem(48) }}>
              Preview
            </Text>
            <LevelBar level={rawLevel} color={color.Success.Main} />
            <Text size="T200" priority="300" style={{ minWidth: toRem(32), textAlign: 'right' }}>
              {active ? `${rawLevel}%` : '-'}
            </Text>
            <Button
              size="300"
              variant={playingMode === 'before' ? 'Critical' : 'Secondary'}
              fill={playingMode === 'before' ? 'Solid' : 'Soft'}
              radii="300"
              onClick={() => playMode('before')}
              disabled={!active}
            >
              <Text size="B300">{playingMode === 'before' ? 'Stop' : 'Test Mic'}</Text>
            </Button>
          </Box>
        ) : (
          <>
            <Box gap="200" alignItems="Center">
              <Text size="T200" priority="300" style={{ minWidth: toRem(48) }}>
                After
              </Text>
              <LevelBar level={procLevel} color={color.Success.Main} />
              <Text size="T200" priority="300" style={{ minWidth: toRem(32), textAlign: 'right' }}>
                {active ? `${procLevel}%` : '-'}
              </Text>
              <Button
                size="300"
                variant={playingMode === 'after' ? 'Critical' : 'Secondary'}
                fill={playingMode === 'after' ? 'Solid' : 'Soft'}
                radii="300"
                onClick={() => playMode('after')}
                disabled={!active}
              >
                <Text size="B300">{playingMode === 'after' ? 'Stop' : 'Test Mic'}</Text>
              </Button>
            </Box>
            <Box gap="200" alignItems="Center">
              <Text size="T200" priority="300" style={{ minWidth: toRem(48) }}>
                Before
              </Text>
              <LevelBar level={rawLevel} color={color.Critical.Main} />
              <Text size="T200" priority="300" style={{ minWidth: toRem(32), textAlign: 'right' }}>
                {active ? `${rawLevel}%` : '-'}
              </Text>
              <Button
                size="300"
                variant={playingMode === 'before' ? 'Critical' : 'Secondary'}
                fill={playingMode === 'before' ? 'Solid' : 'Soft'}
                radii="300"
                onClick={() => playMode('before')}
                disabled={!active}
              >
                <Text size="B300">{playingMode === 'before' ? 'Stop' : 'Test Mic'}</Text>
              </Button>
            </Box>
          </>
        )}
        {quality !== 'off' && (
          <Text size="T200" priority="300">
            Green is what others hear (after suppression). Red is before.
          </Text>
        )}
        {playingMode && (
          <Text size="T200" priority="300">
            {playingMode === 'after'
              ? 'Playing after suppression - you should hear denoised audio.'
              : quality === 'off'
                ? 'Playing your mic - you should hear yourself.'
                : 'Playing before suppression - raw microphone.'}
          </Text>
        )}
      </Box>

      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio ref={audioElRef} autoPlay playsInline style={{ display: 'none' }} />
      {!active && (
        <Text size="T200" style={{ color: color.Critical.Main }}>
          Microphone unavailable - check permission and device.
        </Text>
      )}
    </Box>
  );
}

function SpeakerTest({ deviceId, volume }: { deviceId?: string; volume: number }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);

  const play = useCallback(async () => {
    const el = audioRef.current;
    if (!el) return;
    try {
      const maybeSink = el as HTMLAudioElement & { setSinkId?: (id: string) => Promise<void> };
      if (deviceId && typeof maybeSink.setSinkId === 'function') {
        await maybeSink.setSinkId(deviceId);
      }
      el.volume = Math.max(0, Math.min(1, volume / 100));
      await el.play();
      setPlaying(true);
    } catch {
      try {
        el.volume = Math.max(0, Math.min(1, volume / 100));
        await el.play();
        setPlaying(true);
      } catch {
        setPlaying(false);
      }
    }
  }, [deviceId, volume]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onEnded = () => setPlaying(false);
    el.addEventListener('ended', onEnded);
    return () => el.removeEventListener('ended', onEnded);
  }, []);

  return (
    <Box gap="200" alignItems="Center">
      <audio ref={audioRef} src={NotificationSound} preload="auto" style={{ display: 'none' }} />
      <Button
        size="300"
        variant="Secondary"
        fill="Soft"
        radii="300"
        onClick={play}
        disabled={playing}
        before={<Icon size="100" src={Icons.Play} />}
      >
        <Text size="B300">{playing ? 'Playing…' : 'Test Speaker'}</Text>
      </Button>
      <Text size="T200" priority="300">
        You should hear a notification sound.
      </Text>
    </Box>
  );
}

function CameraPreview({ deviceId }: { deviceId?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [active, setActive] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setActive(false);
  }, []);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: deviceId ? { deviceId: { exact: deviceId } } : true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setActive(true);
    } catch {
      setActive(false);
    }
  }, [deviceId]);

  useEffect(() => stop, [stop]);

  return (
    <Box direction="Column" gap="200">
      <Box
        style={{
          width: '100%',
          maxWidth: toRem(360),
          aspectRatio: '16 / 9',
          background: color.Surface.Container,
          border: `1px solid ${color.Surface.ContainerLine}`,
          borderRadius: config.radii.R400,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <video
          ref={videoRef}
          muted
          playsInline
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: active ? 'block' : 'none',
          }}
        />
        {!active && (
          <Box direction="Column" alignItems="Center" gap="100">
            <Icon size="400" src={Icons.VideoCamera} />
            <Text size="T200" priority="300">
              Camera off
            </Text>
          </Box>
        )}
      </Box>
      <Box gap="200">
        <Button
          size="300"
          variant={active ? 'Critical' : 'Primary'}
          fill={active ? 'Soft' : 'Solid'}
          radii="300"
          onClick={active ? stop : start}
          before={<Icon size="100" src={active ? Icons.Cross : Icons.VideoCamera} />}
        >
          <Text size="B300">{active ? 'Stop Preview' : 'Preview Camera'}</Text>
        </Button>
      </Box>
    </Box>
  );
}

function NoiseSuppressionSelector() {
  const [quality, setQuality] = useSetting(settingsAtom, 'noiseSuppressionQuality');
  const [cords, setCords] = useState<RectCords>();

  const selected = NOISE_SUPPRESSION_OPTIONS.find((o) => o.value === quality);

  const handleOpen: MouseEventHandler<HTMLButtonElement> = (evt) => {
    setCords(evt.currentTarget.getBoundingClientRect());
  };

  return (
    <Box direction="Column" gap="300">
      <SettingTile
        title="Noise Suppression Quality"
        description="Choose how aggressively background noise is removed."
        after={
          <>
            <Button
              size="300"
              variant="Secondary"
              outlined
              fill="Soft"
              radii="300"
              after={<Icon size="300" src={Icons.ChevronBottom} />}
              onClick={handleOpen}
            >
              <Text size="T300">{selected?.label ?? quality}</Text>
            </Button>
            <PopOut
              anchor={cords}
              offset={5}
              position="Bottom"
              align="End"
              content={
                <FocusTrap
                  focusTrapOptions={{
                    initialFocus: false,
                    onDeactivate: () => setCords(undefined),
                    clickOutsideDeactivates: true,
                    isKeyForward: (evt: KeyboardEvent) =>
                      evt.key === 'ArrowDown' || evt.key === 'ArrowRight',
                    isKeyBackward: (evt: KeyboardEvent) =>
                      evt.key === 'ArrowUp' || evt.key === 'ArrowLeft',
                    escapeDeactivates: stopPropagation,
                  }}
                >
                  <Menu style={{ minWidth: toRem(220) }}>
                    <Box direction="Column" gap="100" style={{ padding: config.space.S100 }}>
                      {NOISE_SUPPRESSION_OPTIONS.map((opt) => (
                        <MenuItem
                          key={opt.value}
                          size="300"
                          variant={quality === opt.value ? 'Primary' : 'Surface'}
                          radii="300"
                          onClick={() => {
                            setQuality(opt.value as NoiseSuppressionQuality);
                            setCords(undefined);
                          }}
                        >
                          <Text size="T300">{opt.label}</Text>
                        </MenuItem>
                      ))}
                    </Box>
                  </Menu>
                </FocusTrap>
              }
            />
          </>
        }
      />

      <Box
        style={{
          padding: `${config.space.S200} ${config.space.S300}`,
          borderRadius: config.radii.R400,
          background: color.Surface.Container,
          border: `1px solid ${color.Surface.ContainerLine}`,
        }}
        direction="Column"
        gap="100"
      >
        <Text size="T200" priority="300">
          Higher quality removes more noise but uses more CPU. If High causes stuttering, try Medium
          or Low.
        </Text>
      </Box>
    </Box>
  );
}

export function VoiceVideo() {
  const { devices, permission, requestPermission } = useMediaDevices();
  const [microphoneDeviceId, setMicrophoneDeviceId] = useSetting(
    settingsAtom,
    'microphoneDeviceId',
  );
  const [speakerDeviceId, setSpeakerDeviceId] = useSetting(settingsAtom, 'speakerDeviceId');
  const [cameraDeviceId, setCameraDeviceId] = useSetting(settingsAtom, 'cameraDeviceId');
  const [microphoneVolume, setMicrophoneVolume] = useSetting(settingsAtom, 'microphoneVolume');
  const [speakerVolume, setSpeakerVolume] = useSetting(settingsAtom, 'speakerVolume');
  const [noiseQuality] = useSetting(settingsAtom, 'noiseSuppressionQuality');

  const hasLabels = useMemo(() => devices.some((d) => !!d.label), [devices]);
  const needsPermission = !hasLabels && permission !== 'granted';

  return (
    <Box direction="Column" gap="700">
      {needsPermission && (
        <SequenceCard
          className={SequenceCardStyle}
          variant="Warning"
          direction="Column"
          gap="200"
          style={{ padding: config.space.S300 }}
        >
          <Text size="T300">We need permission to list your devices.</Text>
          <Text size="T200" priority="300">
            Browser hides device names until you grant microphone/camera access.
          </Text>
          <Box>
            <Button size="300" variant="Warning" radii="300" onClick={requestPermission}>
              <Text size="B300">Allow Access</Text>
            </Button>
          </Box>
        </SequenceCard>
      )}

      <Box direction="Column" gap="100">
        <Text size="L400">Audio</Text>

        <SequenceCard
          className={SequenceCardStyle}
          variant="SurfaceVariant"
          direction="Column"
          gap="400"
        >
          <SettingTile
            title="Microphone"
            description="Default input device for calls and voice messages."
            after={
              <DeviceSelector
                label="Microphone"
                devices={devices}
                kind="audioinput"
                value={microphoneDeviceId}
                onChange={(id) => setMicrophoneDeviceId(id || undefined)}
              />
            }
          />
          <Box direction="Column" gap="200">
            <Box gap="200" alignItems="Center" justifyContent="SpaceBetween">
              <Text size="T300">Input Volume</Text>
              <VolumeSlider value={microphoneVolume} onChange={setMicrophoneVolume} />
            </Box>
            <MicMonitor
              deviceId={microphoneDeviceId}
              quality={noiseQuality}
              speakerDeviceId={speakerDeviceId}
              speakerVolume={speakerVolume}
            />
          </Box>
        </SequenceCard>

        <SequenceCard
          className={SequenceCardStyle}
          variant="SurfaceVariant"
          direction="Column"
          gap="400"
        >
          <SettingTile
            title="Speaker"
            description="Default output device for call audio and notification sounds."
            after={
              <DeviceSelector
                label="Speaker"
                devices={devices}
                kind="audiooutput"
                value={speakerDeviceId}
                onChange={(id) => setSpeakerDeviceId(id || undefined)}
              />
            }
          />
          <Box direction="Column" gap="200">
            <Box gap="200" alignItems="Center" justifyContent="SpaceBetween">
              <Text size="T300">Output Volume</Text>
              <VolumeSlider value={speakerVolume} onChange={setSpeakerVolume} />
            </Box>
            <SpeakerTest deviceId={speakerDeviceId} volume={speakerVolume} />
          </Box>
        </SequenceCard>

        <SequenceCard
          className={SequenceCardStyle}
          variant="SurfaceVariant"
          direction="Column"
          gap="400"
        >
          <NoiseSuppressionSelector />
        </SequenceCard>
      </Box>

      <Box direction="Column" gap="100">
        <Text size="L400">Video</Text>
        <SequenceCard
          className={SequenceCardStyle}
          variant="SurfaceVariant"
          direction="Column"
          gap="400"
        >
          <SettingTile
            title="Camera"
            description="Default camera for video calls."
            after={
              <DeviceSelector
                label="Camera"
                devices={devices}
                kind="videoinput"
                value={cameraDeviceId}
                onChange={(id) => setCameraDeviceId(id || undefined)}
              />
            }
          />
          <CameraPreview deviceId={cameraDeviceId} />
        </SequenceCard>
      </Box>
    </Box>
  );
}

type VoiceVideoPageProps = {
  requestClose: () => void;
};
export function VoiceVideoPage({ requestClose }: VoiceVideoPageProps) {
  return (
    <Page>
      <PageHeader outlined={false}>
        <Box grow="Yes" gap="200">
          <Box grow="Yes" alignItems="Center" gap="200">
            <Text size="H3" truncate>
              Voice & Video
            </Text>
          </Box>
          <Box shrink="No">
            <IconButton onClick={requestClose} variant="Surface">
              <Icon src={Icons.Cross} />
            </IconButton>
          </Box>
        </Box>
      </PageHeader>
      <Box grow="Yes">
        <Scroll hideTrack visibility="Hover">
          <PageContent>
            <VoiceVideo />
          </PageContent>
        </Scroll>
      </Box>
    </Page>
  );
}
