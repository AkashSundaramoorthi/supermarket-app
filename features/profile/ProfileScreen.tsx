import { Button } from "@/components/ui/Button";
import { placeholderUser } from "@/lib/placeholder/user";

const STUDENT_LABELS: Record<typeof placeholderUser.studentStatus, string> = {
  not_submitted: "Not verified. Upload a student ID to get 10% off.",
  pending: "Verification pending review.",
  verified: "Verified student. 10% off applies.",
  rejected: "Verification was not accepted. You can try again.",
};

export function ProfileScreen() {
  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="text-xl font-semibold">Profile</h1>

      <section className="flex flex-col gap-2 rounded-[12px] border-[0.5px] border-border bg-surface p-4">
        <h2 className="text-sm font-semibold">Delivery address</h2>
        <p className="text-sm">{placeholderUser.address}</p>
        <p className="text-xs text-muted">Address editing is connected in the backend phase.</p>
      </section>

      <section className="flex flex-col gap-2 rounded-[12px] border-[0.5px] border-border bg-surface p-4">
        <h2 className="text-sm font-semibold">Student verification</h2>
        <p className="text-sm">{STUDENT_LABELS[placeholderUser.studentStatus]}</p>
        <Button variant="secondary" disabled title="Upload is connected in the backend phase">
          Upload student ID
        </Button>
      </section>

      <Button variant="secondary" disabled title="Login is connected in the backend phase">
        Log out
      </Button>
    </div>
  );
}
