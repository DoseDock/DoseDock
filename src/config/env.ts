// Production: Use Render backend
const endpoint = 'https://dosedock-backend.onrender.com/query';
const patientId = (process.env.EXPO_PUBLIC_GRAPHQL_PATIENT_ID || '').trim();
const userId = (process.env.EXPO_PUBLIC_GRAPHQL_USER_ID || '').trim();
const firmwareUrl = (process.env.EXPO_PUBLIC_FIRMWARE_URL || '').trim();

export const graphQLConfig = {
  endpoint,
  patientId,
  userId,
};

export const firmwareConfig = {
  url: firmwareUrl,
};

export const isGraphQLAvailable = Boolean(endpoint);


