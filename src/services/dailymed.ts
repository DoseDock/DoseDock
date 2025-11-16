type RxImageResponse = {
  nlmRxImages?: Array<{
    size?: string;
    shape?: string;
    imageColor?: string;
  }>;
};

const RXIMAGE_ENDPOINT = 'https://rximage.nlm.nih.gov/api/rximage/1/rxnav';

const parseSize = (size?: string) => {
  if (!size) return { diameterMm: null, lengthMm: null };
  const parts = size.split('x').map((part) => parseFloat(part));
  if (parts.length === 1) {
    return { diameterMm: parts[0] || null, lengthMm: null };
  }
  return { diameterMm: parts[1] || null, lengthMm: parts[0] || null };
};

export type DailyMedDimensions = {
  formFactor?: string;
  diameterMm: number | null;
  lengthMm: number | null;
  color?: string | null;
};

export async function fetchDimensionsByNdc(ndc: string): Promise<DailyMedDimensions> {
  const cleaned = ndc.replace(/[^0-9]/g, '');
  if (!cleaned) {
    throw new Error('Invalid NDC/serial number');
  }

  const res = await fetch(`${RXIMAGE_ENDPOINT}?ndc=${cleaned}`);
  if (!res.ok) {
    throw new Error(`DailyMed lookup failed with ${res.status}`);
  }
  const data = (await res.json()) as RxImageResponse;
  const match = data.nlmRxImages?.[0];
  if (!match) {
    throw new Error('No dimension data found for this NDC');
  }

  const { diameterMm, lengthMm } = parseSize(match.size);
  return {
    formFactor: match.shape?.toLowerCase() ?? undefined,
    diameterMm,
    lengthMm,
    color: match.imageColor,
  };
}

