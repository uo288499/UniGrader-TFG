# UNIGRADER

[![CI for UniEval-TFG](https://github.com/uo288499/UniGrader-TFG/actions/workflows/release.yml/badge.svg)](https://github.com/uo288499/UniGrader-TFG/actions/workflows/release.yml)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=uo288499_UniGrader-TFG&metric=alert_status&token=494249d1d0d7c43be58f756cfbcdf998cb088d90)](https://sonarcloud.io/summary/new_code?id=uo288499_UniGrader-TFG)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=uo288499_UniGrader-TFG&metric=coverage&token=494249d1d0d7c43be58f756cfbcdf998cb088d90)](https://sonarcloud.io/summary/new_code?id=uo288499_UniGrader-TFG)

UniGrader is a web-based system for managing university evaluation processes. It allows defining evaluation systems, assigning weights, recording grades, and validating evaluation rules per course, subject, and academic year.

## Author

- **Daniel Fernández Cabrero** - UO288499@uniovi.es

## Architecture

UniGrader is designed as a microservices architecture with an API Gateway, supporting separation of concerns and independent service deployment, with independent databases. The main modules are:

- **Webapp** – Frontend developed in React, provides the user interface for interacting with services.

- **Gateway Service** – Handles routing, authentication, and communication between the WebApp and backend services.

- **Auth Service** – Manages users, email accounts, authentication, and verification.

- **Academic Service** – Stores academic information like universities, study programs, subjects, courses, groups, and enrollments.

- **Evaluation Service** – Manages evaluation systems, items, and policies per subject and group.

- **Grade Service** – Stores student grades and final grades, including sync and import operations.

- **Audit Service** – Planned service for logging modifications, centralizing audit information across services (not implemented yet).

Each service has its own database schema, and client communicates through the API Gateway, while services communicate directly with each other.

## Environment Variables

UniGrader uses .env files in some services. The main .env at root is used for tests and potential deployment, while service-specific .env files are used for local development (npm start).

Root .env example:

   ```properties
   CRYPT_SECRET=<secret_used_to_encrypt_password>
   JWT_SECRET=<secret_used_to_encrypt&sign_JWTs>
   ADMIN_PASS=<secret_used_for_global_admin_password>
   ADMIN_EMAIL=<secret_used_for_global_admin_email>
   EMAIL_PASSWORD=<secret_used_for_nodemailer>
   EMAIL_USER=<secret_used_for_nodemailer>
   CLOUD_NAME=<secret_used_for_cloudinary>
   API_KEY=<secret_used_for_cloudinary>
   API_SECRET=<secret_used_for_cloudinary>
   ```

Service-specific .env example (Academic Service):

   ```properties
   CLOUD_NAME=<secret_used_for_cloudinary>
   API_KEY=<secret_used_for_cloudinary>
   API_SECRET=<secret_used_for_cloudinary>
   ```


Service-specific .env example (Auth Service):

   ```properties
   ADMIN_PASS=<secret_used_for_global_admin_password>
   ADMIN_EMAIL=<secret_used_for_global_admin_email>
   EMAIL_PASSWORD=<secret_used_for_nodemailer>
   EMAIL_USER=<secret_used_for_nodemailer>
   CLOUD_NAME=<secret_used_for_cloudinary>
   API_KEY=<secret_used_for_cloudinary>
   API_SECRET=<secret_used_for_cloudinary>
   ```

## Quick Start

1. Clone the repository:

   ```sh
   git clone https://github.com/uo288499/UniGrader-TFG.git
   ```

2. Create the .env explained before.

3. Launch the application with **Docker Compose** or do a **component-by-component** start.
   - **Docker Compose**:
   ```sh
   docker compose --profile dev up --build
   ```
   - **Component-by-component**:
   ```sh
   docker run -d -p 27017:27017 --name=my-mongo mongo:latest # run Database, only once
   cd <service>
   npm i
   npm start 
   ```

## Testing & CI

UniGrader uses GitHub Actions for continuous integration:

- **Unit tests** - Each service runs tests with coverage.

- **End-to-end tests** - WebApp e2e tests after building.

- **SonarQube analysis** - Ensures code quality.

- **Docker image publishing** - Each service can be built and pushed to GHCR.

- **Deployment workflow** - Supports deployment over SSH using docker-compose.

The workflows are already defined in .github/workflows/release.yml for releases and .github/workflows/build.yml for pull requests. Due to porblems with Azure, deployment will not be done.