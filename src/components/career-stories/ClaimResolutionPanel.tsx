import React from 'react';
import { AlertTriangle, Link2, Pencil } from 'lucide-react';
import { Button } from '../ui/button';

export interface UngroundedClaim {
  sectionKey: string;
  claim: string;
  suggestion: string;
  isUserEdited: boolean;
}

interface ClaimResolutionPanelProps {
  claims: UngroundedClaim[];
  onLinkEvidence: (sectionKey: string) => void;
  onEditSection: (sectionKey: string) => void;
}

/** Groups claims by sectionKey for display */
function groupBySectionKey(claims: UngroundedClaim[]) {
  const grouped = new Map<string, UngroundedClaim[]>();
  for (const claim of claims) {
    const existing = grouped.get(claim.sectionKey) || [];
    existing.push(claim);
    grouped.set(claim.sectionKey, existing);
  }
  return grouped;
}

export function ClaimResolutionPanel({
  claims,
  onLinkEvidence,
  onEditSection,
}: ClaimResolutionPanelProps) {
  const grouped = groupBySectionKey(claims);

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
        <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
        <div>
          <div className="text-sm font-medium text-amber-900">Back up your claims</div>
          <div className="text-xs text-amber-700 mt-0.5">
            You&apos;ve edited sections that contain claims needing evidence.
            Link work artifacts to verify them, or edit the section to adjust the claim.
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {Array.from(grouped.entries()).map(([sectionKey, sectionClaims]) => (
          <div key={sectionKey} className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-200">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {sectionKey}
              </span>
            </div>
            <div className="divide-y divide-gray-100">
              {sectionClaims.map((claim, idx) => (
                <div key={idx} className="px-3 py-2.5">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 font-medium">
                        &ldquo;{claim.claim}&rdquo;
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {claim.suggestion}
                      </p>
                      <div className="flex gap-2 mt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1"
                          onClick={() => onLinkEvidence(sectionKey)}
                        >
                          <Link2 className="w-3 h-3" />
                          Link Work Artifact
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs gap-1"
                          onClick={() => onEditSection(sectionKey)}
                        >
                          <Pencil className="w-3 h-3" />
                          Edit Section
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
