# Runbook: HighErrorRate

## What the alert means
More than 10% of the HTTP requests to myapp returned a 5xx status during the last 2 minutes.
Users are getting errors right now.

## Symptoms
- HighErrorRate is FIRING in Prometheus (Alerts page).
- The "Error ratio" panel of the golden signals dashboard is above 10%.

## Quick checks
1. Was something deployed just before the alert? Compare the last revision with the time the errors started:
   `kubectl rollout history deployment/myapp -n dev`
2. Are the pods running, and are they restarting?
   `kubectl get pods -n dev`
3. Which route returns the errors? Run this query in Prometheus:
   `sum(rate(http_requests_total{status=~"5.."}[2m])) by (route)`
4. What do the error logs say? The app logs in JSON, so look for lines with `"level":"error"`:
   `kubectl logs deployment/myapp -n dev --tail=50`

## Mitigation
1. If a deployment happened right before the errors, roll it back before looking for the cause:
   `kubectl rollout undo deployment/myapp -n dev`
2. Watch the "Error ratio" panel. It should drop under 10% within a few minutes, and the alert should resolve.
3. If nothing was deployed and the pods look stuck, restart them:
   `kubectl rollout restart deployment/myapp -n dev`
4. If the errors continue, tell the rest of the team and keep a timeline with timestamps for the postmortem.