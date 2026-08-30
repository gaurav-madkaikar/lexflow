# Edit Initial OrgAdmin Identity

## Goal

Allow a PlatformAdmin to replace the initial OrgAdmin email and Entra object ID for an existing organization while preserving the organization and its tenant ID.

## Behavior

- The organization edit form exposes `Initial OrgAdmin email` and `Initial OrgAdmin object ID`.
- The platform organization PATCH endpoint accepts both fields.
- The email is normalized and must use the organization’s configured domain.
- The object ID must be a valid Entra GUID.
- The current organization membership is located by organization and OrgAdmin role, then updated in place with the new email and object ID.
- The membership role remains OrgAdmin and its status remains unchanged.
- Duplicate email or Entra identity conflicts are rejected without changing data.
- All sessions for the organization are invalidated after a successful identity replacement.
- The Entra tenant ID remains immutable through this operation.
- The existing last-active-OrgAdmin protection remains applicable to member lifecycle operations.

## UI

When editing an organization, show the two identity fields alongside the existing name, domain, and logo fields. Populate them from the organization’s current OrgAdmin membership. Keep the Entra tenant ID read-only. Creation behavior remains unchanged.

## Validation and errors

The API returns field-specific validation errors for an invalid email or object ID, a domain mismatch, a missing OrgAdmin membership, or an identity conflict. The form displays these errors using the existing organization form error treatment.

## Tests

- PlatformAdmin can replace an organization’s initial OrgAdmin identity.
- Tenant ID and organization metadata remain unchanged.
- Existing OrgAdmin role/status are preserved.
- Invalid domain and object ID are rejected.
- Duplicate identity conflicts are rejected atomically.
- Organization sessions are invalidated after replacement.
- Non-PlatformAdmins cannot use the endpoint.
