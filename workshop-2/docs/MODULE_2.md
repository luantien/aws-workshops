# Module 2 - Orders Service

## Part 1: Order API Endpoints
### Cognito Services
- **Uncomment** Cognito Services in [lib/main.ts](../lib/main.ts) (***line 17-23***).
```typescript
const cognito = new CognitoService(this, 'CognitoService', {
    userPoolName: `${props.owner}WorkshopUserPool`,
    domainPrefix: `${props.owner}-user-pool`,
    region: process.env.AWS_REGION ?? 'ap-southeast-1',
});
cdk.Tags.of(cognito).add('name', `${props.owner ?? 'anonymous'}-cognito-service`);
cdk.Tags.of(cognito).add('description', `Cognito Service created by ${props.owner ?? 'anonymous'}`);
```
```bash
# Deploy Cognito Services with CDK
cdk deploy --profile ${AWS_USERNAME}
```
***Note: Just Skip this step if you already walk through this step in Module 1.***

### Order API Services
- Install source dependencies (skip this step if you already walk through this step in Module 1).
```bash
pip install -r src/requirements.txt -t src/packages/python
```
- **Uncomment** Orders Services in [lib/main.ts](../lib/main.ts) (**line 34-39**).
```typescript
const orderService = new OrdersService(this, 'OrderService', {
    cognito: cognito,
    owner: props.owner,
});
cdk.Tags.of(orderService).add('name', `${props.owner ?? 'anonymous'}-orders-service`);
cdk.Tags.of(orderService).add('description', `Orders Rest APIs created by ${props.owner ?? 'anonymous'}`);
```
- **Uncomment** provision step for Order resource in [lib/services/orders.ts](../lib/services/orders.ts) (***line 111***).
```typescript
this.provisionOrderResources(lambdaOptions, authorizer);
```
```bash
# Deploy Order API Services with CDK
cdk deploy --profile ${AWS_USERNAME}
```

## Part 2: Order Event Stream Pipeline
- **Uncomment** Order Event Stream Services in [lib/services/orders.ts](../lib/services/orders.ts) (**line 113**).
```typescript
this.provisionDownStreamPipeline(lambdaOptions);
```
```bash
# Deploy Order Services with CDK
cdk deploy --profile ${AWS_USERNAME}
```
