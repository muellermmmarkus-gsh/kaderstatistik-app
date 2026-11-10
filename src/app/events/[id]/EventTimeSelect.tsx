"use client";

import { useState, useTransition } from "react";
import TimeSelects from "../TimeSelects";
import { updateEventTime } from "./actions";

/** Startuhrzeit eines Termins direkt im Termin aendern (speichert sofort). */
export default function EventTimeSelect({ eventId, time }: { eventId: string; time: string | null }) {
  const [value, setValue] = useState(time ? time.slice(0, 5) : "");
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const [pending, startTransition] = useTransition();

  function change(next: string) {
    const previous = value;
    setValue(next);
    setMessage(null);
    startTransition(async () => {
      const { error } = await updateEventTime(eventId, next);
      if (error) {
        setValue(previous);
        setMessage({ text: error, error: true });
      } else {
        setMessage({ text: "gespeichert" });
      }
    });
  }

  return (
    <span className="inline-flex items-center gap-1">
      <TimeSelects value={value} onChange={change} disabled={pending} compact />
      {message && (
        <span role="status" className={message.error ? "text-red-600" : "text-green-700 dark:text-green-400"}>
          {message.text}
        </span>
      )}
    </span>
  );
}
