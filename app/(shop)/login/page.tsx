import { Button } from "@/components/ui/Button";

export default function Page() {
  return (
    <form className="flex flex-col gap-4 p-4">
      <h1 className="text-xl font-semibold">Log in</h1>
      <label className="flex flex-col gap-1 text-sm">
        Phone number
        <input type="tel" inputMode="tel" autoComplete="tel" placeholder="+91" className="min-h-11 rounded-[8px] border-[0.5px] border-border bg-surface px-3" />
      </label>
      <Button type="button" disabled title="Phone OTP is connected in the backend phase">
        Send code
      </Button>
      <p className="text-xs text-muted">Phone OTP login is connected in the backend phase.</p>
    </form>
  );
}
