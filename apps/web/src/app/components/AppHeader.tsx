"use client";

import { BookOpenText, House, PenSquare, Sparkles, UserCircle2 } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import styles from "./AppHeader.module.css";

const LINKS = [
  { href: "/", label: "Home", icon: House },
  { href: "/author", label: "Author", icon: PenSquare },
  { href: "/read", label: "Reader", icon: BookOpenText },
  { href: "/account", label: "Account", icon: UserCircle2 },
];

export default function AppHeader() {
  const pathname = usePathname();

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link href="/" className={styles.brand}>
          <span className={styles.dot} aria-hidden="true">
            <Sparkles size={12} strokeWidth={2.5} />
          </span>
          CYOA Studio
        </Link>

        <nav className={styles.nav} aria-label="Primary">
          {LINKS.map((link) => {
            const active = pathname === link.href;
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`${styles.link} ${active ? styles.active : ""}`}
              >
                <Icon className={styles.linkIcon} size={15} />
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
