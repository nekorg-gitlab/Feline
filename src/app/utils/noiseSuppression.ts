import type { NoiseSuppressionQuality } from '../state/settings';

export const QUALITY_TO_MODEL = {
  high: 'small',
  medium: 'base',
  low: 'tiny',
  off: null,
} as const;

export const MODEL_TO_QUALITY: Record<string, NoiseSuppressionQuality> = {
  small: 'high',
  base: 'medium',
  tiny: 'low',
};

export type FastEnhancerModelSize = 'small' | 'base' | 'tiny';

export function qualityToModelSize(quality: NoiseSuppressionQuality): FastEnhancerModelSize | null {
  return QUALITY_TO_MODEL[quality];
}

export function modelSizeToQuality(size: FastEnhancerModelSize): NoiseSuppressionQuality {
  return MODEL_TO_QUALITY[size] ?? 'off';
}

export const NOISE_SUPPRESSION_OPTIONS: {
  value: NoiseSuppressionQuality;
  label: string;
  description: string;
}[] = [
  {
    value: 'off',
    label: 'Off',
    description: 'No processing',
  },
  {
    value: 'low',
    label: 'Low',
    description: 'Light cleanup — lowest CPU',
  },
  {
    value: 'medium',
    label: 'Medium',
    description: 'Balanced',
  },
  {
    value: 'high',
    label: 'High',
    description: 'Strongest cleanup — highest CPU',
  },
];

export async function loadDenoiserModel(size: FastEnhancerModelSize) {
  const { loadModel } = await import('fastenhancer-web');
  return loadModel(size);
}

export async function createDenoisedStream(
  inputStream: MediaStream,
  quality: NoiseSuppressionQuality,
  options?: { audioContext?: AudioContext },
): Promise<{ outputStream: MediaStream; destroy: () => void } | null> {
  const modelSize = qualityToModelSize(quality);
  if (!modelSize) return null;
  const model = await loadDenoiserModel(modelSize);
  const denoiser = await model.createStreamDenoiser(inputStream, {
    audioContext: options?.audioContext,
  });
  // Keep AGC enabled for audible output
  try {
    denoiser.agcEnabled = true;
  } catch {}
  return {
    outputStream: denoiser.outputStream,
    destroy: () => denoiser.destroy(),
  };
}

export async function diagnoseNoiseSuppression(): Promise<{
  supported: boolean;
  issues: string[];
}> {
  try {
    const { diagnose } = await import('fastenhancer-web');
    const result = await diagnose();
    return {
      supported: result.overall,
      issues: result.issues,
    };
  } catch {
    return {
      supported: false,
      issues: ['Failed to run compatibility check.'],
    };
  }
}
