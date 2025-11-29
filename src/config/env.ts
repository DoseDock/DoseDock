const endpoint = (process.env.EXPO_PUBLIC_GRAPHQL_URL || '').trim();
const patientId = (process.env.EXPO_PUBLIC_GRAPHQL_PATIENT_ID || '').trim();
const userId = (process.env.EXPO_PUBLIC_GRAPHQL_USER_ID || '').trim();

export const graphQLConfig = {
  endpoint,
  patientId,
  userId,
};

export const isGraphQLAvailable = Boolean(endpoint);


