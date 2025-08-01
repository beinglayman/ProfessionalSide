const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function cleanupTestInvitation() {
  try {
    console.log('🧹 Cleaning up test invitation and workspace...');
    
    // Find the test workspace
    const testWorkspace = await prisma.workspace.findFirst({
      where: { name: 'Test Notification Workspace' }
    });
    
    if (!testWorkspace) {
      console.log('✅ No test workspace found - nothing to clean up');
      return;
    }
    
    console.log(`🏢 Found test workspace: ${testWorkspace.name} (ID: ${testWorkspace.id})`);
    
    // Find and delete any invitations for this workspace
    const invitations = await prisma.workspaceInvitation.findMany({
      where: { workspaceId: testWorkspace.id }
    });
    
    if (invitations.length > 0) {
      console.log(`📧 Found ${invitations.length} invitations to delete`);
      
      for (const invitation of invitations) {
        // Delete any notifications related to this invitation
        const relatedNotifications = await prisma.notification.findMany({
          where: {
            type: 'WORKSPACE_INVITE',
            data: {
              path: ['invitationId'],
              equals: invitation.id
            }
          }
        });
        
        if (relatedNotifications.length > 0) {
          console.log(`🔔 Deleting ${relatedNotifications.length} related notifications`);
          await prisma.notification.deleteMany({
            where: {
              type: 'WORKSPACE_INVITE',
              data: {
                path: ['invitationId'],
                equals: invitation.id
              }
            }
          });
        }
        
        // Delete the invitation
        await prisma.workspaceInvitation.delete({
          where: { id: invitation.id }
        });
        console.log(`✅ Deleted invitation ${invitation.id}`);
      }
    }
    
    // Delete workspace members
    const memberCount = await prisma.workspaceMember.count({
      where: { workspaceId: testWorkspace.id }
    });
    
    if (memberCount > 0) {
      console.log(`👥 Deleting ${memberCount} workspace members`);
      await prisma.workspaceMember.deleteMany({
        where: { workspaceId: testWorkspace.id }
      });
    }
    
    // Delete the workspace
    await prisma.workspace.delete({
      where: { id: testWorkspace.id }
    });
    
    console.log('✅ Deleted test workspace');
    
    // Clean up test organization if it has no other workspaces
    if (testWorkspace.organizationId) {
      const remainingWorkspaces = await prisma.workspace.count({
        where: { organizationId: testWorkspace.organizationId }
      });
      
      if (remainingWorkspaces === 0) {
        const organization = await prisma.organization.findUnique({
          where: { id: testWorkspace.organizationId }
        });
        
        if (organization && organization.name === 'Test Organization') {
          await prisma.organization.delete({
            where: { id: testWorkspace.organizationId }
          });
          console.log('✅ Deleted test organization');
        }
      }
    }
    
    console.log('🎉 Cleanup completed successfully!');
    console.log('The "Test Notification Workspace" invitation should no longer appear in the workspace discovery page.');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupTestInvitation();