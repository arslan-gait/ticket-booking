import { redirect } from "next/navigation";

export default function ScanPage() {
  redirect("/admin/dashboard?tab=scan");
}
