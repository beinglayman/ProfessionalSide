# InChronicle - Figma OAuth Integration Testing Instructions

## Test Credentials

**Application URL:** https://inchronicle.com (or https://ps-frontend-1758551070.azurewebsites.net)

**Test Account Credentials:**
- **Email:** `figma-test@inchronicle.com`
- **Password:** `FigmaTest2024!`

**Note:** If the above credentials don't work, please create a new account at https://inchronicle.com/register

---

## About InChronicle

InChronicle is a professional journaling platform that helps professionals track their career growth by automatically capturing work activities from various tools including Figma, GitHub, Jira, Microsoft Teams, and more.

**Privacy Focus:**
- All data is fetched on-demand only when users explicitly request it
- No data is persisted to our database
- All fetched data is stored in memory only and expires after 30 minutes
- Users have complete control over what data is fetched and when

---

## OAuth Integration Overview

### What InChronicle Accesses from Figma

**Scope Requested:** `files:read` (or modern scopes: `file_content:read file_metadata:read file_comments:read file_versions:read projects:read`)

**Data Accessed:**
- List of Figma files the user has access to
- File metadata (name, last modified date, version)
- File comments and annotations
- Project and team information
- File version history

**What We DO:**
- Fetch this data only when user clicks "Pull from Tools"
- Display it for user review and selection
- Use AI to generate journal entry suggestions
- Automatically expire all data after 30 minutes

**What We DON'T DO:**
- Store any Figma data in our database
- Share data with third parties
- Access data without explicit user action
- Persist OAuth tokens beyond refresh needs

---

## Testing Instructions

### Step 1: Create/Login to InChronicle Account

1. **Navigate to:** https://inchronicle.com
2. **Login** with the test credentials provided above
   - OR **Register** a new account if preferred
3. **Complete onboarding** (if new account):
   - Add professional information
   - Select skills and expertise
   - Skip optional steps if needed

### Step 2: Navigate to MCP Integrations

1. Once logged in, go to **Journal** section (left sidebar)
2. Click **"Create New Entry"** or **"New +"** button
3. In the entry creation dialog, look for **"Pull from Tools"** or **"MCP"** option
4. Click it to open the **MCP integration panel**

**Alternative path:**
1. Go to **Settings** → **Integrations**
2. Find **"MCP Tools"** or **"Connected Tools"** section
3. Look for the **Figma** integration

### Step 3: Connect Figma

1. In the MCP integrations list, locate **Figma**
2. Click **"Connect"** or **"Authorize"** button next to Figma
3. You will be redirected to Figma's OAuth authorization page

### Step 4: Figma OAuth Authorization (THIS IS WHAT YOU'RE TESTING)

1. **Figma Authorization Screen appears** showing:
   - InChronicle app name
   - Requested permissions/scopes
   - Your Figma account info

2. **Review the permissions requested:**
   - Read access to your files
   - Read file comments
   - Read file metadata
   - Access to projects and teams

3. **Click "Allow" or "Authorize"** to grant access

4. **You will be redirected back** to InChronicle
   - URL will be: `https://inchronicle.com/mcp/callback` (or similar)
   - Should see success message: "Figma connected successfully"

### Step 5: Verify Integration Works

1. **Return to Journal → Create Entry → Pull from Tools**
2. **Select Figma** from the list of tools
3. **Choose date range** (e.g., "Last 7 days" or "Today")
4. **Click "Pull Data"** or "Fetch Activities"

5. **Expected Result:**
   - Should see a loading indicator
   - After a few seconds, should see:
     - List of your recent Figma files
     - File comments you've made or received
     - Projects you've worked on
     - Activity grouped by categories

6. **AI-Generated Summary:**
   - Should see an AI-generated summary of your Figma activity
   - Suggested journal entry title
   - Skills detected from your design work
   - Option to select which activities to include

### Step 6: Disconnect (Optional Testing)

1. **Go to Settings → Integrations**
2. **Find Figma** in the connected tools list
3. **Click "Disconnect"**
4. **Confirm disconnection**
5. **Expected Result:**
   - Figma shows as "Not Connected"
   - OAuth token is deleted from our system
   - User can reconnect anytime by repeating Step 3

---

## OAuth Flow Details

### Authorization URL Format

```
https://www.figma.com/oauth?
  client_id=YOUR_CLIENT_ID
  &redirect_uri=https://ps-backend-1758551070.azurewebsites.net/api/v1/mcp/callback/figma
  &response_type=code
  &scope=files:read
  &state=BASE64_ENCODED_STATE
```

### Callback/Redirect URI

```
https://ps-backend-1758551070.azurewebsites.net/api/v1/mcp/callback/figma
```

**Production domains:**
- Backend: `ps-backend-1758551070.azurewebsites.net`
- Frontend: `ps-frontend-1758551070.azurewebsites.net` or `inchronicle.com`

**Note:** Both domains should be whitelisted in your Figma OAuth app configuration.

### Token Exchange

After user authorizes:
1. Figma redirects to our callback URL with authorization code
2. Our backend exchanges code for access token
3. Token is encrypted and stored securely
4. User is redirected back to frontend with success message

### Token Storage & Security

- **Access tokens** are encrypted using AES-256 encryption
- **Refresh tokens** are encrypted and used to maintain access
- **Tokens are stored** in our secure database (only tokens, not Figma data)
- **Tokens can be revoked** when user disconnects integration

---

## Privacy & Security Information

### Data Handling Policy

1. **No Data Persistence:**
   - Figma files, comments, and activities are NEVER stored in our database
   - All fetched data is kept in memory only
   - Data automatically expires after 30 minutes

2. **User Consent:**
   - Users must explicitly click "Pull Data" each time
   - No background data fetching
   - Clear privacy notices shown before each fetch

3. **Token Security:**
   - OAuth tokens encrypted at rest (AES-256)
   - Tokens only accessible by authenticated user
   - Tokens deleted immediately upon disconnection

4. **Audit Logging:**
   - We log ONLY metadata (timestamp, action type, success/failure)
   - We do NOT log actual Figma data
   - Users can view their audit history

### GDPR Compliance

- Users can delete all MCP data including tokens via Settings
- Data retention: 0 days for fetched data, tokens only
- Right to be forgotten: Full deletion of user account removes all tokens
- Data portability: Users can export their journal entries (not Figma data)

### Privacy Policy

Full privacy policy available at: https://inchronicle.com/privacy

---

## Troubleshooting Common Issues

### Issue 1: "Invalid scopes for app" Error

**Cause:** The scope `files:read` is not enabled in your Figma OAuth app configuration.

**Solution:**
1. Go to your Figma OAuth app settings
2. Enable the `files:read` scope (or modern granular scopes)
3. Save changes
4. Try authorization again

### Issue 2: Redirect URI Mismatch

**Cause:** The redirect URI in the authorization request doesn't match your app configuration.

**Solution:**
Ensure these redirect URIs are whitelisted in your Figma app:
- `https://ps-backend-1758551070.azurewebsites.net/api/v1/mcp/callback/figma`
- `http://localhost:3002/api/v1/mcp/callback/figma` (for development testing)

### Issue 3: No Figma Data Shows Up

**Possible causes:**
- No Figma activity in the selected date range
- User doesn't have access to any Figma files
- Network connectivity issues

**How to test:**
1. Ensure you have some Figma files in your account
2. Try selecting "All time" as date range
3. Check browser console for error messages

### Issue 4: Authorization Loop (Keeps Redirecting)

**Cause:** Cookie or session issues, state parameter mismatch.

**Solution:**
1. Clear browser cookies for inchronicle.com and figma.com
2. Try in incognito/private browsing mode
3. Check browser console for errors

---

## Expected User Experience

### First-Time Connection

1. **User sees:** List of available integrations including Figma
2. **User clicks:** "Connect Figma"
3. **User is redirected:** To Figma OAuth page
4. **User authorizes:** InChronicle access to their Figma files
5. **User is redirected back:** To InChronicle with success message
6. **Figma shows:** "Connected" status with timestamp

### Using the Integration

1. **User creates:** New journal entry
2. **User clicks:** "Pull from Tools"
3. **User selects:** Figma (and optionally other tools)
4. **User chooses:** Date range for activities
5. **User clicks:** "Pull Data"
6. **System fetches:** Recent Figma activity (2-5 seconds)
7. **User sees:** Organized list of files, comments, versions
8. **AI generates:** Summary and journal entry suggestions
9. **User reviews:** Selects which activities to include
10. **User clicks:** "Generate Entry"
11. **System creates:** Journal entry with selected Figma activities

### Time to Test

- **Initial connection:** ~30 seconds
- **Data fetch:** ~2-5 seconds (depending on amount of data)
- **AI processing:** ~3-5 seconds
- **Total end-to-end:** ~1 minute for first-time connection and first entry

---

## Screenshots (For Your Reference)

### 1. MCP Integration List
Users see list of all available tools including Figma with "Connect" button.

### 2. Figma OAuth Authorization Screen
Standard Figma OAuth page showing InChronicle app requesting permissions.

### 3. Connected Status
After authorization, Figma shows as "Connected" with green checkmark and timestamp.

### 4. Activity Selection
Users see fetched Figma activities organized by type (Files, Comments, Versions) with AI summary.

### 5. Journal Entry Preview
Generated journal entry incorporating Figma design work and contributions.

---

## Technical Specifications

### API Endpoints Used

**Figma API endpoints we call (after authorization):**
- `GET /v1/me` - Get user information
- `GET /v1/teams/:team_id/projects` - List team projects
- `GET /v1/projects/:project_id/files` - List project files
- `GET /v1/files/:file_key` - Get file details
- `GET /v1/files/:file_key/comments` - Get file comments
- `GET /v1/files/:file_key/versions` - Get file versions

### Rate Limiting

We respect Figma's rate limits:
- Maximum 2 requests per second per user
- Implement exponential backoff on rate limit errors
- Cache responses where appropriate to minimize API calls

### Error Handling

We handle all standard Figma API errors:
- 401 Unauthorized: Token expired or invalid → Prompt re-authorization
- 403 Forbidden: Insufficient permissions → Clear error message
- 404 Not Found: File/resource deleted → Skip and continue
- 429 Too Many Requests: Rate limited → Retry with backoff
- 500 Server Error: Figma API issue → Retry or show error message

---

## Support & Contact

**If you encounter any issues during testing:**

- **Email:** support@inchronicle.com
- **GitHub Issues:** (if applicable)
- **Documentation:** https://docs.inchronicle.com

**For Figma OAuth app review questions:**
Please reference this testing guide and let us know if you need:
- Different test credentials
- Additional configuration
- More detailed screenshots
- Video walkthrough

---

## Additional Information

### Compliance & Certifications

- **GDPR Compliant:** Full data protection and user rights
- **SOC 2 Type II:** (If applicable - update based on your status)
- **OAuth 2.0:** Standard implementation following RFC 6749
- **HTTPS Only:** All communications encrypted in transit

### Monitoring & Reliability

- **Uptime:** 99.9% SLA
- **Response Time:** < 200ms average API response
- **Error Rate:** < 0.1% of requests
- **Data Center:** Azure (US East region)

### User Base

- **Current Users:** (Update with actual numbers)
- **Active Integrations:** Supporting 7 tools (GitHub, Jira, Figma, Microsoft Teams, Outlook, Confluence, Slack)
- **Primary Use Case:** Professional journaling and career development tracking

---

## Thank You

Thank you for reviewing InChronicle's Figma OAuth integration. We're committed to providing a secure, privacy-focused experience that respects user data and follows best practices for OAuth implementations.

If you have any questions or need clarification on any aspect of our integration, please don't hesitate to reach out.

**Last Updated:** 2025-10-20
**Integration Version:** 1.0
**OAuth Scope:** `files:read` (deprecated) or modern granular scopes





InChronicle - Figma OAuth Integration Testing Instructions


Test Credentials

Application URL: https://inchronicle.com


Test Account Credentials:
Email: figma-test@inchronicle.com
Password: FigmaTest2024!

---


About InChronicle


InChronicle is a professional journaling platform that helps professionals track their career growth by automatically capturing work activities from various tools including Figma, GitHub, Jira, Microsoft Teams, and more.


Privacy Focus:

- All data is fetched on-demand only when users explicitly request it
- No data is persisted to our database
- All fetched data is stored in memory only and expires after 30 minutes
- Users have complete control over what data is fetched and when


---


OAuth Integration Overview


- What InChronicle Accesses from Figma


Scope Requested: `files:read` (or modern scopes: `file_content:read file_metadata:read file_comments:read file_versions:read projects:read`)


Data Accessed:
- List of Figma files the user has access to
- File metadata (name, last modified date, version)
- File comments and annotations
- Project and team information
- File version history


What We DO:
- Fetch this data only when user clicks "Pull from Tools"
- Display it for user review and selection
- Use AI to generate journal entry suggestions
- Automatically expire all data after 30 minutes


What We DON'T DO:
- Store any Figma data in our database
- Share data with third parties
- Access data without explicit user action
- Persist OAuth tokens beyond refresh needs


---


Testing Instructions


Step 1: Login to InChronicle Account


1. Navigate to: https://inchronicle.com
2. Login with the test credentials provided above
   - OR Register a new account if preferred


Step 2: Navigate to MCP Integrations


1. Once logged in, go to Settings → Integrations
2. Look for the Figma integration


Step 3: Connect Figma


1. Click "Connect" button next to Figma
2. You will be redirected to Figma's OAuth authorization page


Step 4: Figma OAuth Authorization (THIS IS WHAT YOU'RE TESTING)


1. Figma Authorization Screen appears showing:
   - InChronicle app name
   - Requested permissions/scopes
   - Your Figma account info


2. Review the permissions requested:
   - Read access to your files
   - Read file comments
   - Read file metadata
   - Access to projects and teams


3. Click "Allow access" to grant access


4. You will be redirected back to InChronicle
   - URL will be: `https://inchronicle.com/mcp/callback` (or similar)
   - Should see success message: "Figma connected successfully"


Step 5: Verify Integration Works


1. Go to Journal page  → Create New Entry (+ New entry button) → Pull from Tools
2. Select Figma from the list of tools
3. Choose date range (e.g., "Last 7 days" or "Today")
4. Click "Fetch Activities"


5. Expected Result:
   - Should see a loading indicator
   - After a few seconds, should see:
     - List of your recent Figma files
     - File comments you've made or received
     - Projects you've worked on
     - Activity grouped by categories


6. AI-Generated Summary:
   - Should see an AI-generated summary of your Figma activity
   - Suggested journal entry title
   - Skills detected from your design work
   - Option to select which activities to include


Step 6: Disconnect (Optional Testing)


1. Go to Settings → Integrations
2. Find Figma in the connected tools list
3. Click "Disconnect"
4. Confirm disconnection
5. Expected Result:
   - Figma shows as "Not Connected"
   - OAuth token is deleted from our system
   - User can reconnect anytime by repeating Step 3


---


OAuth Flow Details


Authorization URL Format - 
https://www.figma.com/oauth?
  client_id=YOUR_CLIENT_ID
  &redirect_uri=https://ps-backend-1758551070.azurewebsites.net/api/v1/mcp/callback/figma
  &response_type=code
  &scope=files:read
  &state=BASE64_ENCODED_STATE



Callback/Redirect URI - 
https://ps-backend-1758551070.azurewebsites.net/api/v1/mcp/callback/figma



Production domains -
- Backend: `ps-backend-1758551070.azurewebsites.net`
- Frontend: `ps-frontend-1758551070.azurewebsites.net` or `inchronicle.com`



Token Exchange


After user authorizes:
1. Figma redirects to our callback URL with authorization code
2. Our backend exchanges code for access token
3. Token is encrypted and stored securely
4. User is redirected back to frontend with success message


Token Storage & Security


- Access tokens are encrypted using AES-256 encryption
- Refresh tokens are encrypted and used to maintain access
- Tokens are stored in our secure database (only tokens, not Figma data)
- Tokens can be revoked when user disconnects integration


---


Privacy & Security Information


Data Handling Policy


1. No Data Persistence:
   - Figma files, comments, and activities are NEVER stored in our database
   - All fetched data is kept in memory only
   - Data automatically expires after 30 minutes


2. User Consent:
   - Users must explicitly click "Pull Data" each time
   - No background data fetching
   - Clear privacy notices shown before each fetch


3. Token Security:
   - OAuth tokens encrypted at rest (AES-256)
   - Tokens only accessible by authenticated user
   - Tokens deleted immediately upon disconnection


4. Audit Logging:
   - We log ONLY metadata (timestamp, action type, success/failure)
   - We do NOT log actual Figma data
   - Users can view their audit history


GDPR Compliance


- Users can delete all MCP data including tokens via Settings
- Data retention: 0 days for fetched data, tokens only
- Right to be forgotten: Full deletion of user account removes all tokens
- Data portability: Users can export their journal entries (not Figma data)


Privacy Policy


Full privacy policy available at: https://inchronicle.com/privacy


---

Thank You


Thank you for reviewing InChronicle's Figma OAuth integration. We're committed to providing a secure, privacy-focused experience that respects user data and follows best practices for OAuth implementations.


If you have any questions or need clarification on any aspect of our integration, please don't hesitate to reach out at honey@inchronicle.com

Thanks,

Honey Arora
Co-founder, InChronicle