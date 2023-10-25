# Workshop Environment Setup

## Prerequisites
- Launch devcontainer based `devcontainer.json` file. (If you VSCode then `'Ctrl + P (Win)'`/`'Cmd + P (MacOS)'`: > Reopen folder in Container).
- You can customize the IDE libraries, extensions, and settings in the `devcontainer.json` file.
- You can also customize the `Dockerfile` in the `.devcontainer` folder.

## Setup AWS CLI Profile
- Create a new AWS CLI profile (You can skip this step if you had configured a profile).
```bash
aws configure --profile <PROFILE_NAME>
```
- Test the configured profile with this command.
```bash
aws s3 ls --profile <PROFILE_NAME>
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
# Notable folders and files in repository structure
|-- .devcontainer
|   |-- Dockerfile
|   |-- devcontainer.json
|-- workshop-2
|   |-- README.md
|   |-- .env.example
|   |-- .env
|   |-- .gitignore
|   |-- cdk.json
|   |-- package.json
|   |-- tsconfig.json
|   |-- bin
|   |-- cdk.outs
|   |-- docs
|   |-- lib
|   |   |-- services
|   |   |-- templates
|   |   |-- main.ts
|   |-- src
|   |   |-- books
|   |   |-- reviews
|   |   |-- requirements.txt
|   |-- test
|-- cdk.json
|-- package.json
|-- tsconfig.json
```
