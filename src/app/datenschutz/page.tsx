import BackButton from "@/components/BackButton";

export const metadata = { title: "Datenschutz – Kaderstatistik-App" };

export default function DatenschutzPage() {
  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 text-sm leading-6">
      <BackButton href="/" />
      <h1 className="mb-6 text-xl font-semibold">Datenschutzhinweise</h1>

      <section className="mb-6">
        <h2 className="mb-2 font-medium">Wofür die App da ist</h2>
        <p>
          Das Trainerteam nutzt die App, um Trainings und Spiele der Mannschaft
          zu organisieren: Termine, Anwesenheit, Aufstellungen, Ergebnisse und
          die Trainingsplanung. Verantwortlich ist der Verein, für den das
          Trainerteam die Mannschaft betreut. Fragen richtest du an das
          Trainerteam.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 font-medium">Welche Daten gespeichert werden</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Spieler:</strong> Vor- und Nachname, Anwesenheit, Tore,
            Rückennummern und Aufstellungen. Nur für Trainer: Geburtsdatum,
            Spielerpassnummer, Trainingsbewertungen (Leistung, Motivation,
            Disziplin, kurze Notizen) und Performance-Noten.
          </li>
          <li>
            <strong>Trainer:</strong> Name, Geburtsdatum, Anwesenheit und
            Abwesenheitszeiträume.
          </li>
          <li>
            <strong>Nutzerkonten:</strong> Vor- und Nachname, E-Mail-Adresse,
            Rolle sowie Datum und Uhrzeit jedes Logins. Die Login-Historie
            sehen nur Trainer. Bei einer neuen Registrierung werden Name und
            E-Mail-Adresse per E-Mail an den Administrator geschickt, damit er
            sie freigeben kann.
          </li>
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 font-medium">Wer die Daten sehen kann</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            Neue Registrierungen muss der Administrator freigeben. Bis dahin
            sieht das Konto keine Daten.
          </li>
          <li>
            Derzeit haben <strong>nur Trainer</strong> Zugriff auf die Daten.
            Eltern/Spieler sehen nach dem Login keine Inhalte.
          </li>
        </ul>
        <p className="mt-2">
          Die Daten werden nicht veröffentlicht, nicht verkauft und nicht für
          Werbung genutzt.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 font-medium">Wo die Daten liegen</h2>
        <p>
          Die Datenbank und die Anmeldung laufen über Supabase, die Webseite
          wird über Vercel bereitgestellt. Beide verarbeiten die Daten nur im
          Auftrag des Vereins.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 font-medium">Wie lange Daten gespeichert werden</h2>
        <p>
          Verlässt ein Kind die Mannschaft, anonymisiert oder löscht das
          Trainerteam seine Daten. Beim Anonymisieren werden Name,
          Geburtsdatum, Passnummer, Bewertungen und Noten gelöscht. Nur die
          anonymen Anwesenheiten und Tore bleiben für die
          Mannschaftsstatistik erhalten.
        </p>
      </section>

      <section>
        <h2 className="mb-2 font-medium">Deine Rechte</h2>
        <p>
          Du kannst jederzeit Auskunft über die gespeicherten Daten zu dir
          oder deinem Kind verlangen und sie berichtigen oder löschen lassen.
          Eine erteilte Einwilligung kannst du widerrufen. Wende dich dafür an
          das Trainerteam. Außerdem kannst du dich bei einer
          Datenschutz-Aufsichtsbehörde beschweren.
        </p>
      </section>
    </div>
  );
}
