# Module 1 - Books Service

## Part 1: Book Components
### Cognito Services
- **Uncomment** Cognito Services in lib/main.ts (line 16-22).
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
# Deploy Book Services with CDK
cdk deploy --profile ${AWS_USERNAME}
```
### Book Services
- Install source dependencies.
```bash
pip install -r src/requirements.txt -t src/packages/python
```
- **Uncomment** Books Services in lib/main.ts (**line 25-30**).
```typescript
const bookService = new BooksService(this, 'BookService', {
    cognito: cognito,
    owner: props.owner,
});
cdk.Tags.of(bookService).add('name', `${props.owner ?? 'anonymous'}-books-service`);
cdk.Tags.of(bookService).add('description', `Books Rest APIs created by ${props.owner ?? 'anonymous'}`);
```
- **Uncomment** provision step for Book resource in lib/services/books.ts (line 112).
```typescript
this.provisionBookResources(lambdaOptions, authorizer);
```
```bash
# Deploy Book Services with CDK
cdk deploy --profile ${AWS_USERNAME}
```
- Run Data Seeder for DynamoDB Books Table
```bash
aws dynamodb batch-write-item --profile ${AWS_USERNAME} --request-items file://./src/seeders/data-seeder.json
```
## Part 2: Review Component
- **Uncomment** provision step for Review resource in lib/services/books.ts (line 112).
```typescript
this.provisionReviewResources(lambdaOptions, authorizer);
```
```bash
# Deploy Book Services with CDK
cdk deploy --profile ${AWS_USERNAME}
```
