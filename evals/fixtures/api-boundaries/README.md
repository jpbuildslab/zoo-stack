# Synthetic dispatch acknowledgements

`confirmDispatch` takes a transport function for one known operation. The transport returns an HTTP
status and an untrusted body. A 2xx response confirms only a body with the same operation ID and a
nonempty string receipt ID. A 422 explicitly rejects only when the body has the same operation ID
and code `not_applied`. A failed transport, any other response, or malformed acknowledgement leaves
the outcome uncertain. Return the original operation ID in every outcome so the caller can reconcile it.

`canDiscard` decides whether a stored receipt may be removed. A completed receipt must remain
available through 72 hours after completion, including the exact cutoff. At a later instant it is
eligible for removal. Pending and uncertain receipts must remain available until reconciled, even
when older than 72 hours. Times are finite UTC epoch milliseconds supplied by the caller. The two
modules are independent of storage and perform no effects on their own.
