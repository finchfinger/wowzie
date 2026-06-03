import { EmptyState } from "@/components/ui/EmptyState";

export default function HostTeamPage() {
  return (
    <div className="py-12">
      <EmptyState
        icon="group"
        iconBg="bg-primary/10"
        iconColor="text-primary"
        title="Team management coming soon"
        description="You'll be able to invite staff, assign roles, and manage access for your organization here."
      />
    </div>
  );
}
