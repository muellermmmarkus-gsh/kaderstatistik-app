import { getFormation, getSlots } from "@/app/events/[id]/lineup/formations";

type Player = { id: string; first_name: string; last_name: string };

/** Schreibgeschuetzte Aufstellung (Spielfeld mit Namen), wie unter Termine -> Aufstellung. */
function Pitch({
  title,
  formationKey,
  assignments,
  playerById,
}: {
  title: string;
  formationKey: string;
  assignments: Record<string, string>;
  playerById: Map<string, Player>;
}) {
  const slots = getSlots(getFormation(formationKey));

  return (
    <div className="flex-1">
      <p className="mb-1 text-sm font-medium">
        {title} <span className="font-normal text-zinc-500">{formationKey}</span>
      </p>
      <div
        className="relative mx-auto w-full max-w-xs overflow-hidden rounded-lg border-2 border-white bg-green-600"
        style={{ aspectRatio: "2 / 3" }}
      >
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
          <line x1="3" y1="14" x2="97" y2="14" stroke="white" strokeWidth="0.6" />
          <path d="M 38 14 A 12 12 0 0 0 62 14" stroke="white" strokeWidth="0.6" fill="none" />
          <rect x="25" y="78" width="50" height="21" stroke="white" strokeWidth="0.6" fill="none" />
          <rect x="38" y="90" width="24" height="9" stroke="white" strokeWidth="0.6" fill="none" />
        </svg>
        {slots.map((slot) => {
          const player = playerById.get(assignments[slot.key] ?? "");
          return (
            <div
              key={slot.key}
              className="absolute -translate-x-1/2 -translate-y-1/2 text-center"
              style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
            >
              <span
                className={`block max-w-24 truncate rounded px-1.5 py-0.5 text-xs shadow ${
                  player ? "bg-white text-zinc-900" : "bg-white/30 text-white"
                }`}
                title={player ? `${player.first_name} ${player.last_name}` : slot.label}
              >
                {player ? `${player.first_name} ${player.last_name}` : slot.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function LineupView({
  lineup,
  players,
}: {
  lineup: {
    formation: string;
    assignments: Record<string, string> | null;
    bench_formation: string | null;
    bench_assignments: Record<string, string> | null;
  };
  players: Player[];
}) {
  const playerById = new Map(players.map((p) => [p.id, p]));
  const bench = lineup.bench_assignments ?? {};

  return (
    <div className="flex flex-col gap-4 sm:flex-row">
      <Pitch
        title="Startaufstellung"
        formationKey={lineup.formation}
        assignments={lineup.assignments ?? {}}
        playerById={playerById}
      />
      {lineup.bench_formation && Object.keys(bench).length > 0 && (
        <Pitch
          title="Ersatzbank"
          formationKey={lineup.bench_formation}
          assignments={bench}
          playerById={playerById}
        />
      )}
    </div>
  );
}
