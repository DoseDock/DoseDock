// Production: Use Cloudflare tunnel URL for symposium demo
const endpoint = (process.env.EXPO_PUBLIC_GRAPHQL_URL || 'https://lamp-korea-utils-jamie.trycloudflare.com/query').trim();
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


