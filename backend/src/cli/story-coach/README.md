# Story Coach CLI

> CLI-first demo to validate the pipeline before integration.

## Philosophy

Build it as CLI → Test with file handoffs → Prove value → Then integrate.

```
CLI Demo (file-based)
    ↓
Validate pipeline works
    ↓
Integrate storage (DB)
    ↓
Integrate frontend
```

## Commands

```bash
# 1. Detect archetype from journal entry
story-coach detect <entry-file.json> --output archetypes.json

# 2. Run coaching session (interactive)
story-coach coach <entry-file.json> --archetype firefighter --output session.json

# 3. Generate story with extracted context
story-coach generate <entry-file.json> \
  --session session.json \
  --framework SOAR \
  --output story.json

# 4. Evaluate story quality
story-coach evaluate <story.json> --output evaluation.json

# 5. Full pipeline (detect → coach → generate → evaluate)
story-coach pipeline <entry-file.json> --output-dir ./results/
```

## File Handoffs

Each stage produces a JSON file that feeds the next:

```
entry.json → detect → archetypes.json
                           ↓
entry.json + archetype → coach → session.json
                                      ↓
entry.json + session.json → generate → story.json
                                            ↓
                            story.json → evaluate → evaluation.json
```

## Usage

```bash
# Quick test
cd backend
npx ts-node src/cli/story-coach/index.ts pipeline \
  ./test-data/migration-entry.json \
  --output-dir ./results/

# Interactive coaching
npx ts-node src/cli/story-coach/index.ts coach \
  ./test-data/migration-entry.json \
  --archetype firefighter

# Compare with/without coaching
npx ts-node src/cli/story-coach/index.ts compare \
  ./test-data/migration-entry.json
```
