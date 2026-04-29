import { redirect } from "next/navigation";

export default function ScanPage() {
  redirect("/ticket-admin/dashboard?tab=scan");
}
