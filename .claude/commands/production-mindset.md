Apply this rule to every implementation decision in this project:

## Rule: Always implement for real-world production use

**Never implement a half-solution with the intention of improving it later.**

If something is worth doing, do it completely now. "We can improve this later" is how security holes, data loss bugs, and broken user experiences ship to production.

### What this means in practice

- If a feature has a known edge case, handle it — don't defer it.
- If a security mechanism has a known bypass, close it — don't document it as a future improvement.
- If an API contract implies certain behavior (e.g. logout should actually log the user out), fulfill the full contract.
- If an integration is partial, make it complete or don't ship it at all.

### When deferral is genuinely justified

Only defer work when there is a concrete, legitimate reason — such as:
- Requires an external dependency not yet available (e.g. a payment provider contract not signed)
- Requires a schema migration that needs coordinated deployment
- Requires significant infrastructure that is explicitly out of scope for the current milestone

**In those cases:**
1. Add a `TODO` comment in the code at the exact location where the work is needed
2. Update `docs/features.md` with a clearly marked "Pendente / TODO" note explaining what is missing and why it was deferred
3. Update `CLAUDE.md` under "Common Pitfalls" if the incomplete state could cause a future developer to make a wrong assumption

### Examples of what NOT to do

❌ "Logout only invalidates the access token — refresh token invalidation can be added later"
❌ "Pagination is not implemented yet, returns all records"
❌ "Validation is skipped for now, will add later"
❌ "Error handling to be improved in a future PR"

### When you catch yourself writing any of the above

Stop. Implement it correctly now.
