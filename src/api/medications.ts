import { graphqlRequest } from './graphqlClient';
import type { Pill } from '@types';

const MEDICATION_FIELDS = `
  id
  patientId
  name
  color
  stockCount
  lowStockThreshold
  cartridgeIndex
  maxDailyDose
  createdAt
  updatedAt
`;

export type MedicationGraphQL = {
  id: string;
  patientId: string;
  name: string;
  color?: string | null;
  stockCount: number;
  lowStockThreshold: number;
  cartridgeIndex?: number | null;
  maxDailyDose: number;
  createdAt: string;
  updatedAt: string;
};

export type MedicationInput = {
  id?: string;
  patientId: string;
  name: string;
  color?: string | null;
  stockCount?: number;
  lowStockThreshold?: number;
  cartridgeIndex?: number | null;
  maxDailyDose?: number;
};

export const mapMedicationToPill = (medication: MedicationGraphQL): Pill => {
  return {
    id: medication.id,
    patientId: medication.patientId,
    name: medication.name,
    color: medication.color || '#9ca3af',
    cartridgeIndex: medication.cartridgeIndex ?? null,
    maxDailyDose: medication.maxDailyDose || 1,
    stockCount: medication.stockCount,
    lowStockThreshold: medication.lowStockThreshold,
    createdAt: Date.parse(medication.createdAt),
    updatedAt: medication.updatedAt ? Date.parse(medication.updatedAt) : undefined,
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
    { input }
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
