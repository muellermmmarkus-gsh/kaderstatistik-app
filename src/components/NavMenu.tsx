"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type MenuLink = { label: string; href: string };
type MenuGroup = { label: string; href?: string; items?: MenuLink[]; trainerOnly?: boolean };

const menu: MenuGroup[] = [
  {
    label: "Kader",
    items: [
      { label: "Kaderstatistik", href: "/" },
      { label: "Spieler", href: "/players" },
      { label: "Trainer", href: "/trainers" },
    ],
  },
  {
    label: "Termine und Verwaltung",
    items: [
      { label: "Termine", href: "/events" },
      { label: "Kalender", href: "/calendar" },
      { label: "Abwesenheiten", href: "/absences" },
      { label: "Saisonverwaltung", href: "/seasons" },
      { label: "Checklisten", href: "/checklists" },
    ],
  },
  {
    label: "Spielbetrieb",
    items: [
      { label: "Live-Ergebnis", href: "/results/live" },
      { label: "Spielberichte", href: "/results/recent" },
      { label: "Wettbewerbe", href: "/competitions" },
    ],
  },
  {
    label: "Training",
    items: [
      { label: "Übungen", href: "/exercises" },
      { label: "Übungsdatenbank", href: "/exercise-database" },
      { label: "Übungshistorie", href: "/exercise-history" },
      { label: "Trainingsplanung", href: "/trainings" },
      { label: "Flächenplanung", href: "/fields" },
    ],
  },
  {
    label: "Performance",
    trainerOnly: true,
    items: [
      { label: "Update", href: "/performance/update" },
      { label: "Entwicklung", href: "/performance/development" },
    ],
  },
  { label: "Statistik", href: "/stats" },
  {
    label: "Einstellungen",
    items: [
      { label: "Termine", href: "/settings/event-types" },
      { label: "Skills", href: "/settings/skills" },
    ],
  },
];

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" className="h-6 w-6">
      {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
    </svg>
  );
}

export default function NavMenu({ isTrainer }: { isTrainer: boolean }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const visibleMenu = menu.filter((group) => isTrainer || !group.trainerOnly);
  const rootRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpenIndex(null);
        setMobileOpen(false);
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpenIndex(null);
        setMobileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const mobileLinkClass = (href: string) =>
    `block rounded px-3 py-3 text-base hover:bg-zinc-100 dark:hover:bg-zinc-900 ${
      pathname === href ? "bg-zinc-100 font-semibold dark:bg-zinc-900" : ""
    }`;

  return (
    <div ref={rootRef} className="text-sm font-medium">
      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen((open) => !open)}
          aria-expanded={mobileOpen}
          aria-controls="mobile-menu"
          aria-label={mobileOpen ? "Menü schließen" : "Menü öffnen"}
          className="-ml-2 rounded p-2 hover:bg-zinc-100 dark:hover:bg-zinc-900"
        >
          <MenuIcon open={mobileOpen} />
        </button>
        {mobileOpen && (
          <div
            id="mobile-menu"
            className="absolute inset-x-0 top-full z-20 max-h-[calc(100dvh-4rem)] overflow-y-auto border-b border-zinc-200 bg-white px-4 pb-4 shadow-lg dark:border-zinc-800 dark:bg-zinc-950"
          >
            {visibleMenu.map((group) =>
              group.items ? (
                <div key={group.label} className="pt-4">
                  <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    {group.label}
                  </p>
                  {group.items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      aria-current={pathname === item.href ? "page" : undefined}
                      className={mobileLinkClass(item.href)}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              ) : (
                <div key={group.label} className="pt-4">
                  <Link
                    href={group.href!}
                    onClick={() => setMobileOpen(false)}
                    aria-current={pathname === group.href ? "page" : undefined}
                    className={mobileLinkClass(group.href!)}
                  >
                    {group.label}
                  </Link>
                </div>
              ),
            )}
          </div>
        )}
      </div>

      <div className="hidden items-center gap-1 lg:flex">
      {visibleMenu.map((group, index) =>
        group.items ? (
          <div
            key={group.label}
            className="relative"
            onMouseEnter={() => setOpenIndex(index)}
            onMouseLeave={() =>
              setOpenIndex((current) => (current === index ? null : current))
            }
          >
            <button
              type="button"
              aria-expanded={openIndex === index}
              onClick={() =>
                setOpenIndex((current) => (current === index ? null : index))
              }
              className="rounded px-3 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-900"
            >
              {group.label}
            </button>
            {openIndex === index && (
              <div className="absolute left-0 top-full z-10 min-w-48 rounded-lg border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-800 dark:bg-zinc-950">
                {group.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpenIndex(null)}
                    className="block px-4 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        ) : (
          <Link
            key={group.label}
            href={group.href!}
            className="rounded px-3 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-900"
          >
            {group.label}
          </Link>
        ),
      )}
      </div>
    </div>
  );
}
