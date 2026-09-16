# Threat Model

## 1. System Overview
HostelGrievance is a monolithic Node.js (Hono) web service backed by a SQLite database and local file storage, serving a Svelte 5 Single Page Application (SPA). It allows students to log grievances regarding their hostel accommodations and wardens to track and resolve them.

## 2. Assets
- **Student Info**: Usernames, roles, and hashed passwords.
- **Grievances**: Titles, descriptions, statuses, and categories of complaints.
- **Comments**: Communication between students and wardens.
- **Attachments**: Images or documents uploaded as evidence for grievances.
- **Credentials**: Hashed passwords (scrypt).
- **Sessions**: Active session tokens stored in the database.
- **Database**: The SQLite `.db` file containing all application data.
- **Filesystem**: The `uploads/` directory containing user-generated files.
- **Security Logs**: Audit trails of user actions and system errors.
- **Secrets**: Environment variables (e.g., session signing secrets, database paths).

## 3. Actors
- **Unauthenticated Attacker**: Anonymous internet user with no credentials.
- **Student**: Authenticated user with the `student` role.
- **Warden**: Authenticated user with the `warden` role (privileged).
- **Compromised Student Account**: An attacker who has obtained a student's credentials.
- **Compromised Warden Account**: An attacker who has obtained a warden's credentials.

## 4. Trust Boundaries
- **Client ↔ Server**: The boundary between the untrusted web browser and the Node.js API server. All input across this boundary is untrusted.
- **Server ↔ Database**: The boundary between the Node.js application and the SQLite database. Trusted, but must be protected against injection.
- **Server ↔ Filesystem**: The boundary between the application and the local disk. Uploads must be strictly controlled.

## 5. Attack Surface
- **Authentication Endpoints**: `/api/login`, `/api/logout`.
- **Grievance API**: `/api/grievances` (GET, POST, PATCH).
- **Comments API**: `/api/grievances/:id/comments` (GET, POST).
- **Attachments API**: `/api/attachments/:id` (GET), multipart file uploads on grievance creation.
- **Session Cookie**: `hg_session` cookie transmission.

## 6. Threat Scenarios & Attack Paths
| Threat | Actor | Attack Path |
|---|---|---|
| **Data Exposure (IDOR)** | Student | Modifies the `:id` parameter in `/api/grievances/:id` to view another student's grievance. |
| **Data Tampering (IDOR)** | Student | Modifies the `:id` parameter to patch or comment on another student's grievance. |
| **Privilege Escalation** | Student | Sends a PATCH request to modify their own grievance status to `resolved` without warden approval. |
| **Malicious File Execution** | Student | Uploads a `.html` file with XSS payload, tricking a warden into viewing it inline. |
| **Path Traversal / Overwrite** | Student | Manipulates file upload names to overwrite system files or executable scripts. |
| **Session Hijacking** | Unauth Attacker | Steals `hg_session` cookie via XSS because `HttpOnly` was missing. |
| **Brute Force / Cred Stuffing** | Unauth Attacker | Repeatedly attempts logins against `/api/login` without rate limits. |
| **Denial of Service (DoS)** | Unauth / Student | Sends massive JSON payloads or large files to exhaust server memory and disk space. |

## 7. Mitigations Implemented
- **Authorization Checks**: Every endpoint accessing a specific resource verifies ownership (Student) or role (Warden).
- **Input Validation**: Schemas enforce types, lengths, and allowed fields (e.g., ignoring `status` if provided by a Student).
- **File Restrictions**: Random UUID filenames, magic-byte validation, and `nosniff`/attachment headers.
- **Secure Sessions**: `HttpOnly`, `SameSite` cookies with enforced server-side expiration and explicit destruction on logout.
- **Rate & Size Limits**: Global limits on request body sizes and rate limiters on sensitive routes.
- **Error Handling**: Masking internal stack traces from API responses.

## 8. Blast Radius Analysis
- **Compromised Student**: Attacker can view and comment on that specific student's grievances and upload files on their behalf. Cannot view other students' data or approve grievances.
- **Compromised Warden**: **High Impact**. Attacker can view all grievances, student data, and attachments. Can alter the status of any grievance.
- **Malicious Upload**: Confined to the `uploads/` directory. If a warden downloads it, the warden's local machine could be compromised (client-side execution), but the server remains intact.

## 9. Residual Risks
- Warden accounts are highly privileged; compromise is catastrophic to confidentiality.
- Reliance on SQLite means a severe file inclusion or path traversal vulnerability could lead to total database theft.
