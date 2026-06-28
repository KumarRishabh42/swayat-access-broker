/**
 * Shared service vocabulary. BOTH the persona-ceiling derivation and the
 * per-task proposal are constrained to these service names + action verbs, so
 * the two independent LLM calls speak the same language and the deterministic
 * gate compares like-for-like. (The gate still enforces — this only aligns
 * naming, it doesn't relax policy.)
 */
export const SERVICE_VOCAB = `Use ONLY service names from this catalog (pick the closest match; never invent new service names):
- slack — team chat. actions: read_message, post_message. resources: channels like #accounting, #support, #engineering, #general
- gmail — email. actions: read, send
- github — source code. actions: read_repo, create_issue, merge_pr
- notion — docs/wiki. actions: read_page, write_page
- sap — finance / ERP system; THIS is where invoices, vendors, and payments live. actions: read_invoice, read_vendor, update_invoice_status, post_payment
- calendar — scheduling. actions: read_event, create_event
- drive — file storage. actions: read_file, write_file
- hubspot — CRM. actions: read_contact, update_contact`;
