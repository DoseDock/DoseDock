# GraphQL Sandbox Guide

Use these sample operations in GraphQL Playground (or any GraphQL client) to exercise every mutation and query that the backend exposes. Run them in order so later steps have the IDs returned earlier.

## 1. Ping
```graphql
query Ping {
  ping
}
```

## 2. User Workflow
```graphql
mutation UpsertUser {
  upsertUser(
    input: {
      email: "caregiver@example.com"
      fullName: "Care Giver"
      timezone: "America/New_York"
      phone: "+1-555-0000"
    }
  ) {
    id
    email
    timezone
  }
}
```
- Save the returned `user.id` as `USER_ID`.

## 3. Patient Lifecycle
Create:
```graphql
mutation CreatePatient {
  createPatient(
    input: {
      userId: "USER_ID"
      firstName: "Ava"
      lastName: "Stone"
      timezone: "America/New_York"
      preferredLanguage: "en"
      metadata: { notes: "Test patient" }
    }
  ) {
    id
    firstName
    createdAt
  }
}
```
- Store the `patient.id` as `PATIENT_ID`.

Update:
```graphql
mutation UpdatePatient {
  updatePatient(
    id: "PATIENT_ID"
    input: {
      userId: "USER_ID"
      firstName: "Ava"
      lastName: "Stone"
      timezone: "America/Chicago"
      notes: "Timezone updated"
    }
  ) {
    id
    timezone
    updatedAt
  }
}
```

## 4. Medication CRUD
Create:
```graphql
mutation AddMedication {
  upsertMedication(
    input: {
      patientId: "PATIENT_ID"
      name: "Metformin"
      stockCount: 60
      lowStockThreshold: 10
      dosageMg: 500
      maxDailyDose: 4
      metadata: {
        hardwareProfile: {
          serialNumber: "SER-001-MET"
          manufacturer: "PillBox Labs"
          formFactor: "oval"
          siloSlot: 0
          trapdoorOpenMs: 1200
          trapdoorHoldMs: 800
        }
      }
    }
  ) {
    id
    name
    stockCount
    maxDailyDose
  }
}
```
- Save `medication.id` as `MED_ID`.

Update:
```graphql
mutation UpdateMedication {
  upsertMedication(
    input: {
      id: "MED_ID"
      patientId: "PATIENT_ID"
      name: "Metformin XR"
      stockCount: 55
      dosageMg: 750
      maxDailyDose: 4
      metadata: {
        hardwareProfile: {
          serialNumber: "SER-001-MET"
          siloSlot: 0
          trapdoorHoldMs: 850
        }
      }
    }
  ) {
    id
    name
    dosageMg
    metadata
  }
}
```

Delete:
```graphql
mutation DeleteMedication {
  deleteMedication(id: "MED_ID")
}
```

## 5. Schedule Management
Create:
```graphql
mutation CreateSchedule {
  createSchedule(
    input: {
      patientId: "PATIENT_ID"
      title: "Morning Routine"
      timezone: "America/New_York"
      rrule: "RRULE:FREQ=DAILY"
      startDateISO: "2025-01-01T08:00:00Z"
      lockoutMinutes: 60
      snoozeIntervalMinutes: 10
      snoozeMax: 3
      items: [
        { medicationId: "MED_ID", qty: 1 }
      ]
    }
  ) {
    id
    status
    items {
      id
      qty
      medication { name }
    }
  }
}
```
- Save `schedule.id` as `SCHED_ID`.

Update:
```graphql
mutation UpdateSchedule {
  updateSchedule(
    id: "SCHED_ID"
    input: {
      patientId: "PATIENT_ID"
      title: "Updated Morning Routine"
      timezone: "America/New_York"
      rrule: "RRULE:FREQ=DAILY;INTERVAL=1"
      startDateISO: "2025-01-01T08:00:00Z"
      lockoutMinutes: 90
      snoozeIntervalMinutes: 15
      snoozeMax: 2
      items: [
        { medicationId: "MED_ID", qty: 2 }
      ]
    }
  ) {
    id
    title
    items { qty }
  }
}
```

Archive:
```graphql
mutation ArchiveSchedule {
  archiveSchedule(id: "SCHED_ID") {
    id
    status
  }
}
```

## 6. Dispense Events
```graphql
mutation RecordEvent {
  recordDispenseAction(
    input: {
      patientId: "PATIENT_ID"
      scheduleId: "SCHED_ID"
      scheduleItemId: null
      dueAtISO: "2025-02-01T08:00:00Z"
      actedAtISO: "2025-02-01T08:05:00Z"
      status: TAKEN
      notes: "Test dose"
      metadata: { source: "Sandbox" }
    }
  ) {
    id
    status
    dueAtISO
    metadata
  }
}
```
- Save `event.id` as `EVENT_ID`.
- To test updates, rerun with `eventId: "EVENT_ID"` and a different `status`.

## 7. Read Queries

### All users with nested data
```graphql
query Users {
  users {
    id
    fullName
    patients {
      id
      firstName
      medications { id name stockCount }
      schedules {
        id
        title
        items { qty medication { name } }
      }
      upcomingDispenseEvents {
        id
        status
      }
    }
  }
}
```

### Specific patient
```graphql
query PatientById {
  patient(id: "PATIENT_ID") {
    id
    firstName
    timezone
    medications { name }
    schedules { title status }
  }
}
```

### Patients filtered by user
```graphql
query PatientsForUser {
  patients(userId: "USER_ID") {
    id
    firstName
  }
}
```

### Medication lookup
```graphql
query MedicationById {
  medication(id: "MED_ID") {
    id
    name
    dosageMg
  }
}
```

### Dispense events within a range
```graphql
query DispenseEventsByRange {
  dispenseEvents(
    patientId: "PATIENT_ID"
    range: { start: "2025-01-01T00:00:00Z", end: "2025-12-31T23:59:59Z" }
  ) {
    id
    status
    dueAtISO
  }
}
```

## Tips

- Keep a simple scratchpad of the latest IDs (`USER_ID`, `PATIENT_ID`, `MED_ID`, `SCHED_ID`, `EVENT_ID`).
- ISO timestamps must be valid strings; Playground variables should be JSON with quoted ISO values.
- To reset the database: `make migrate-down` followed by `make migrate-up`.
- Hardware mappings are stored on `Medication.metadata.hardwareProfile`. The modal in the Hardware Mapping screen reads/writes this JSON blob when GraphQL sync is enabled.

