import React, { useState } from 'react';
import { Shield, Lock, AlertCircle, Github, Database, Figma, Mail, FileText, MessageSquare } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { MCPToolType } from '../../services/mcp.service';

interface MCPConsentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedTools: MCPToolType[], consentGiven: boolean) => void;
  availableTools: MCPToolType[];
  defaultSelected?: MCPToolType[];
}

const toolIcons: Record<MCPToolType, React.ComponentType<{ className?: string }>> = {
  [MCPToolType.GITHUB]: Github,
  [MCPToolType.JIRA]: Database,
  [MCPToolType.FIGMA]: Figma,
  [MCPToolType.OUTLOOK]: Mail,
  [MCPToolType.CONFLUENCE]: FileText,
  [MCPToolType.SLACK]: MessageSquare,
};

const toolNames: Record<MCPToolType, string> = {
  [MCPToolType.GITHUB]: 'GitHub',
  [MCPToolType.JIRA]: 'Jira',
  [MCPToolType.FIGMA]: 'Figma',
  [MCPToolType.OUTLOOK]: 'Outlook',
  [MCPToolType.CONFLUENCE]: 'Confluence',
  [MCPToolType.SLACK]: 'Slack',
};

export const MCPConsentDialog: React.FC<MCPConsentDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  availableTools,
  defaultSelected = []
}) => {
  const [selectedTools, setSelectedTools] = useState<Set<MCPToolType>>(
    new Set(defaultSelected)
  );
  const [consentChecked, setConsentChecked] = useState(false);

  const handleToolToggle = (tool: MCPToolType) => {
    setSelectedTools(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tool)) {
        newSet.delete(tool);
      } else {
        newSet.add(tool);
      }
      return newSet;
    });
  };

  const handleConfirm = () => {
    if (consentChecked && selectedTools.size > 0) {
      onConfirm(Array.from(selectedTools), true);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-blue-600" />
            <DialogTitle>Permission to Access External Tools</DialogTitle>
          </div>
          <DialogDescription className="pt-2">
            Select which tools to fetch data from. Your privacy is protected.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Privacy Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Shield className="h-4 w-4 text-blue-600 mt-0.5" />
              <div className="text-sm text-gray-700">
                <strong>Privacy Guarantee:</strong>
                <ul className="mt-1 space-y-1">
                  <li>• Data is fetched temporarily (memory only)</li>
                  <li>• Auto-deleted after 30 minutes</li>
                  <li>• Nothing saved without your explicit approval</li>
                  <li>• You control what gets included in your journal</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Tool Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Select tools to fetch from:
            </label>
            <div className="space-y-2">
              {availableTools.map(tool => {
                const Icon = toolIcons[tool];
                const isSelected = selectedTools.has(tool);

                return (
                  <div
                    key={tool}
                    className={`
                      flex items-center gap-3 p-3 border rounded-lg cursor-pointer
                      transition-colors
                      ${isSelected
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                      }
                    `}
                    onClick={() => handleToolToggle(tool)}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleToolToggle(tool)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <Icon className="h-4 w-4 text-gray-600" />
                    <div className="flex-1">
                      <div className="font-medium text-sm">{toolNames[tool]}</div>
                      <div className="text-xs text-gray-500">
                        Fetch recent activity from your {toolNames[tool]} account
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Consent Checkbox */}
          <div className="border-t pt-4">
            <div className="flex items-start gap-2">
              <Checkbox
                id="consent"
                checked={consentChecked}
                onCheckedChange={(checked) => setConsentChecked(checked as boolean)}
              />
              <label
                htmlFor="consent"
                className="text-sm text-gray-700 cursor-pointer"
              >
                I understand that InChronicle will temporarily fetch data from the selected tools.
                This data will NOT be saved unless I explicitly include it in my journal entry.
                All temporary data will be automatically deleted after 30 minutes.
              </label>
            </div>
          </div>

          {/* Warning if no tools selected */}
          {selectedTools.size === 0 && (
            <div className="flex items-center gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <span className="text-yellow-800">Please select at least one tool</span>
            </div>
          )}

          {/* Warning if consent not given */}
          {!consentChecked && selectedTools.size > 0 && (
            <div className="flex items-center gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <span className="text-yellow-800">Please confirm your consent to proceed</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!consentChecked || selectedTools.size === 0}
            className="gap-2"
          >
            <Shield className="h-4 w-4" />
            Fetch Selected (One-time)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};