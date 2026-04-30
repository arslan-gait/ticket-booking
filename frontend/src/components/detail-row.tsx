export default function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <>
      <div className="size-12 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-sm text-gray-500">{label}</span>
        <span className="text-base text-gray-500">{value}</span>
      </div>
    </>
  );
}
