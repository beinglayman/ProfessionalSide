# InChronicle Backend Setup Guide

## Prerequisites Installation

### 1. Install PostgreSQL on macOS

```bash
# Install PostgreSQL using Homebrew
brew install postgresql@15

# Start PostgreSQL service
brew services start postgresql@15

# Create a database user (replace 'yourusername' with your actual username)
createdb inchronicle_dev

# Test the connection
psql inchronicle_dev
```

If you don't have Homebrew installed:
```bash
# Install Homebrew first
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### 2. Verify Installation

```bash
# Check PostgreSQL version
psql --version

# Check if database was created
psql -l | grep inchronicle_dev
```

## Next Steps

Once PostgreSQL is installed and running, I'll immediately start building the backend with:

1. **Backend Project Setup** - Express.js + TypeScript + Prisma
2. **Database Schema Creation** - All your data models
3. **Authentication System** - JWT-based auth
4. **Core API Endpoints** - User profiles, journal entries
5. **Sample Data Migration** - All your frontend sample data

## Environment Configuration

The backend will use these environment variables:
```env
DATABASE_URL="postgresql://username:password@localhost:5432/inchronicle_dev"
JWT_SECRET="your-secret-key"
PORT=3001
NODE_ENV=development
```

Ready to proceed once PostgreSQL is installed!