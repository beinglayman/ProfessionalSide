/**
 * Backfill StorySource rows from existing CareerStory.sections.evidence
 *
 * For each story, for each section, for each evidence entry:
 * - Create a StorySource row with sourceType: "activity"
 * - Hydrate label/url/toolType from ToolActivity if found
 * - Use activityId = null if activity doesn't exist (LLM hallucination)
 * - Store evidence.description as annotation
 *
 * Safe to run multiple times — uses upsert to prevent duplicates.
 *
 * Run: npx tsx prisma/backfill-story-sources.ts
 */
import { prisma } from '../src/lib/prisma';

interface EvidenceEntry {
  activityId: string;
  description?: string;
  date?: string;
}

interface Section {
  summary?: string;
  evidence?: EvidenceEntry[];
}

async function backfill() {
  console.log('Starting StorySource backfill...');

  const stories = await prisma.careerStory.findMany({
    select: {
      id: true,
      sections: true,
      sourceMode: true,
    },
  });

  console.log(`Found ${stories.length} stories to process`);

  let created = 0;
  let skipped = 0;
  let missingActivities = 0;

  for (const story of stories) {
    const sections = story.sections as Record<string, Section> | null;
    if (!sections) continue;

    for (const [sectionKey, section] of Object.entries(sections)) {
      if (!section?.evidence || !Array.isArray(section.evidence)) continue;

      for (let i = 0; i < section.evidence.length; i++) {
        const evidence = section.evidence[i];
        if (!evidence?.activityId) continue;

        // Look up activity for hydration
        let activity = null;
        try {
          // Try production table first, then demo
          activity = await prisma.toolActivity.findUnique({
            where: { id: evidence.activityId },
            select: { id: true, title: true, sourceUrl: true, source: true },
          });
          if (!activity) {
            // Try demo table
            activity = await prisma.demoToolActivity.findUnique({
              where: { id: evidence.activityId },
              select: { id: true, title: true, sourceUrl: true, source: true },
            });
          }
        } catch {
          // Activity table access failed, continue with null
        }

        if (!activity) {
          missingActivities++;
          continue; // Skip unresolvable activities
        }

        const label = activity.title;
        const url = activity.sourceUrl || null;
        const toolType = activity.source || null;
        const activityId = evidence.activityId;

        // Upsert to prevent duplicates (deterministic ID = idempotent reruns)
        try {
          await prisma.storySource.upsert({
            where: {
              id: `backfill-${story.id}-${sectionKey}-${evidence.activityId}`,
            },
            update: {}, // No update needed — backfill is idempotent
            create: {
              id: `backfill-${story.id}-${sectionKey}-${evidence.activityId}`,
              storyId: story.id,
              sectionKey,
              sourceType: 'activity',
              activityId,
              label,
              url,
              toolType,
              annotation: evidence.description || null,
              sortOrder: i,
            },
          });
          created++;
        } catch (e: any) {
          if (e.code === 'P2002') {
            skipped++; // Duplicate — already backfilled
          } else {
            throw e;
          }
        }
      }
    }
  }

  console.log(`Backfill complete: ${created} created, ${skipped} skipped (duplicates), ${missingActivities} missing activities`);

  // Phase 2: Patch existing sources that have activityId but missing toolType/url
  console.log('\nPhase 2: Patching sources with missing toolType...');
  const sourcesToPatch = await prisma.storySource.findMany({
    where: {
      sourceType: 'activity',
      activityId: { not: null },
      toolType: null,
    },
    select: { id: true, activityId: true },
  });

  console.log(`Found ${sourcesToPatch.length} sources to patch`);
  let patched = 0;

  for (const source of sourcesToPatch) {
    if (!source.activityId) continue;

    let activity = null;
    try {
      activity = await prisma.toolActivity.findUnique({
        where: { id: source.activityId },
        select: { title: true, sourceUrl: true, source: true },
      });
      if (!activity) {
        activity = await prisma.demoToolActivity.findUnique({
          where: { id: source.activityId },
          select: { title: true, sourceUrl: true, source: true },
        });
      }
    } catch { /* ignore */ }

    if (activity) {
      await prisma.storySource.update({
        where: { id: source.id },
        data: {
          toolType: activity.source || null,
          url: activity.sourceUrl || null,
          label: activity.title,
        },
      });
      patched++;
    }
  }

  console.log(`Patch complete: ${patched} sources updated with toolType/url`);
}

backfill()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('Backfill failed:', e);
    process.exit(1);
  });
