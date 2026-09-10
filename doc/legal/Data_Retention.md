# Data retention statement

**Default:** 90 days for organization AI events, alerts, and related findings, unless the customer configures a different `retention_days` value in Org Settings.

**Threat history:** retained under the same organizational retention intent; purge jobs should be scheduled in staging/production (Phase 7 ops).

**Extension local storage:** org/user tokens and dashboard URL remain on the device until the employee clears extension storage or uninstalls.

**Billing:** Stripe retains payment records per Stripe’s policies; CyberSentinel stores `stripe_customer_id` / `stripe_subscription_id` and plan status only.
