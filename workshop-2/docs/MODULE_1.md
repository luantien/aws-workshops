# Module 1 - Books Service

## Part 1: Book Components
### Cognito Services: 
- Uncomment Cognito Services in lib/main.ts (line 16-22)
```typescript
// const cognito = new CognitoService(this, 'CognitoService', {
//     userPoolName: 'WorkshopUserPool',
//     domainPrefix: `${process.env.AWS_USERNAME ?? Date.now()}-user-pool`,
//     region: process.env.AWS_REGION ?? 'ap-southeast-1',
// });
// cdk.Tags.of(cognito).add('name', `${props.owner ?? 'anonymous'}-cognito-service`);
// cdk.Tags.of(cognito).add('description', `Cognito Service created by ${props.owner ?? 'anonymous'}`);
```
- Book Services
- Lambda Handlers

- 

```bash
# Deploy Book Services with CDK
cdk deploy --profile ${AWS_USERNAME}
```
## Part 2: Review Component