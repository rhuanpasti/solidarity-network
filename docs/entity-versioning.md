# Entity Versioning

Historical versioning is stored separately from audit logs. Audit logs answer who performed an action; entity versions answer what the entity looked like after each change.

## Strategy

Use a generic append-only `EntityVersion` table for versioned entities:

- `entityType`: one of `beneficiary`, `benefit`, `benefit_delivery`.
- `entityId`: the id of the versioned record.
- `version`: monotonically increasing integer scoped to `(entityType, entityId)`.
- `snapshot`: full post-change state, used to read past states directly.
- `diff`: compact previous/new values for fields changed by the action.
- `changedFields`: indexed-friendly field list for quick inspection.
- actor fields: copied from the authenticated request context for traceability.

Full snapshots are intentionally stored on every version. This avoids replaying all diffs to answer “what did this look like at the time?” and makes point-in-time reads simple and reliable.

## Schema

```prisma
model EntityVersion {
  id               String   @id @default(cuid())
  entityType       String
  entityId         String
  version          Int
  action           String
  charityProgramId String?
  actorAccountId   String?
  actorAccountType String?
  actorRole        String?
  changedFields    String[] @default([])
  snapshot         Json
  diff             Json?
  createdAt        DateTime @default(now())

  @@unique([entityType, entityId, version])
  @@index([entityType, entityId, createdAt])
  @@index([entityType, entityId, version])
  @@index([charityProgramId])
  @@index([createdAt])
}
```

## Example Row

```json
{
  "entityType": "beneficiary",
  "entityId": "clw9ben0001",
  "version": 3,
  "action": "beneficiary.update",
  "actorAccountId": "clw9admin0001",
  "actorAccountType": "administrator",
  "actorRole": "case_worker",
  "changedFields": ["phone", "status"],
  "snapshot": {
    "fullName": "Ana Silva",
    "document": "12345678901",
    "birthDate": "1988-03-10T00:00:00.000Z",
    "email": "ana@example.org",
    "phone": "+5511988880000",
    "address": {
      "country": "BR",
      "city": "Sao Paulo"
    },
    "notes": null,
    "status": "inactive",
    "charityProgramIds": ["clw9program0001"]
  },
  "diff": {
    "changedFields": ["phone", "status"],
    "previousValues": {
      "phone": "+5511999990000",
      "status": "active"
    },
    "newValues": {
      "phone": "+5511988880000",
      "status": "inactive"
    }
  },
  "createdAt": "2026-04-23T15:00:00.000Z"
}
```

## Recording Versions

Domain services record a version after a successful write:

```ts
await entityVersioningService.recordVersion({
  entityType: 'benefit',
  entityId: benefit.id,
  action: 'benefit.update',
  actor,
  changedFields: auditChanges.changedFields,
  snapshot: newSnapshot,
  diff: auditChanges,
});
```

## Query Examples

Get history for one beneficiary:

```ts
const history = await entityVersioningService.history(
  'beneficiary',
  beneficiaryId,
  50,
);
```

Direct Prisma query:

```ts
const history = await prisma.entityVersion.findMany({
  where: {
    entityType: 'beneficiary',
    entityId: beneficiaryId,
  },
  orderBy: {
    version: 'desc',
  },
  take: 50,
});
```

Get state at version 3:

```ts
const version = await entityVersioningService.stateAt({
  entityType: 'beneficiary',
  entityId: beneficiaryId,
  version: 3,
});

const beneficiaryAtVersion3 = version?.snapshot;
```

Get state at a point in time:

```ts
const version = await entityVersioningService.stateAt({
  entityType: 'benefit_delivery',
  entityId: deliveryId,
  at: new Date('2026-04-23T15:00:00.000Z'),
});

const deliveryAtThatTime = version?.snapshot;
```

Use `entityType: 'benefit'` for benefits and `entityType: 'benefit_delivery'` for deliveries.
