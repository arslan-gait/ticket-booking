"use client";

import { useRouter } from "next/navigation";

type NavButtonProps = { href: string } & React.ButtonHTMLAttributes<HTMLButtonElement>;

export default function NavButton({ href, onClick, children, ...props }: NavButtonProps) {
  const router = useRouter();
  return (
    <button
      {...props}
      onClick={(e) => {
        onClick?.(e);
        router.push(href);
      }}
    >
      {children}
    </button>
  );
}
