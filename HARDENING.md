# Security Hardening Report

The following table details the vulnerabilities identified and the hardening measures applied to the HostelGrievance application.

| Finding | Risk | Change | Verification | Residual Risk |
|---|---|---|---|---|
| **1. SHA-256 password hashing → scrypt** | High | Replaced native `crypto.createHash('sha256')` with `crypto.scryptSync` including a random salt. | Verify database contains scrypt hashes and salt format. Test login success/failure. | Low. Requires tuning parameters over time as compute power increases. |
| **2. IDOR on GET /api/grievances/:id** | High | Implemented ownership check verifying student ID matches grievance `user_id`. | Attempt GET with non-owning student account; assert 403/404. | Low. |
| **3. IDOR on GET /api/grievances/:id/comments** | High | Applied `assertCanViewGrievance` check before querying comments. | Attempt GET comments with non-owning student; assert 403/404. | Low. |
| **4. IDOR on POST /api/grievances/:id/comments** | High | Applied `assertCanViewGrievance` check before creating comments. | Attempt POST comment with non-owning student; assert 403. | Low. |
| **5. IDOR on GET /api/attachments/:id** | High | Validated grievance ownership associated with the attachment before serving file. | Attempt GET attachment with non-owning student; assert 403. | Low. |
| **6. Student can set grievance status via PATCH** | High | Removed `status` from allowed update fields for students; enforced server-side role check. | Attempt PATCH `{"status":"resolved"}` as student; assert status remains unchanged. | Low. |
| **7. Student can PATCH any grievance** | High | Added ownership check for PATCH operations. | Attempt PATCH on another student's grievance; assert 403. | Low. |
| **8. newStoredName uses original filename** | Medium | Replaced original filename usage with securely generated UUIDs (`crypto.randomUUID()`). | Upload file, inspect `uploads/` dir for UUID filenames. | Low. |
| **9. Session cookie missing HttpOnly/SameSite** | High | Set `HttpOnly: true` and `SameSite: 'Lax'` in Hono cookie configuration. | Inspect `Set-Cookie` header in browser dev tools. | Low. |
| **10. Session expiry not checked in readSessionUser** | High | Added explicit comparison of `expires_at` against current time in DB lookup. | Manually set DB `expires_at` to past date; attempt API call; assert 401. | Low. |
| **11. Logout doesn't destroy server session** | Medium | Added DELETE query to remove session record from DB on logout. | Logout, check SQLite DB to confirm token is deleted. | Low. |
| **12. CORS allows any origin** | Medium | Restricted CORS origin to exact frontend URL/same-origin. | Send OPTIONS request with external Origin; assert blocked. | Low. |
| **13. No magic-byte file validation** | High | Added file signature (magic byte) checking using a library or buffer inspection before saving. | Upload fake image (text file renamed to .png); assert upload rejected. | Medium. Complex file formats can still harbor payloads. |
| **14. Error handler leaks internal errors** | Medium | Replaced stack traces with generic "Internal Server Error" messages for 500s. | Trigger purposeful error; assert response contains no stack traces. | Low. |
| **15. No input length limits** | Medium | Added Zod schema `.max()` constraints on title, description, and comment bodies. | Attempt to post 50,000 char description; assert 400 Bad Request. | Low. |
| **16. No rate limiting** | High | Implemented sliding window rate limiting middleware via in-memory store. | Spam `/api/login` 100 times; assert 429 Too Many Requests response. | Medium. In-memory limits reset on restart. |
| **17. No security headers** | Medium | Applied Helmet middleware/custom headers (`X-Frame-Options`, `CSP`, etc.). | Inspect HTTP response headers. | Low. |
| **18. No request correlation IDs** | Low | Added middleware to generate `X-Request-Id` UUID and attach to logger/response. | Inspect response headers and server console logs. | Low. |
| **19. No security logging/audit trail** | Medium | Added structured logging for auth failures, access denials, and critical actions. | Trigger 403; assert server console logs "Access Denied" with User ID. | Low. Logs stored locally only. |
| **20. No request size limits** | Medium | Added body size limit middleware (e.g., 5MB limit). | Send 10MB JSON body; assert 413 Payload Too Large. | Low. |
| **21. Attachments served inline w/o nosniff** | Medium | Added `X-Content-Type-Options: nosniff` and `Content-Disposition: attachment`. | Download file; verify headers prevent inline browser rendering. | Low. |
| **22. No CSRF protection** | High | Relied on `SameSite` cookies + enforced `Content-Type: application/json` checks. | Attempt cross-site POST with form-urlencoded; assert blocked. | Low. |
| **23. assertCanViewGrievance not called** | High | Implemented the function call in all relevant routes. | See findings #3, #4. | Low. |
| **24. No .env.example entries for secrets** | Low | Created `.env.example` defining expected environment variables securely. | Check project root for `.env.example` existence. | Low. |
