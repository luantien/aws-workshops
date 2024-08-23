# Module 1 - Books Service
![alt Workshop2 - Module 1](./img/ws2_m1_all.png)
## Part 1: Book API Endpoints
![alt Module 1 - Part 1](./img/ws2_m1_p1.png)
### Cognito Services
- **Uncomment** Cognito Services in lib/main.ts (***line 17-23***).
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
### Book API Services
- Install source dependencies.
```bash
pip install -r src/requirements.txt -t src/packages/python
```
- **Uncomment** Books Services in [lib/main.ts](../lib/main.ts) (**line 26-31**).
```typescript
const bookService = new BooksService(this, 'BookService', {
    cognito: cognito,
    owner: props.owner,
});
cdk.Tags.of(bookService).add('name', `${props.owner ?? 'anonymous'}-books-service`);
cdk.Tags.of(bookService).add('description', `Books Rest APIs created by ${props.owner ?? 'anonymous'}`);
```
- **Uncomment** provision step for Book resource in [lib/services/books.ts](../lib/services/books.ts) (***line 111***).
```typescript
this.provisionBookResources(lambdaOptions, authorizer);
```
```bash
# Deploy Book Services with CDK
cdk deploy --profile ${AWS_USERNAME}
```
- Replace `<AWS_USERNAME>` with your AWS Username in [src/seeders/data-seeder.json](../src/seeders/data-seeder.json) (***line 2***).
```javascript
{
    "<AWS_USERNAME>Books":[ // => Replace <AWS_USERNAME> with your AWS Username
        ...
    ]
}
```
- Run Data Seeder for DynamoDB Books Table
```bash
aws dynamodb batch-write-item --profile ${AWS_USERNAME} --request-items file://./src/seeders/data-seeder.json
```
## Part 2: Book Review API Endpoints
![alt Module 1 - Part 1](./img/ws2_m1_p2.png)
- **Uncomment** provision step for Review resource in [lib/services/books.ts](../lib/services/books.ts) (***line 113***).
```typescript
this.provisionReviewResources(lambdaOptions, authorizer);
```
```bash
# Deploy Book Review API Services with CDK
cdk deploy --profile ${AWS_USERNAME}
```
