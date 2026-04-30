export default function PrinterIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="40"
      height="40"
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M10.0002 15V3.33334H30.0002V15M10.0002 30H6.66683C5.78277 30 4.93493 29.6488 4.30981 29.0237C3.68469 28.3986 3.3335 27.5507 3.3335 26.6667V18.3333C3.3335 17.4493 3.68469 16.6014 4.30981 15.9763C4.93493 15.3512 5.78277 15 6.66683 15H33.3335C34.2176 15 35.0654 15.3512 35.6905 15.9763C36.3156 16.6014 36.6668 17.4493 36.6668 18.3333V26.6667C36.6668 27.5507 36.3156 28.3986 35.6905 29.0237C35.0654 29.6488 34.2176 30 33.3335 30H30.0002M10.0002 23.3333H30.0002V36.6667H10.0002V23.3333Z"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}