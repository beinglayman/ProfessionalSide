# How to Create the Figma Test User

## Recommended Approach: Manual Registration

### Step 1: Register the Test Account

1. **Open InChronicle** in incognito/private browser window
   - Production: https://inchronicle.com/register
   - Or: https://ps-frontend-1758551070.azurewebsites.net/register

2. **Fill in registration form:**
   ```
   Email: figma-test@inchronicle.com
   Password: FigmaTest2024!
   Name: Figma Test User
   ```

3. **Complete email verification** (if required)

4. **Complete onboarding flow** with minimal data:
   - **Professional Info:**
     - Job Title: Product Designer
     - Company: InChronicle (or Test Company)
     - Industry: Technology

   - **Skills:** Select any 3-5 design-related skills:
     - UI/UX Design
     - Figma
     - Product Design
     - Prototyping
     - User Research

   - **Work Experience:** Skip or add minimal entry
   - **Education:** Skip or add minimal entry
   - **Goals:** Skip
   - **Bio:** "Test account for Figma OAuth integration review"

5. **Save the credentials** securely

### Step 2: Test the Account

1. **Log out** and **log back in** with test credentials to verify:
   ```
   Email: figma-test@inchronicle.com
   Password: FigmaTest2024!
   ```

2. **Verify access** to all features:
   - Dashboard loads
   - Can navigate to Journal
   - Can open "Create Entry"
   - Can see "Pull from Tools" option

### Step 3: Connect Figma (Optional Pre-Testing)

If you want to pre-connect Figma before sharing with reviewers:

1. **Navigate to:** Journal → Create Entry → Pull from Tools
2. **Find Figma** in the integrations list
3. **Click "Connect"**
4. **Authorize** with YOUR Figma account (or test Figma account)
5. **Verify** the connection works
6. **Disconnect** before sharing (so reviewers can test the full flow)

---

## Alternative: Create via Database (Advanced)

If you need to create the user programmatically:

### Prerequisites
- Access to production database
- Prisma CLI installed
- Database connection string

### Script to Create User

```typescript
// create-test-user.ts
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createTestUser() {
  const email = 'figma-test@inchronicle.com';
  const password = 'FigmaTest2024!';
  const name = 'Figma Test User';

  // Check if user already exists
  const existing = await prisma.user.findUnique({
    where: { email }
  });

  if (existing) {
    console.log('Test user already exists!');
    return existing;
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create user
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
      emailVerified: new Date(), // Mark as verified
      profile: {
        create: {
          bio: 'Test account for Figma OAuth integration review',
          jobTitle: 'Product Designer',
          company: 'InChronicle',
          industry: 'Technology'
        }
      }
    },
    include: {
      profile: true
    }
  });

  console.log('✅ Test user created successfully!');
  console.log('Email:', email);
  console.log('Password:', password);
  console.log('User ID:', user.id);

  return user;
}

createTestUser()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

### To Run the Script:

```bash
cd backend
npx tsx create-test-user.ts
```

---

## Security Considerations

### Password Security

The test password `FigmaTest2024!` is:
- ✅ Strong enough for a test account
- ✅ Easy to communicate securely
- ✅ Not used for any other accounts
- ⚠️ Should be changed after Figma review if account is kept

### After Figma Review

**Option 1: Delete the test account**
```sql
DELETE FROM "User" WHERE email = 'figma-test@inchronicle.com';
```

**Option 2: Change the password**
1. Log in as admin
2. Reset password for figma-test@inchronicle.com
3. Use a randomly generated secure password

**Option 3: Convert to demo account**
- Keep for future demos
- Change password to more secure one
- Add sample journal entries
- Mark as "demo" in profile

---

## Sharing Credentials with Figma

### Secure Transmission Methods

**Option 1: Through Figma's OAuth App Submission Form**
- Most OAuth app submission forms have a "Test Credentials" field
- Paste the credentials there
- They're typically encrypted/secured by the platform

**Option 2: Via Encrypted Email**
- Use password-protected PDF
- Share password via separate channel (SMS, Slack, etc.)

**Option 3: Via Password Manager Share**
- Use 1Password, LastPass, or Bitwarden shared vault
- Share access to specific credential

**Option 4: Temporary Secure Note**
- Use services like https://privatebin.info (self-destructing notes)
- Share link via email
- Note auto-deletes after viewing

### What to Include

When sharing, provide:
1. **Credentials:**
   ```
   URL: https://inchronicle.com
   Email: figma-test@inchronicle.com
   Password: FigmaTest2024!
   ```

2. **Testing Instructions:** Link to FIGMA_OAUTH_TESTING_INSTRUCTIONS.md

3. **Timeline:** "These credentials are valid until [DATE]"

4. **Contact:** "For issues, contact: your-email@inchronicle.com"

---

## Checklist Before Sharing

Before sending credentials to Figma reviewers, verify:

- [ ] Test account is created and email verified
- [ ] Can log in with provided credentials
- [ ] Onboarding is complete (so reviewers don't have to do it)
- [ ] Account has access to MCP integrations page
- [ ] Figma shows in the integrations list
- [ ] "Connect Figma" button is visible and functional
- [ ] Privacy policy link is accessible
- [ ] Testing instructions document is complete
- [ ] Redirect URIs are properly configured in Figma OAuth app
- [ ] Backend OAuth callback endpoint is working
- [ ] HTTPS is enabled on all domains

---

## Test Account Maintenance

### Regular Checks (While Under Review)

**Daily:**
- Verify account is still accessible
- Check that no one has changed password
- Monitor for any security alerts

**After Review:**
- Delete or secure the account
- Review audit logs for any suspicious activity
- Update credentials if keeping account

---

## Troubleshooting

### Issue: Email Already Exists

**Solution:** Use a variation:
- `figma-test-01@inchronicle.com`
- `figma-reviewer@inchronicle.com`
- `demo@inchronicle.com`

### Issue: Email Verification Required

**Solution:**
1. Check backend logs for verification email
2. Manually mark email as verified in database:
   ```sql
   UPDATE "User"
   SET "emailVerified" = NOW()
   WHERE email = 'figma-test@inchronicle.com';
   ```

### Issue: Account Locked After Multiple Failed Logins

**Solution:**
1. Reset password via "Forgot Password" flow
2. Or unlock in database:
   ```sql
   UPDATE "User"
   SET "loginAttempts" = 0, "lockoutUntil" = NULL
   WHERE email = 'figma-test@inchronicle.com';
   ```

---

## Quick Start Command

If you're ready to create the user right now via database:

```bash
# Navigate to backend directory
cd backend

# Create a temporary script file
cat > create-figma-test-user.ts << 'EOF'
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('FigmaTest2024!', 10);

  const user = await prisma.user.create({
    data: {
      email: 'figma-test@inchronicle.com',
      password: hashedPassword,
      name: 'Figma Test User',
      emailVerified: new Date(),
      profile: {
        create: {
          bio: 'Test account for Figma OAuth integration review',
          jobTitle: 'Product Designer',
          company: 'InChronicle'
        }
      }
    }
  });

  console.log('✅ Created test user:', user.email);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
EOF

# Run it
npx tsx create-figma-test-user.ts

# Clean up
rm create-figma-test-user.ts
```

---

## Summary

**Recommended approach:** Manually register at https://inchronicle.com/register

**Credentials to create:**
- Email: `figma-test@inchronicle.com`
- Password: `FigmaTest2024!`
- Name: `Figma Test User`

**What to share with Figma:**
1. These credentials
2. [FIGMA_OAUTH_TESTING_INSTRUCTIONS.md](./FIGMA_OAUTH_TESTING_INSTRUCTIONS.md)
3. Your contact email for support

**After review:**
- Delete or secure the test account
- Update documentation with any feedback from Figma
