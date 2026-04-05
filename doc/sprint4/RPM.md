# Release Plan

**Release Name:** Release v1.2.0

### Release Objectives

- This release aims to set up a complete CI/CD workflow for the project so that code is automatically checked, scanned, built, deployed as a canary, and only promoted if the canary passes.

- Developers are able to run linting and unit tests automatically on pull requests and pushes to `main`.

- Developers are able to scan at least one service for vulnerabilities on pushes to `main`.

- Pushes to `main` are able to build a Docker image and push it to a registry with the `latest` tag.

- The CD pipeline is able to deploy a canary version of the application using the image built by CI.

- The system is able to automatically check whether the canary deployment is healthy before promotion.

- The CD pipeline is able to promote a successful canary and stop when the canary fails.

- The full CI/CD pipeline is validated end-to-end before submission.

- CI1.pdf and CD.pdf clearly explain the implementation, failure evidence, deployment steps, and code locations so that the instructor can verify the work.

### Specific Goals

#### CI Workflow and Triggers

- Set up GitHub Actions workflows with the correct triggers for pull requests and pushes to `main`.

- Make sure linting and unit tests run automatically on pull requests.

- Make sure linting, unit tests, vulnerability scanning, and image building run automatically on pushes to `main`.

- Make sure deployment steps do not run during pull request checks.

#### Linting and Unit Testing

- Run a linter on pushes and pull requests.

- Run unit tests automatically on pull requests and pushes to `main`.

- Catch regressions before code is deployed.

- Make failures easy to see in GitHub Actions logs for documentation.

#### Security Scanning and Image Build

- Scan at least one service for vulnerabilities on pushes to `main`.

- Build a Docker image on pushes to `main`.

- Push the Docker image to a registry using the `latest` tag.

- Make sure CD uses the image built by CI.

#### CI Efficiency

- Run independent CI jobs in parallel where possible.

- Use caching where appropriate to reduce repeated install time.

- Avoid inefficient pipeline practices that could lose marks.

#### Canary Deployment and Promotion

- Deploy a canary version of the application through the CD pipeline.

- Run automated checks on the canary deployment.

- Stop the pipeline automatically if the canary fails.

- Promote the canary automatically if the checks pass.

#### Documentation and Validation

- Create CI1.pdf to explain CI pipeline steps, evidence of failures, and code locations.

- Create CD.pdf to explain the deployment platform, canary analysis, promotion strategy, and code locations.

- Validate that the full CI/CD pipeline works together correctly.

## Metrics for Measurement

### CI Workflow and Triggers

- 100% of pull requests trigger linting and unit test jobs.

- 100% of pushes to `main` trigger linting, unit tests, vulnerability scanning, and image build jobs.

- 0 deployment jobs run during pull request validation.

### Linting and Unit Testing

- 100% of configured lint jobs run automatically on pull requests and pushes to `main`.

- 100% of configured unit tests run automatically on pull requests and pushes to `main`.

- CI failures are visible in GitHub Actions logs and can be used as evidence in documentation.

### Security Scanning and Image Build

- At least 1 service is scanned for vulnerabilities on every push to `main`.

- 100% of successful pushes to `main` produce a Docker image tagged with `latest`.

- 100% of CD runs use the image built by CI.

### CI Efficiency

- Independent CI jobs run in parallel where possible.

- Dependency caching is enabled where appropriate.

- 0 marks are lost because of clearly inefficient CI pipeline practices.

### Canary Deployment and Promotion

- 100% of release runs deploy a canary before promotion.

- 100% of canary deployments are checked automatically before promotion.

- 0 failed canaries are promoted.

- 100% of successful canaries are promoted automatically.

### Documentation and Validation

- CI1.pdf and CD.pdf are completed with all required implementation details.

- 100% of referenced code locations in the documentation are correct.

- The complete CI/CD flow is demonstrated successfully before submission.

## Release Scope

Outline what is included in and excluded from the release, detailing key features or improvements, non-functional requirements, etc.

### Included Features

#### CI Pipeline Features

- Correct GitHub Actions triggers for pull requests and pushes to `main` (SCRUM-52): The CI workflow runs the right jobs under the right conditions.

- Linter on pushes and pull requests (SCRUM-53): Code quality problems are caught automatically.

- Unit tests on pull requests and pushes to `main` (SCRUM-54): Regressions are caught before deployment.

- Vulnerability scan for at least one service on pushes to `main` (SCRUM-55): Insecure dependencies are checked before release.

- Docker image build and push on `main` (SCRUM-56): A consistent deployable artifact is built and pushed to a registry with the `latest` tag.

- Parallel CI jobs and caching (SCRUM-57): The pipeline follows efficient industry practice and avoids losing marks.

- CI1.pdf documentation (SCRUM-58): The CI implementation, failure evidence, and code locations are documented for verification.

#### CD Pipeline Features

- Canary deployment using the image built by CI (SCRUM-59): The CD pipeline deploys a canary version of the application using the CI-built artifact.

- Automated canary analysis (SCRUM-60): The canary deployment is checked automatically before promotion.

- Automatic promotion on success and stop on failure (SCRUM-61): The pipeline promotes healthy canaries and stops when checks fail.

- CD.pdf documentation (SCRUM-62): The deployment platform, canary analysis, promotion strategy, and code locations are documented for verification.

#### End-to-End Validation

- End-to-end validated CI/CD pipeline (SCRUM-63): All required stages of the pipeline work together correctly before submission.

### Excluded Features

- Booking analytics dashboard (SCRUM-28)

This feature is not related to the Sprint 4 CI/CD work. It focuses on platform analytics rather than pipeline implementation, so it is planned for a future release.

- Full test coverage across the whole platform

This release focuses on linting, unit tests, security scanning, image building, canary deployment, and promotion. Broader automated testing can be added in a future release.

- Advanced image versioning beyond the `latest` tag

This release focuses on meeting the required artifact build and deploy flow. Additional tagging strategies can be added later.

- Full production rollout strategies beyond canary deployment and promotion

This release focuses on canary deployment, automated checks, and promotion logic only.

## Non-Functional Requirements

### Performance

- Independent CI jobs should run in parallel where possible.

- Dependency caching should be used where appropriate to reduce repeated install time.

- The pipeline should avoid inefficient practices such as unnecessary reinstalls, copying dependency folders into Docker images, or running independent tasks one after another.

### Security

- Registry credentials and deployment secrets must be stored securely.

- Vulnerability scanning must be included on pushes to `main`.

- Failed canary deployments must never be promoted.

### Reliability

- Workflow triggers must behave correctly for both pull requests and pushes to `main`.

- CI must build a consistent deployable image for CD.

- Canary analysis must act as a release gate before promotion.

- The full CI/CD flow must be shown working before submission.

### Usability and Maintainability

- Workflow files should be clear and organized.

- CI1.pdf and CD.pdf should clearly show the code locations used in the implementation.

- Failure evidence in the documentation should be easy to understand and verify.

## Dependencies and Limitations

### Dependencies

- A GitHub repository with GitHub Actions enabled.

- A working Dockerfile and build context for the selected service.

- Access to a container registry for pushing the built image.

- A deployment environment that supports canary deployment or an equivalent staged deployment method.

- Health checks or validation logic for automated canary analysis.

### Limitations

- This release focuses on the required CI/CD implementation and not a fully production-ready deployment platform.

- Vulnerability scanning only needs to cover at least one service, not every service in the repository.

- The image tagging requirement is limited to the `latest` tag.

- Canary analysis only checks the conditions implemented by the team and may not catch every possible failure case.

- This release focuses on pipeline correctness, validation, and documentation rather than unrelated platform features.
