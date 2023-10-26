# Workshop Environment Setup

## Prerequisites
- Launch devcontainer based `devcontainer.json` file. (If you VSCode then `'Ctrl + P (Win)'`/`'Cmd + P (MacOS)'`: > Reopen folder in Container).
- You can customize the IDE libraries, extensions, and settings in the `devcontainer.json` file.
- You can also customize the `Dockerfile` in the `.devcontainer` folder.

## Change Directory to 'workshop-2'
```bash
cd workshop-2
```

## Setup AWS CLI Profile
- Create a new AWS CLI profile (You can skip this step if you had configured a profile).
```bash
aws configure --profile <PROFILE_NAME>
```
- Test the configured profile with this command.
```bash
aws s3 ls --profile <PROFILE_NAME>
```

## Install Dependencies
```bash
# Install dependencies
npm install
```

## Initialize environment variables
- Create a `.env` file in the root of the project.
```bash
# Copy the .env.example file to .env
cp .env.example .env
```
- Update the `.env` file with the appropriate values.
- Expose the environment variables to the shell.
```bash
# Expose the environment variables to the shell
export $(grep -v '^#' .env | xargs)
```
## Repository Structure
```bash
|-- .devcontainer               # VSCode devcontainer configuration
|   |-- Dockerfile              # Dockerfile for devcontainer
|   |-- devcontainer.json       # VSCode devcontainer configuration
|-- workshop-2                  # Workshop 2 root folder
|   |-- README.md               # Workshop 2 README
|   |-- .env.example            # Environment variables example
|   |-- .env
|   |-- .gitignore
|   |-- cdk.json                # CDK configuration
|   |-- package.json            # NPM package configuration
|   |-- tsconfig.json           # Typescript configuration
|   |-- bin                     # CDK entrypoint
|   |-- cdk.outs                # CDK outputs
|   |-- docs                    # Workshop 2 documentation
|   |-- lib                     # CDK constructs
|   |   |-- services            # CDK constructs for services
|   |   |-- templates           # CDK constructs for templates
|   |   |-- main.ts             # CDK main stack construct    
|   |-- src                     # Source code
|   |   |-- books               # Books lambda functions
|   |   |-- reviews             # Reviews lambda functions
|   |   |-- requirements.txt    # Python dependencies
|   |-- test                    # Unit tests
```
