/**
 * BFV-Wettbewerbs-Widget. Das offizielle BFV-Skript (widgetjs) macht nichts
 * anderes, als einen iframe von widget-prod.bfv.de einzufuegen - diesen bauen
 * wir direkt nach. So laeuft kein fremdes Skript in der App (es koennte sonst
 * die Login-Cookies lesen); der iframe hat einen fremden Ursprung und ist vom
 * Browser von der App getrennt.
 */
export const BFV_COMPETITION_ID_PATTERN = /^[A-Za-z0-9-]{10,64}$/;

const HEIGHT = 720;

function widgetUrl(competitionId: string, host: string) {
  const css = JSON.stringify({ height: String(HEIGHT), width: "100%", selectedTab: "results" });
  const widget = `widget/competition/compound${competitionId}/results?css=${encodeURIComponent(css)}&referrer=${host}`;
  return `https://widget-prod.bfv.de/widget/widgetresource/iframe?url=${encodeURIComponent(host)}&widget=${encodeURIComponent(widget)}`;
}

export default function BfvWidget({ competitionId, host }: { competitionId: string; host: string }) {
  if (!BFV_COMPETITION_ID_PATTERN.test(competitionId)) return null;

  return (
    <iframe
      title="BFV-Wettbewerb"
      src={widgetUrl(competitionId, host)}
      allowFullScreen
      referrerPolicy="strict-origin-when-cross-origin"
      style={{ height: HEIGHT }}
      className="w-full rounded-lg border border-zinc-200 bg-white dark:border-zinc-800"
    />
  );
}
