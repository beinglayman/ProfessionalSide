# InChronicle - Secure Software Development Lifecycle (SSDLC)

**Version:** 1.0 | **Date:** November 2025 | **Application:** InChronicle Professional Journaling Platform

---

## Overview

InChronicle implements comprehensive security controls across development, deployment, and operations, following defense-in-depth, least privilege, and privacy-by-design principles.

---

## Technology Stack & Security Controls

### Frontend Security
**Technologies:** React 18, TypeScript (strict mode), Vite, TailwindCSS, Radix UI, TanStack React Query, Axios
- TypeScript strict mode prevents type vulnerabilities
- Input validation on all forms with Zod schemas
- HTTPS/TLS 1.2+ for all API communication
- Secure token storage (localStorage with HTTP-only cookies for refresh tokens)

### Backend Security
**Technologies:** Node.js, Express.js, TypeScript, Prisma ORM, PostgreSQL, JWT, bcrypt
- **Authentication:** JWT access tokens (15-min expiry) + refresh tokens (7-day expiry with rotation)
- **Password Hashing:** bcrypt with 12 salt rounds, never stored in plain text
- **SQL Injection Prevention:** Prisma ORM with parameterized queries, no raw SQL
- **Input Validation:** Zod schema validation on all API endpoints
- **Authorization:** Role-based access control with resource ownership validation

### Infrastructure Security
**Platform:** Azure App Service, Azure Container Registry, Azure Flexible Server (PostgreSQL), Azure Files
- Network isolation with firewall rules and VNet integration
- Automated security patches and DDoS protection
- SSL/TLS enforced for database connections
- Container images: Alpine Linux base, non-root user execution
- Managed identities for Azure resource authentication

---

## Data Protection

### Encryption at Rest
**OAuth Tokens:** AES-256-CBC encryption before database storage
```typescript
// All OAuth tokens (Zoom, Google, GitHub, Microsoft, etc.) encrypted
const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
```
**Database:** PostgreSQL with Azure-managed encryption, encrypted backups, point-in-time restore

### Encryption in Transit
- All API communication over HTTPS with TLS 1.2+
- Azure App Service managed certificates with HSTS headers
- Database connections require SSL (`sslmode=require`)

### Data Retention & Privacy
- **External API data:** Not persisted to database, memory-only sessions with 30-minute auto-expiration
- **OAuth tokens:** Encrypted in database, automatic refresh mechanism
- **User data deletion:** Complete data purging on account closure
- **GDPR compliance:** User data export, deletion rights, clear consent mechanisms

---

## API Security & Access Control

### Rate Limiting
- 100 requests per 15 minutes per IP address
- Applied to all `/api/` endpoints

### CORS Configuration
- Whitelisted origins only: `inchronicle.com`, Azure production URLs
- Development environment isolated with separate origin

### Security Headers (Helmet.js)
- Content Security Policy (CSP) with strict directives
- HSTS with 1-year max-age and subdomain inclusion
- XSS protection, frame denial, content-type sniffing prevention

### Request Validation Pipeline
```typescript
router.post('/endpoint',
  authenticate,              // JWT validation
  validateRequest(schema),   // Zod input validation
  authorize(['permission']), // Permission check
  controller.method
);
```

---

## Third-Party Integration Security

### OAuth 2.0 Implementation
**Integrated Services:** Zoom (User-Managed OAuth), Google Workspace, GitHub, Microsoft 365, Atlassian (Jira, Confluence), Slack, Figma

**Security Features:**
- PKCE (Proof Key for Code Exchange) where supported
- State parameter for CSRF protection
- Minimal scope requests (least privilege principle)
- Token encryption (AES-256) before storage
- Automatic token refresh with secure rotation

### API Key Management
- Stored in Azure Key Vault via App Settings
- Never exposed in client-side code
- 90-day rotation policy
- Separate keys for dev/staging/production

---

## CI/CD Pipeline Security

### GitHub Actions Workflows
- Secrets stored in GitHub Secrets (never in code)
- Azure OIDC authentication (no service principal keys)
- Branch protection rules on main branch
- Required code reviews before merge
- Automated security scanning

### Dependency Management
- Weekly automated scans via npm audit and Dependabot
- Critical vulnerabilities patched within 24 hours
- High vulnerabilities within 7 days
- PR creation for vulnerable packages

### Container Registry
- Azure Container Registry (ACR) private registry
- Managed identity authentication
- Automated vulnerability scanning
- Role-based access control

---

## Vulnerability Management

### Scanning & Testing
- **Static Analysis:** TypeScript strict checks, ESLint with security plugins
- **Dependency Scanning:** npm audit, Dependabot, Azure Security Center
- **Security Testing:** Unit tests for encryption/validation, integration tests for auth flows
- **Incident Response:** 48-hour response time, severity-based patching schedule

### Vulnerability Disclosure
**Contact:** security@inchronicle.com | **Response:** Within 48 hours | **Severity-based deployment:** Critical (immediate), High (7 days), Medium/Low (next sprint)

---

## OWASP Top 10 Compliance

| Risk | Mitigation |
|------|------------|
| **Broken Access Control** | JWT auth, RBAC, resource ownership validation |
| **Cryptographic Failures** | AES-256, bcrypt (12 rounds), TLS 1.2+, secure key management |
| **Injection** | Prisma ORM parameterized queries, Zod validation, no raw SQL |
| **Insecure Design** | Threat modeling, defense in depth, security in design phase |
| **Security Misconfiguration** | Helmet.js headers, CORS restrictions, env-based configs |
| **Vulnerable Components** | npm audit, Dependabot, regular updates |
| **Authentication Failures** | JWT refresh tokens, bcrypt, account lockout (5 attempts) |
| **Data Integrity Failures** | Webhook signature verification, checksum validation |
| **Logging & Monitoring** | Azure Application Insights, structured logging, audit trails |
| **SSRF** | URL validation, allowlists, no user-controlled URLs |

---

## GDPR Compliance

**User Rights:** Data export API, account deletion with purging, profile editing, data portability (JSON export)

**Data Minimization:** Only necessary data collected, external API data not persisted, session-based temporary storage (30-min expiry)

**Transparency:** Privacy policy at `/privacy`, Microsoft Clarity analytics disclosed, OAuth permission explanations, user consent for processing

---

## Code References & Verification

**Authentication:** `backend/src/middleware/auth.middleware.ts`, `backend/src/services/auth.service.ts`
**Encryption:** `backend/src/services/mcp/mcp-session.service.ts` (AES-256), `backend/src/services/mcp/mcp-oauth.service.ts` (OAuth)
**Input Validation:** `backend/src/routes/*.routes.ts` (Zod schemas)
**Infrastructure:** `backend/Dockerfile`, `.github/workflows/deploy-backend.yml`, `infra/azure-provision.sh`
**Security Config:** `backend/src/server.ts` (CORS, Helmet), `backend/prisma/schema.prisma`

---

## Recent Security Improvements (2025)

**November:** AES-256 OAuth token encryption, Zoom/Google Workspace integrations, TypeScript strict mode, Azure managed identities, enhanced Zod validation

**October:** Azure migration with managed security, JWT refresh token rotation, API rate limiting, environment-specific CORS

**September:** Prisma ORM implementation, bcrypt password hashing (12 rounds), HTTPS/TLS 1.2+ enforcement

---

**Security Contact:** security@inchronicle.com | **Response Time:** 48 hours | **Review Cycle:** Quarterly | **Next Review:** February 2026
