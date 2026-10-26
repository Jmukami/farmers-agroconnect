const dateLabel = (value) => new Intl.DateTimeFormat('en-KE', {
  weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
}).format(new Date(`${value}T00:00:00Z`));

const timeLabel = (value) => {
  const [hour, minute] = value.split(':');
  return `${Number(hour) % 12 || 12}:${minute} ${Number(hour) < 12 ? 'am' : 'pm'}`;
};

export default function ExpertAvailability({ slots }) {
  const groups = new Map();
  for (const slot of [...(slots || [])].sort((a, b) => `${a.date}T${a.startTime}`.localeCompare(`${b.date}T${b.startTime}`))) {
    if (!groups.has(slot.date)) groups.set(slot.date, []);
    groups.get(slot.date).push(slot);
  }
  return <section className="availability-panel" aria-label="Published availability">
    <div className="availability-heading"><div><p className="eyebrow">SkillBridge schedule</p><h3>Published availability</h3></div><span className="timezone-badge">East Africa Time ? UTC+03:00</span></div>
    <p className="availability-note">All times are in East Africa Time (EAT), shared by you and the expert. Suggest your preferred appointment below.</p>
    {slots === null ? <p role="status">The schedule could not be loaded. You can refresh it or suggest a preferred time below.</p> : !slots.length ? <p>No published times at the moment. You can still suggest a preferred time below.</p> : <div className="availability-days">{[...groups].map(([date, entries]) => <article className="availability-day" key={date}>
      <h4><time dateTime={date}>{dateLabel(date)}</time></h4>
      <ul>{entries.map((slot, index) => <li key={`${slot.startTime}-${index}`}><strong>{timeLabel(slot.startTime)}</strong><span>{slot.durationMinutes} min</span></li>)}</ul>
    </article>)}</div>}
    {!!slots?.length && <p className="availability-footnote">Sending a consultation request does not reserve a published time. SkillBridge will confirm the appointment.</p>}
  </section>;
}
