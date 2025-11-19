// This file now re-exports the MCPFlowSidePanel to maintain backwards compatibility
// All MCP flow UI now uses the side panel pattern instead of centered modal

import { MCPFlowSidePanel } from './MCPFlowSidePanel';

export interface MCPFlowModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (data: {
    title: string;
    description: string;
    skills: string[];
    activities: any;
    format7Entry?: any;
    workspaceEntry: any;
    networkEntry: any;
  }) => Promise<void>;
  workspaceName?: string;
}

// Re-export MCPFlowSidePanel as MCPFlowModal for backwards compatibility
export function MCPFlowModal(props: MCPFlowModalProps) {
  return <MCPFlowSidePanel {...props} />;
}

export default MCPFlowModal;
