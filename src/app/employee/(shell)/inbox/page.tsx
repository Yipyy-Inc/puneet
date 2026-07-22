import { CommunicationHub } from "@/components/messaging/CommunicationHub";
import { RequirePermission } from "@/components/employee/AccessRestricted";

// Section 5F — the same messaging inbox as admin, inside the /employee shell so
// the RBAC provider is active. messages_view_inbox not_granted → not reachable;
// assigned_only → the thread list is scoped to the viewer's assigned-client
// conversations (enforced in ContactList via the data-layer helper), the "All"
// filter needs messages_view_all_threads, and composing/replying needs
// messages_send within an assigned conversation.
export default function EmployeeInboxPage() {
  return (
    <RequirePermission permKey="messages_view_inbox">
      <div className="flex h-[calc(100vh-128px)] flex-col overflow-hidden">
        <CommunicationHub />
      </div>
    </RequirePermission>
  );
}
