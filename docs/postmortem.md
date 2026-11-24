# Postmortem: 50% of requests failing on myapp in dev

## Summary and impact
On November 24, 2026 at 16:21 UTC, a faulty version of myapp was deployed to the dev namespace.
It returned HTTP 500 on about half of the requests to every route except /health and /metrics.
The HighErrorRate alert fired 4 minutes later, the version was rolled back at 16:28, and the error
ratio was back to 0 at 16:35. Users of dev got errors for about 5 minutes, from 16:22:55 to the
rollback at 16:28:12. Staging and prod were not affected.

## Timeline (UTC)
| Time     | Event |
|----------|-------|
| 16:21:54 | Image myapp:bad3 deployed to dev with `kubectl set image` |
| 16:22:55 | Error ratio starts rising on the golden signals dashboard |
| 16:23:21 | HighErrorRate goes to Pending |
| 16:26:01 | HighErrorRate goes to Firing |
| 16:27:13 | Faulty version identified: the deployment runs myapp:bad3, an image not built by the CI, and the logs show 500s on /slow |
| 16:28:12 | Rollback with `kubectl rollout undo` |
| 16:34:58 | Error ratio back to 0 and alert resolved |

## Root cause and contributing factors
The image myapp:bad3 was built locally from code with a middleware that returns 500 for half of the
requests, except on /health and /metrics. It was deployed with kubectl directly, so it never went
through the CI pipeline, the tests or a review.

Contributing factors:
- The readiness and liveness probes only call /health, which kept answering 200. Kubernetes considered
  the new pods healthy and completed the rollout.
- Anyone with cluster access can change the dev image by hand, and nothing checks that the running
  image comes from our registry.
- No smoke test runs after a deployment, so nothing stopped the bad version before it received traffic.

## What went well / what went poorly
What went well:
- The dashboard showed the errors about one minute after the deployment, before the alert fired.
- Following the runbook (rollout history, current image, logs), we found the faulty version in about a minute.
- We rolled back first and looked at the cause afterwards, and the service recovered with no other change.

What went poorly:
- The alert waits for the error ratio to stay above 10% for 2 minutes, so it fired 4 minutes after the deployment.
- The dashboard uses a 5 minute window, so the error ratio took about 7 minutes to show 0 after the rollback,
  even though the fix worked immediately.
- Our first two runs of this exercise produced no alert at all. The test traffic went through a
  `kubectl port-forward`, which stopped when the pod was replaced, so the new version received no requests.
  The second run also reused the same image tag, so Kubernetes did not roll out anything.
  We have no alert for a drop in traffic, so a version that stops receiving requests goes unnoticed.

## Action items (owner, deadline)
| Action | Owner | Deadline |
|--------|-------|----------|
| Only allow images from ghcr.io built by the CI in dev, staging and prod (admission policy or CI-only deployments) | Nail | 2026-12-01 |
| Add a smoke test after each deployment that calls /slow and /error and rolls back if it gets 500s | Loriana | 2026-12-01 |
| Add an alert when the request rate of myapp drops close to 0 | Blaina | 2026-12-01 |
| Use a canary release for prod so a bad version first reaches only part of the traffic | Team | 2026-12-08 |