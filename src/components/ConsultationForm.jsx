import { useRef, useState } from 'react';
import { apiRequest } from '../api/client';
import { useApp } from '../context/useApp';

export default function ConsultationForm({ expert }) {
  const { user, token, setAuthDialog } = useApp();
  const [topic, setTopic] = useState('');
  const [date, setDate] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const inFlight = useRef(false);
  const submit = async (event) => {
    event.preventDefault();
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setMessage('');
    try {
      // Both parties use confirmed EAT; serialize the chosen time as a UTC instant.
      const timestamp = new Date(`${date}:00+03:00`).toISOString();
      const { consultation } = await apiRequest('/skillbridge/requests', { method: 'POST', token, body: { expertId: expert.id, topic, date: timestamp } });
      setMessage(`Request #${consultation.requestId} submitted. SkillBridge returned: ${consultation.partnerStatus}. View it under My activity → Consultations.`);
    } catch (error) { setMessage(error.message); }
    finally { inFlight.current = false; setBusy(false); }
  };
  return <section className="consultation-panel"><p className="eyebrow">Arrange a conversation</p><h3>Suggest a preferred time</h3><p>Choose a date and time in East Africa Time (EAT, UTC+03:00). Your request will be sent to SkillBridge for confirmation.</p>
    {!user ? <button className="button button-secondary" onClick={() => setAuthDialog('login')}>Sign in to request advice</button> : <form onSubmit={submit} className="consultation-form">
      <label>What would you like help with?<textarea required minLength={3} maxLength={1000} value={topic} onChange={(e) => setTopic(e.target.value)} /></label>
      <label>Requested date and time (East Africa Time)<input required type="datetime-local" step="60" value={date} onChange={(e) => setDate(e.target.value)} /></label>
      <button className="button button-primary" disabled={busy}>{busy ? 'Submitting request…' : 'Send consultation request'}</button>
    </form>}
    {message && <p role="status">{message}</p>}
  </section>;
}
