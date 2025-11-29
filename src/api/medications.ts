import { graphqlRequest } from './graphqlClient';
import type { Pill, PillHardwareProfile } from '@types';

const MEDICATION_FIELDS = `
  id
  patientId
  name
  nickname
  color
  shape
  dosageForm
  strength
  dosageMg
  instructions
  stockCount
  lowStockThreshold
  cartridgeIndex
  manufacturer
  externalId
  maxDailyDose
  metadata
  createdAt
  updatedAt
`;

export type MedicationGraphQL = {
  id: string;
  patientId: string;
  name: string;
  nickname?: string | null;
  color?: string | null;
  shape?: string | null;
  dosageForm?: string | null;
  strength?: string | null;
  dosageMg?: number | null;
  instructions?: string | null;
  stockCount: number;
  lowStockThreshold: number;
  cartridgeIndex?: number | null;
  manufacturer?: string | null;
  externalId?: string | null;
  maxDailyDose: number;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
};

export type MedicationInput = {
  id?: string;
  patientId: string;
  name: string;
  nickname?: string | null;
  color?: string | null;
  shape?: string | null;
  dosageForm?: string | null;
  strength?: string | null;
  dosageMg?: number | null;
  instructions?: string | null;
  stockCount?: number;
  lowStockThreshold?: number;
  cartridgeIndex?: number | null;
  manufacturer?: string | null;
  externalId?: string | null;
  maxDailyDose?: number;
  metadata?: Record<string, unknown>;
};

export const mapMedicationToPill = (medication: MedicationGraphQL): Pill => {
  const safeMetadata = (medication.metadata as Record<string, unknown> | undefined) || {};
  return {
    id: medication.id,
    patientId: medication.patientId,
    name: medication.name,
    color: medication.color || '#9ca3af',
    shape: medication.shape || 'round',
    cartridgeIndex: medication.cartridgeIndex ?? 0,
    maxDailyDose: medication.maxDailyDose || 1,
    stockCount: medication.stockCount,
    lowStockThreshold: medication.lowStockThreshold,
    createdAt: Date.parse(medication.createdAt),
    updatedAt: Date.parse(medication.updatedAt),
    nickname: medication.nickname || undefined,
    dosageMg: medication.dosageMg ?? undefined,
    instructions: medication.instructions || undefined,
    manufacturer: medication.manufacturer || undefined,
    externalId: medication.externalId || undefined,
    metadata: safeMetadata,
  };
};

export const extractHardwareProfile = (
  pill: Pill
): PillHardwareProfile | undefined => {
  const raw = pill.metadata as Record<string, unknown> | undefined;
  const hardware = raw?.hardwareProfile as PillHardwareProfile | undefined;
  if (!hardware) return undefined;
  return {
    ...hardware,
    pillId: pill.id,
  };
};

export async function fetchMedications(patientId: string): Promise<MedicationGraphQL[]> {
  const data = await graphqlRequest<{ medications: MedicationGraphQL[] }>(
    `query Medications($patientId: ID!) {
      medications(patientId: $patientId) {
        ${MEDICATION_FIELDS}
      }
    }`,
    { patientId }
  );
  return data.medications;
}

export async function upsertMedication(input: MedicationInput): Promise<MedicationGraphQL> {
  const data = await graphqlRequest<{ upsertMedication: MedicationGraphQL }>(
    `mutation UpsertMedication($input: MedicationInput!) {
      upsertMedication(input: $input) {
        ${MEDICATION_FIELDS}
      }
    }`,
    {
      input: {
        ...input,
        metadata: input.metadata ?? {},
      },
    }
  );
  return data.upsertMedication;
}

export async function deleteMedication(id: string): Promise<void> {
  await graphqlRequest<{ deleteMedication: boolean }>(
    `mutation DeleteMedication($id: ID!) {
      deleteMedication(id: $id)
    }`,
    { id }
  );
}


