"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type MenuLink = { label: string; href: string };
type MenuGroup = { label: string; href?: string; items?: MenuLink[] };

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
    ],
  },
  {
    label: "Training",
    items: [
      { label: "Übungen", href: "/exercises" },
      { label: "Übungsplanung", href: "/exercise-focuses" },
      { label: "Trainingsplanung", href: "/trainings" },
      { label: "Flächenplanung", href: "/fields" },
    ],
  },
  {
    label: "Performance",
    items: [
      { label: "Update", href: "/performance/update" },
      { label: "Entwicklung", href: "/performance/development" },
    ],
  },
  { label: "Statistik", href: "/stats" },
];

export default function NavMenu() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpenIndex(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={rootRef} className="flex items-center gap-1 text-sm font-medium">
      {menu.map((group, index) =>
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
  );
}
