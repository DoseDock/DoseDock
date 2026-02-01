# GraphQL client for PillBox backend communication

import urequests
import json
from config import BACKEND_URL, PATIENT_ID

# GRAPHQL QUERIES

DUE_NOW_QUERY = """
query DueNow($patientId: ID!, $windowMinutes: Int) {
  dueNow(patientId: $patientId, windowMinutes: $windowMinutes) {
    schedule {
      id
      title
      lockoutMinutes
    }
    dueAtISO
    medications {
      medication {
        id
        name
      }
      qty
      siloSlot
    }
  }
}
"""

RECORD_DISPENSE_MUTATION = """
mutation RecordDispense($input: DispenseActionInput!) {
  recordDispenseAction(input: $input) {
    id
    status
  }
}
"""

PING_QUERY = "query { ping }"


# GRAPHQL CLIENT

def graphql_request(query, variables=None):
    """Make a GraphQL request to the backend."""
    payload = {"query": query}
    if variables:
        payload["variables"] = variables

    try:
        response = urequests.post(
            BACKEND_URL,
            headers={"Content-Type": "application/json"},
            data=json.dumps(payload)
        )

        if response.status_code == 200:
            result = response.json()
            response.close()

            if "errors" in result:
                print(f"GraphQL errors: {result['errors']}")
                return None
            return result.get("data")
        else:
            print(f"HTTP error: {response.status_code}")
            response.close()
            return None

    except Exception as e:
        print(f"Request failed: {e}")
        return None


def ping_backend():
    """Test backend connectivity."""
    return graphql_request(PING_QUERY)


def get_due_medications(window_minutes=1):
    """Query backend for medications due now."""
    data = graphql_request(DUE_NOW_QUERY, {
        "patientId": PATIENT_ID,
        "windowMinutes": window_minutes
    })

    if data and data.get("dueNow"):
        return data["dueNow"]
    return []


def record_dispense(schedule_id, due_at_iso, acted_at_iso, status):
    """Report dispense result to backend."""
    variables = {
        "input": {
            "patientId": PATIENT_ID,
            "scheduleId": schedule_id,
            "dueAtISO": due_at_iso,
            "actedAtISO": acted_at_iso,
            "status": status,
            "actionSource": "device"
        }
    }

    result = graphql_request(RECORD_DISPENSE_MUTATION, variables)
    if result:
        print(f"Recorded dispense: {status}")
    return result
