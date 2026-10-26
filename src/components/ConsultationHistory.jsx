import { useEffect, useState } from 'react';
import { apiRequest } from '../api/client';
import { useApp } from '../context/useApp';

export default function ConsultationHistory() {
  const { token } = useApp();
  const [result, setResult] = useState(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let current = true;
    apiRequest('/skillbridge/requests', { token }).then((data) => { if (current) setResult({ token, data }); }).catch((error) => { if (current) setResult({ token, error: error.message }); });
    return () => { current = false; };
  }, [token, attempt]);
  return <section>
    <button className="button button-secondary" onClick={() => setAttempt((n) => n + 1)}>Refresh history</button>
    {result?.token !== token ? <p role="status">Loading consultations…</p> : result.error ? <p role="alert">{result.error}</p> : !result.data.consultations.length ? <p>No consultation requests yet.</p> : <div className="activity-list">{result.data.consultations.map((c) => <article className="activity-card" key={c.id}><h2>{c.expertName}</h2><p>{c.topic}</p><p>{new Intl.DateTimeFormat('en-KE', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Nairobi' }).format(new Date(c.date))} EAT</p><p>{c.partnerStatus}`</p>{['unknown', 'submitting'].includes(c.submissionState) && <p>The outcome has not been confirmed. Contact SkillBridge before submitting another request.</p>}</article>)}</div>}
  </section>;
}
