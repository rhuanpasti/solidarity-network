# Audit Trail

The backend records audit events in `AuditTrail` for beneficiary, benefit, and benefit delivery changes. Each row captures who performed the action, which entity changed, the changed fields, previous values, new values, request context, and timestamp.

## Schema

```prisma
model AuditTrail {
  id               String   @id @default(cuid())
  action           String
  status           String
  entityType       String?
  entityId         String?
  charityProgramId String?
  actorAccountId   String?
  actorAccountType String?
  actorRole        String?
  requestId        String?
  ipAddress        String?
  userAgent        String?
  changedFields    String[] @default([])
  previousValues   Json?
  newValues        Json?
  metadata         Json?
  createdAt        DateTime @default(now())

  @@index([action])
  @@index([status])
  @@index([entityType, entityId])
  @@index([actorAccountId, actorAccountType])
  @@index([charityProgramId])
  @@index([requestId])
  @@index([createdAt])
}
```

## Logging Mechanism

Use `AuditTrailService.record()` from domain services after the database mutation succeeds. For updates, read the existing record before mutation, compare it with the saved record, then persist only the changed values.

```ts
const previousSnapshot = toAuditSnapshot(existingBenefit);
const benefit = await benefitsRepository.update(id, dto);
const newSnapshot = toAuditSnapshot(benefit);
const auditChanges = getAuditChanges(previousSnapshot, newSnapshot);

await auditTrailService.record({
  action: 'benefit.update',
  entityType: 'benefit',
  entityId: benefit.id,
  actor,
  changedFields: auditChanges.changedFields,
  previousValues: auditChanges.previousValues,
  newValues: auditChanges.newValues,
});
```

`AuditTrailService` also enriches entries from request context:

```ts
{
  actorAccountId: actor.sub,
  actorAccountType: actor.accountType,
  actorRole: actor.role,
  requestId: context.requestId,
  ipAddress: context.ipAddress,
  userAgent: context.userAgent,
  createdAt: new Date()
}
```

## Example Entry

```json
{
  "id": "clw9audit0001",
  "action": "beneficiary.update",
  "status": "success",
  "entityType": "beneficiary",
  "entityId": "clw9ben0001",
  "charityProgramId": null,
  "actorAccountId": "clw9admin0001",
  "actorAccountType": "administrator",
  "actorRole": "case_worker",
  "requestId": "req_01HZX7",
  "changedFields": ["phone", "status"],
  "previousValues": {
    "phone": "+5511999990000",
    "status": "active"
  },
  "newValues": {
    "phone": "+5511988880000",
    "status": "inactive"
  },
  "metadata": {
    "updatedFields": ["phone", "status"],
    "updatedAddress": false,
    "charityProgramIds": ["clw9program0001"],
    "status": "inactive"
  },
  "createdAt": "2026-04-23T14:30:00.000Z"
}
```

## History Query

Use the service method for application code:

```ts
const history = await auditTrailService.history('beneficiary', beneficiaryId, 50);
```

Direct Prisma query:

```ts
const history = await prisma.auditTrail.findMany({
  where: {
    entityType: 'beneficiary',
    entityId: beneficiaryId,
  },
  orderBy: {
    createdAt: 'desc',
  },
  take: 50,
});
```

For deliveries, query with `entityType: 'benefit_delivery'`. For benefits, query with `entityType: 'benefit'`.
