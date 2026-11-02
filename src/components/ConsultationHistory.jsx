import { useEffect, useState } from 'react';
import { apiRequest } from '../api/client';
import { useApp } from '../context/useApp';
import SkillBridgeSkeleton from './SkillBridgeSkeleton';
import { EmptyState } from './Feedback';

function consultationStatus(consultation) {
  if (['unknown', 'submitting'].includes(consultation.submissionState)) return { label: 'Awaiting verification', tone: 'uncertain' };
  if (consultation.submissionState === 'rejected') return { label: 'Request not accepted', tone: 'rejected' };
  const status = consultation.partnerStatus?.trim() || 'Submitted';
  const normalized = status.toLowerCase();
  return { label: normalized === 'pending' ? 'Pending confirmation' : status, tone: ['confirmed', 'completed', 'accepted'].includes(normalized) ? 'positive' : ['rejected', 'cancelled'].includes(normalized) ? 'rejected' : ['pending', 'submitted'].includes(normalized) ? 'pending' : 'neutral' };
}

export default function ConsultationHistory() {
  const { token } = useApp();
  const [result, setResult] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const loading = result?.token !== token || result?.attempt !== attempt;
  useEffect(() => {
    let current = true;
    apiRequest('/skillbridge/requests', { token }).then((data) => { if (current) setResult({ token, attempt, data }); }).catch((error) => { if (current) setResult({ token, attempt, error: error.message }); });
    return () => { current = false; };
  }, [token, attempt]);
  return <section className="consultation-history">
    <div className="consultation-history-heading"><div><h2>Your consultations</h2><p>Keep track of the requests you have sent to SkillBridge.</p></div><button className="button button-secondary" disabled={loading} onClick={() => setAttempt((n) => n + 1)}>{loading ? 'Refreshing...' : 'Refresh history'}</button></div>
    {loading ? <SkillBridgeSkeleton variant="consultations" /> : result.error ? <div className="consultation-error" role="alert"><p>{result.error}</p><button className="text-button" onClick={() => setAttempt((n) => n + 1)}>Try again</button></div> : !result.data.consultations.length ? <EmptyState title="Your next conversation starts here" detail="Find an agricultural expert and send a consultation request. Your requests will appear here." /> : <>
      <div className="activity-list">{result.data.consultations.map((c) => {
        const status = consultationStatus(c);
        const date = new Date(c.date);
        const format = (options) => new Intl.DateTimeFormat('en-KE', { ...options, timeZone: 'Africa/Nairobi' }).format(date);
        return <article className="consultation-card" key={c.id}>
          <div className="consultation-date" aria-hidden="true"><span>{format({ month: 'short' })}</span><strong>{format({ day: 'numeric' })}</strong><span>{format({ year: 'numeric' })}</span></div>
          <div className="consultation-content">
            <div className="consultation-card-heading"><div><h3>{c.expertName}</h3></div><span className={`consultation-status consultation-status-${status.tone}`}>{status.label}</span></div>
            <p className="consultation-topic">{c.topic}</p>
            <p className="consultation-time"><time dateTime={c.date}>{format({ weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })} &middot; {format({ hour: 'numeric', minute: '2-digit', hour12: true })} EAT</time></p>
            {/* {['unknown', 'submitting'].includes(c.submissionState) ? <p className="consultation-notice">SkillBridge may have received this request. Contact them to verify it before submitting another.</p> : status.tone === 'pending' && <p className="consultation-hint">Request sent. Appointment confirmation is still pending.</p>} */}
            {/* <div className="consultation-reference"><span>Request #{c.id}</span>{c.requestId && <span>SkillBridge #{c.requestId}</span>}</div> */}
          </div>
        </article>;
      })}</div>
      <p className="consultation-history-note">Statuses reflect SkillBridge's response when each request was submitted. Refresh reloads your saved history; SkillBridge does not currently provide live status updates.</p>
    </>}
  </section>;
}
