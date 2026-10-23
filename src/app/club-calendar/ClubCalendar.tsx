export const CLUB_CALENDAR_URL = "https://kalender.digital/tvgeisenhausen";

/** Vereinskalender von kalender.digital als eingebettete Seite (fremder Ursprung, vom Browser getrennt). */
export default function ClubCalendar() {
  return (
    <iframe
      title="Kalender TVG Fussball"
      src={CLUB_CALENDAR_URL}
      referrerPolicy="strict-origin-when-cross-origin"
      className="h-[calc(100dvh-14rem)] min-h-[600px] w-full rounded-lg border border-zinc-200 bg-white dark:border-zinc-800"
    />
  );
}
