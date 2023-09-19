# Welcome to Containerization AWS Workshop

## Module 1 - Beanstalk Platform
```bash
cd src/store
zip ../artifacts/source.zip -r * .[^.]*
```

```bash
php artisan key:generate --show
```

```bash
cdk synth beanstalk --profile <AWS_USERNAME>
```

```bash
cdk deploy beanstalk --profile <AWS_USERNAME>
```

```bash
cdk destroy beanstalk --profile <AWS_USERNAME>
```
