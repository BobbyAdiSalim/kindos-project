# Release Plan

**Release Name:** Release v1.2.0 – Sprint 4 CI/CD and Canary Delivery

## Release Objectives

- This release aims to establish a complete CI/CD pipeline that automatically validates code changes, produces a deployable Docker image, deploys a canary release, evaluates canary health, and promotes only healthy releases.

- Developers are able to run linting and unit tests automatically on pull requests and pushes to `main`.

- Developers are able to scan at least one service for vulnerabilities on pushes to `main` before release.

- Pushes to `main` are able to build a Docker image and push it to a registry using the latest tag so that CD can deploy a consistent artifact.

- The CD pipeline is able to deploy a canary version of the application using the image produced by CI.

- Automated canary analysis checks are able to validate the canary before promotion.

- The CD pipeline is able to promote a successful canary and stop on failure so that deployment decisions are safe and automated.

- The full CI/CD flow is validated end-to-end before submission.

- CI1.pdf and CD.pdf clearly document the implemented pipelines, failure evidence, deployment logic, and code locations so that the implementation can be verified.

## Specific Goals

### CI Workflow and Triggering

- Configure GitHub Actions workflows with the correct triggers for pull requests and pushes to `main`.

- Ensure linting and unit tests run automatically on pull requests.

- Ensure linting, unit tests, vulnerability scanning, and image building run automatically on pushes to `main`.

- Prevent deployment steps from running in pull request validation workflows.

### Code Quality and Test Automation

- Run a linter on both pull requests and pushes to `main`.

- Run unit tests automatically on both pull requests and pushes to `main`.

- Catch regressions before code reaches deployment.

- Provide clear CI job output so failures can be demonstrated and verified.

### Security Scanning and Artifact Production

- Scan at least one service for vulnerabilities on pushes to `main`.

- Build a Docker image on pushes to `main`.

- Push the image to a registry with the latest tag.

- Ensure CD consumes the same artifact built by CI rather than rebuilding separately.

### CI Efficiency and Industry Practice

- Run independent CI jobs in parallel where possible.

- Use caching appropriately to reduce unnecessary dependency installation time.

- Avoid inefficient practices that may lose marks, such as redundant installs or serialized independent jobs.

### Canary Deployment and Validation

- Deploy a canary version of the application through the CD pipeline using the image built by CI.

- Run automated canary analysis checks to determine whether the deployment is healthy.

- Stop the pipeline automatically when the canary fails validation.

- Promote the canary automatically when validation succeeds.

### Documentation and End-to-End Validation

- Produce CI1.pdf documenting CI workflow steps, evidence of failures, and code locations.

- Produce CD.pdf documenting the deployment platform, canary analysis approach, promotion strategy, and pipeline code locations.

- Validate the complete CI/CD pipeline from code change through deployment decision.

## Metrics for Measurement

### CI Workflow and Triggering

- 100% of pull requests to the target branch trigger linting and unit test jobs.

- 100% of pushes to `main` trigger linting, unit tests, vulnerability scanning, and image build jobs.

- 0 deployment jobs run during pull request validation workflows.

### Code Quality and Test Automation

- 100% of configured lint jobs complete automatically on pull requests and pushes to `main`.

- 100% of configured unit test jobs complete automatically on pull requests and pushes to `main`.

- CI failures are clearly visible in GitHub Actions logs and can be captured as evidence for documentation.

### Security Scanning and Artifact Production

- At least 1 service is scanned for vulnerabilities on every push to `main`.

- 100% of successful pushes to `main` produce a Docker image tagged with `latest` in the selected registry.

- 100% of CD runs use the artifact produced by CI.

### CI Efficiency and Industry Practice

- Independent CI jobs run in parallel wherever dependencies do not require serialization.

- Dependency caching is enabled where appropriate for repeated workflow runs.

- 0 marks are lost due to clearly inefficient CI practices such as unnecessary reinstallations or sequential independent tasks.

### Canary Deployment and Validation

- 100% of eligible release runs deploy a canary before any promotion step.

- 100% of canary deployments are evaluated by an automated validation step.

- 0 failed canaries are promoted.

- 100% of healthy canaries are promoted automatically by the pipeline.

### Documentation and End-to-End Validation

- CI1.pdf and CD.pdf are completed and include all required implementation details.

- 100% of required pipeline code locations referenced in the documentation are accurate.

- The complete CI/CD path is demonstrated successfully at least once before submission.

## Release Scope

### Included Features

#### CI Automation

- GitHub Actions CI workflow with correct triggers (SCRUM-52): The pipeline runs the correct jobs for pull requests and pushes to `main` under the right conditions.

- Linter on pull requests and pushes (SCRUM-53): Code quality issues are caught automatically before merge or release.

- Unit tests on pull requests and pushes to `main` (SCRUM-54): Regressions are detected before deployment.

- Vulnerability scan for at least one service on pushes to `main` (SCRUM-55): Insecure dependencies are checked before release.

- Docker image build and push on `main` (SCRUM-56): A consistent deployable artifact is created and pushed to a registry with the latest tag.

- Parallel CI jobs and caching (SCRUM-57): The pipeline follows efficient industry practice and reduces unnecessary runtime.

- CI1.pdf documentation (SCRUM-58): The CI implementation, failure evidence, and code locations are documented for verification.

#### CD Automation

- Canary deployment using CI-built image (SCRUM-59): The CD pipeline deploys a canary release using the artifact created by CI.

- Automated canary analysis (SCRUM-60): The canary is validated automatically before promotion.

- Automatic promotion on success and stop on failure (SCRUM-61): Deployment decisions are automated and safe.

- CD.pdf documentation (SCRUM-62): The deployment platform, canary analysis, promotion strategy, and code locations are documented for verification.

#### End-to-End Validation

- End-to-end validated CI/CD pipeline (SCRUM-63): The entire required delivery flow works together correctly before submission.

### Excluded Features

- Booking analytics dashboard (SCRUM-28)

  This story is unrelated to the Sprint 4 CI/CD delivery theme. It focuses on system analytics rather than pipeline automation, so it is excluded from this sprint.

- Full platform-wide automated testing beyond required unit tests

  This sprint focuses on linting, unit tests, vulnerability scanning, artifact building, and deployment validation. Broader integration and full end-to-end test suites can be expanded in a future sprint.

- Advanced image tagging strategy beyond the required latest tag

  This sprint prioritizes producing a consistent deployable artifact for CD. Additional versioning conventions such as semantic version tags, commit SHA tags, or multi-tag strategies are future improvements.

- Full production rollout strategies beyond canary validation and promotion

  This sprint focuses on canary deployment, automated validation, and promotion logic. Broader release management features can be addressed later.

## Bug Fixes

- [High Priority, SCRUM-52] CI workflow triggers were incomplete or incorrect.

  Now, pull requests and pushes to `main` run the correct GitHub Actions jobs under the appropriate conditions.

- [High Priority, SCRUM-53, SCRUM-54] Code quality and regression checks were not enforced automatically for all required events.

  Now, linting and unit tests run automatically on pull requests and pushes to `main`.

- [High Priority, SCRUM-55] Vulnerability checking was missing from the release path.

  Now, at least one service is scanned for vulnerabilities on pushes to `main`.

- [High Priority, SCRUM-56] The deployment pipeline did not consistently consume a CI-produced artifact.

  Now, pushes to `main` build and push a Docker image to a registry with the latest tag for CD use.

- [High Priority, SCRUM-59, SCRUM-60, SCRUM-61] Deployment validation and promotion were not automated safely.

  Now, the CD pipeline deploys a canary, evaluates it automatically, promotes healthy releases, and stops on failure.

## Non-Functional Requirements

### Performance and Efficiency

- Independent CI jobs should run in parallel whenever possible.

- Dependency caching should be used where appropriate to reduce repeated workflow runtime.

- The pipeline should avoid wasteful practices such as unnecessary reinstalls, copying dependency folders into images, or serializing unrelated jobs.

### Security

- Registry authentication and deployment credentials must be stored securely using repository or environment secrets.

- Vulnerability scanning must be included in the push-to-main release path.

- Unhealthy canary releases must never be promoted.

### Reliability

- Workflow triggers must behave consistently for pull requests and pushes to `main`.

- CI must produce a consistent deployable image artifact for CD.

- Canary validation must act as a release gate.

- The end-to-end CI/CD path must be demonstrated successfully before submission.

### Maintainability and Verifiability

- Workflow files should be clearly organized and easy to trace.

- CI1.pdf and CD.pdf must identify the relevant code locations used in the implementation.

- Failure evidence included in the documentation must be reproducible and understandable.

## Dependencies and Limitations

### Dependencies

- A GitHub repository with GitHub Actions enabled.

- A working Dockerfile and container build context for the selected service or services.

- Access to a container registry for image publication.

- A deployment target that supports canary-style rollout or an equivalent staged validation approach.

- Health checks or validation logic that can be used for automated canary analysis.

### Limitations

- This sprint guarantees required CI/CD functionality, but not a full enterprise-grade release platform.

- Vulnerability scanning only needs to cover at least one service, not necessarily every service in the repository.

- The artifact tagging requirement is centered on `latest`; richer tagging strategies are not required in this sprint.

- Canary analysis is limited to the checks implemented by the team and may not cover every real-world failure mode.

- The sprint focuses on pipeline correctness, verification, and marking requirements rather than analytics or unrelated product features.
