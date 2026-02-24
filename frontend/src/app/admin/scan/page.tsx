import { redirect } from "next/navigation";

export default function ScanPage() {
  redirect("/admin?tab=scan");
}
