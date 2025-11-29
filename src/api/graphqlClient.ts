import { graphQLConfig } from '@/config/env';

type GraphQLResponse<T> = {
  data?: T;
  errors?: Array<{ message: string }>;
};

export async function graphqlRequest<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  if (!graphQLConfig.endpoint) {
    throw new Error(
      'GraphQL endpoint is not configured. Set EXPO_PUBLIC_GRAPHQL_URL to enable API mutations.'
    );
  }

  const response = await fetch(graphQLConfig.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });

  let payload: GraphQLResponse<T>;
  try {
    payload = (await response.json()) as GraphQLResponse<T>;
  } catch (error) {
    throw new Error(`Unable to parse GraphQL response: ${(error as Error).message}`);
  }

  if (!response.ok) {
    const errorMessage = payload.errors?.[0]?.message || `GraphQL request failed with status ${response.status}`;
    throw new Error(errorMessage);
  }

  if (payload.errors?.length) {
    throw new Error(payload.errors[0].message);
  }

  if (!payload.data) {
    throw new Error('GraphQL response did not include data.');
  }

  return payload.data;
}


