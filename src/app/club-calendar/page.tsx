import BackButton from "@/components/BackButton";
import ClubCalendar, { CLUB_CALENDAR_URL } from "./ClubCalendar";

export default function ClubCalendarPage() {
  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
      <BackButton href="/" />
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-xl font-semibold">Kalender TVG Fussball</h1>
        <a
          href={CLUB_CALENDAR_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-zinc-500 hover:underline"
        >
          In neuem Tab öffnen ↗
        </a>
      </div>
      <ClubCalendar />
    </div>
  );
}
