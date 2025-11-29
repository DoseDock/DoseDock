import { graphqlRequest } from './graphqlClient';

const USER_FIELDS = `
  id
  email
  fullName
  timezone
`;

const PATIENT_FIELDS = `
  id
  firstName
  lastName
  timezone
`;

export type GraphQLUser = {
  id: string;
  email: string;
  fullName: string;
  timezone: string;
};

export type GraphQLPatient = {
  id: string;
  firstName: string;
  lastName: string;
  timezone: string;
};

export async function fetchUserByEmail(email: string): Promise<GraphQLUser | null> {
  const data = await graphqlRequest<{ userByEmail: GraphQLUser | null }>(
    `query UserByEmail($email: String!) {
      userByEmail(email: $email) {
        ${USER_FIELDS}
      }
    }`,
    { email }
  );
  return data.userByEmail ?? null;
}

type UpsertUserInput = {
  email: string;
  fullName: string;
  timezone: string;
  phone?: string;
  password?: string;
};

export async function upsertUserProfile(input: UpsertUserInput): Promise<GraphQLUser> {
  const data = await graphqlRequest<{ upsertUser: GraphQLUser }>(
    `mutation UpsertUser($input: UserInput!) {
      upsertUser(input: $input) {
        ${USER_FIELDS}
      }
    }`,
    { input }
  );
  return data.upsertUser;
}

type LoginInput = {
  email: string;
  password: string;
};

export async function login(input: LoginInput): Promise<GraphQLUser> {
  const data = await graphqlRequest<{ login: GraphQLUser }>(
    `mutation Login($input: LoginInput!) {
      login(input: $input) {
        ${USER_FIELDS}
      }
    }`,
    { input }
  );
  return data.login;
}

export async function fetchPatientsForUser(userId: string): Promise<GraphQLPatient[]> {
  const data = await graphqlRequest<{ patients: GraphQLPatient[] }>(
    `query PatientsForUser($userId: ID!) {
      patients(userId: $userId) {
        ${PATIENT_FIELDS}
      }
    }`,
    { userId }
  );
  return data.patients;
}

type CreatePatientRequest = {
  userId: string;
  firstName: string;
  lastName: string;
  timezone: string;
  dateOfBirth?: string;
  gender?: string;
  preferredLanguage?: string;
  notes?: string;
};

export async function createPatientForUser(input: CreatePatientRequest): Promise<GraphQLPatient> {
  const data = await graphqlRequest<{ createPatient: GraphQLPatient }>(
    `mutation CreatePatient($input: PatientInput!) {
      createPatient(input: $input) {
        ${PATIENT_FIELDS}
      }
    }`,
    {
      input: {
        userId: input.userId,
        firstName: input.firstName,
        lastName: input.lastName,
        timezone: input.timezone,
        dateOfBirth: input.dateOfBirth || null,
        gender: input.gender || null,
        preferredLanguage: input.preferredLanguage || null,
        notes: input.notes || null,
        metadata: {},
      },
    }
  );
  return data.createPatient;
}


