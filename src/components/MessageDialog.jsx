import { useState } from 'react';
import { ApiError, apiRequest } from '../api/client';
import { useApp } from '../context/useApp';
import { FieldError } from './Feedback';
import Icon from './Icon';

export default function MessageDialog({ listing, onClose }) {
  const { token, showToast } = useApp();
  const [form, setForm] = useState({ subject: `Regarding ${listing.title}`, body: '' });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    const clientErrors = {};
    if (form.subject.trim().length < 3) clientErrors.subject = 'Use a subject of at least 3 characters.';
    if (form.body.trim().length < 10) clientErrors.body = 'Write at least 10 characters.';
    if (Object.keys(clientErrors).length) return setErrors(clientErrors);
    setErrors({});
    setSubmitError('');
    setIsSubmitting(true);
    try {
      await apiRequest('/messages', { method: 'POST', token, body: { ...form, recipientId: listing.ownerId } });
      showToast(`Message sent to ${listing.sellerName}.`);
      onClose();
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors(error.fields);
        setSubmitError(error.message);
      } else setSubmitError('Unable to send your message. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="dialog-backdrop" role="presentation">
      <section className="dialog message-dialog" role="dialog" aria-modal="true" aria-labelledby="message-title">
        <button className="dialog-close icon-button" onClick={onClose} aria-label="Close message form"><Icon name="close" /></button>
        <p className="eyebrow">Contact seller</p>
        <h1 id="message-title">Message {listing.sellerName}</h1>
        <p className="dialog-intro">Ask about <strong>{listing.title}</strong>, pickup, delivery or a quotation.</p>
        {submitError && <div className="form-alert" role="alert">{submitError}</div>}
        <form onSubmit={submit} noValidate>
          <label>Subject<input name="subject" value={form.subject} onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value }))} /><FieldError error={errors.subject} /></label>
          <label>Message<textarea name="body" value={form.body} onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))} rows="5" placeholder="Hello, I would like to ask about…" /><FieldError error={errors.body} /></label>
          <button className="button button-primary button-full" disabled={isSubmitting}><Icon name="message" size={17} /> {isSubmitting ? 'Sending…' : 'Send message'}</button>
        </form>
      </section>
    </div>
  );
}
