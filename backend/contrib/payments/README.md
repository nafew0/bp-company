# Archived bKash payment integration

`bkash_service.py` and `bkash_sns.py` were archived from the removed `subscriptions`
app when the SaaS subscription/payments surface was stripped from this template.
They are kept here for a future "booking deposits" feature.

## Important: NOT importable as-is

These modules are intentionally **not** part of a Python package (there is no
`__init__.py` here) and nothing in the project imports them. They will not work
without adaptation, because they still reference things that no longer exist:

- Models from the deleted `subscriptions` app (`BkashTransaction`, `Plan`,
  `UserSubscription`, `SubscriptionEvent`, ...).
- Services from the deleted app (e.g. `LicenseService`).
- Django settings that were removed from `bp_company/settings.py`:
  `BKASH_APP_KEY`, `BKASH_APP_SECRET`, `BKASH_USERNAME`, `BKASH_PASSWORD`,
  `BKASH_BASE_URL`, `BKASH_CALLBACK_TRUSTED_IPS`, `BKASH_WEBHOOK_TOPIC_ARN`,
  and `BKASH_WEBHOOK_URL`.
- The `cryptography` dependency (used by `bkash_sns.py` for SNS webhook
  signature verification), which may need to be re-added to `requirements.txt`.

## To reuse for booking deposits

1. Copy (or move) the relevant module(s) into a real app.
2. Replace subscription models/services with the booking-domain equivalents.
3. Re-introduce the `BKASH_*` settings and environment variables.
4. Re-add any missing dependencies and wire up URLs/views/tasks as needed.
