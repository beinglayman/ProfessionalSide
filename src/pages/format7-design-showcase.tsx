import React from 'react';
import { sampleFormat7Entry } from '../components/format7/sample-data';

// Import original Variant M
import MinimalVariantM from '../components/format7/variant-minimal-m';

// Import integrated variants
import FeedOutlinedMinimal from '../components/format7/feed-outlined-minimal';
import JournalOutlinedMinimal from '../components/format7/journal-outlined-minimal';
import FeedCompact from '../components/format7/feed-compact';
import JournalCompact from '../components/format7/journal-compact';
import FeedDetailed from '../components/format7/feed-detailed';
import JournalDetailed from '../components/format7/journal-detailed';
import FeedHybrid from '../components/format7/feed-hybrid';
import JournalHybrid from '../components/format7/journal-hybrid';
import FeedAchievement from '../components/format7/feed-achievement';
import JournalAchievement from '../components/format7/journal-achievement';

const Format7DesignShowcase: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Format 7 - Journal Entry Designs</h1>
          <p className="text-sm text-gray-600 mt-1">
            Integrated designs merging Variant M with InChronicle's design language
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Each pair shows Feed View (with author) and Journal View (without author)
          </p>
        </div>
      </div>

      {/* Variants Container */}
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-16">

        {/* Section 1: Original Variant M */}
        <section>
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Original Design</h2>
            <p className="text-sm text-gray-600">The base Variant M that inspired the integrated designs below</p>
          </div>
          <MinimalVariantM entry={sampleFormat7Entry} />
        </section>

        <div className="border-t-4 border-gray-300"></div>

        {/* Section 2: Pair 1 - Outlined Minimal */}
        <section>
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Pair 1: Outlined Minimal</h2>
            <p className="text-sm text-gray-600">
              Light borders, horizontal metadata cards, clickable tools/team/tech with "+n" indicators
            </p>
          </div>

          <div className="space-y-8">
            <FeedOutlinedMinimal entry={sampleFormat7Entry} />
            <div className="border-t-2 border-gray-200"></div>
            <JournalOutlinedMinimal entry={sampleFormat7Entry} />
          </div>
        </section>

        <div className="border-t-4 border-gray-300"></div>

        {/* Section 3: Pair 2 - Compact Feed */}
        <section>
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Pair 2: Compact Feed</h2>
            <p className="text-sm text-gray-600">
              Denser layout, smaller spacing, inline metadata for quick scanning
            </p>
          </div>

          <div className="space-y-8">
            <FeedCompact entry={sampleFormat7Entry} />
            <div className="border-t-2 border-gray-200"></div>
            <JournalCompact entry={sampleFormat7Entry} />
          </div>
        </section>

        <div className="border-t-4 border-gray-300"></div>

        {/* Section 4: Pair 3 - Detailed Card */}
        <section>
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Pair 3: Detailed Card</h2>
            <p className="text-sm text-gray-600">
              Comprehensive view with achievements, linked goals, larger avatars, and full feature set
            </p>
          </div>

          <div className="space-y-8">
            <FeedDetailed entry={sampleFormat7Entry} />
            <div className="border-t-2 border-gray-200"></div>
            <JournalDetailed entry={sampleFormat7Entry} />
          </div>
        </section>

        <div className="border-t-4 border-gray-300"></div>

        {/* Section 5: Pair 4 - Hybrid */}
        <section>
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Pair 4: Hybrid</h2>
            <p className="text-sm text-gray-600">
              Best of both: Compact Feed's author header + Outlined Minimal's body design
            </p>
          </div>

          <div className="space-y-8">
            <FeedHybrid entry={sampleFormat7Entry} />
            <div className="border-t-2 border-gray-200"></div>
            <JournalHybrid entry={sampleFormat7Entry} />
          </div>
        </section>

        <div className="border-t-4 border-gray-300"></div>

        {/* Section 6: Pair 5 - Achievement Celebration */}
        <section>
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Pair 5: Achievement Celebration</h2>
            <p className="text-sm text-gray-600">
              Special variant for achievement entries: Purple theming, confetti on hover, prominent trophy icons, and achievement badges
            </p>
          </div>

          <div className="space-y-8">
            <FeedAchievement entry={sampleFormat7Entry} />
            <div className="border-t-2 border-gray-200"></div>
            <JournalAchievement entry={sampleFormat7Entry} />
          </div>
        </section>

      </div>
    </div>
  );
};

export default Format7DesignShowcase;