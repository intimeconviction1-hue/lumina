import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

const timeZone = "Europe/Paris";
const clock = new Intl.DateTimeFormat("fr-FR", { timeStyle: "short", timeZone });
const calendar = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone,
});

export default function HeaderClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let timer;
    const update = () => {
      clearTimeout(timer);
      const current = Date.now();
      setNow(new Date(current));
      timer = setTimeout(update, 60_000 - current % 60_000);
    };
    update();
    document.addEventListener("visibilitychange", update);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);

  return (
    <time
      dateTime={now.toISOString()}
      title="Heure de Paris"
      className="lumina-fade-in order-last flex basis-full items-center justify-center gap-2 whitespace-nowrap text-xs lg:order-none lg:basis-auto lg:px-2"
      style={{ color: "var(--text-secondary)" }}
    >
      <Clock aria-hidden="true" className="h-3.5 w-3.5" />
      <span className="font-semibold tabular-nums" style={{ color: "var(--text-primary)" }}>
        {clock.format(now)}
      </span>
      <span className="capitalize">{calendar.format(now)}</span>
    </time>
  );
}
