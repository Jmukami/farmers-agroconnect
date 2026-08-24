import { useState } from 'react';
import { ApiError, apiRequest } from '../api/client';
import { useApp } from '../context/useApp';
import { FieldError } from './Feedback';
import Icon from './Icon';

const emptyRegistration = { fullName: '', email: '', phone: '', county: '', role: 'buyer', focus: '', password: '' };

function validate(form, mode) {
  const fields = {};
  if (!/^\S+@\S+\.\S+$/.test(form.email)) fields.email = 'Enter a valid email address.';
  if (form.password.length < 8) fields.password = 'Use at least 8 characters.';
  if (mode === 'register') {
    if (form.fullName.trim().length < 2) fields.fullName = 'Enter your full name.';
    if (form.phone.replace(/\D/g, '').length < 9) fields.phone = 'Enter a valid phone number.';
    if (form.county.trim().length < 2) fields.county = 'Enter your county.';
  }
  return fields;
}

export default function AuthDialog() {
  const { authDialog, setAuthDialog, completeAuth } = useApp();
  const [mode, setMode] = useState(authDialog || 'login');
  const [login, setLogin] = useState({ email: '', password: '' });
  const [registration, setRegistration] = useState(emptyRegistration);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!authDialog) return null;
  const form = mode === 'login' ? login : registration;
  const setForm = mode === 'login' ? setLogin : setRegistration;

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setErrors({});
    setSubmitError('');
  };

  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    const clientErrors = validate(form, mode);
    if (Object.keys(clientErrors).length) return setErrors(clientErrors);
    setErrors({});
    setSubmitError('');
    setIsSubmitting(true);
    try {
      const response = await apiRequest(mode === 'login' ? '/auth/login' : '/auth/register', { method: 'POST', body: form });
      completeAuth({ user: response.user, token: response.token });
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors(error.fields);
        setSubmitError(error.message);
      } else setSubmitError('Unable to connect to the server. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="dialog-backdrop" role="presentation">
      <section className="dialog auth-dialog" role="dialog" aria-modal="true" aria-labelledby="auth-title">
        <button className="dialog-close icon-button" onClick={() => setAuthDialog(null)} aria-label="Close sign in"><Icon name="close" /></button>
        <p className="eyebrow">AgroConnect account</p>
        <h1 id="auth-title">{mode === 'login' ? 'Sign in to continue' : 'Create your account'}</h1>
        <p className="dialog-intro">{mode === 'login' ? 'Use your account to manage listings, messages and orders.' : 'Create an account only when you are ready to trade or post a listing.'}</p>
        {submitError && <div className="form-alert" role="alert">{submitError}</div>}
        <form onSubmit={submit} noValidate>
          {mode === 'register' && <>
            <div className="form-grid">
              <label>Full name<input name="fullName" value={registration.fullName} onChange={update} autoComplete="name" /> <FieldError error={errors.fullName} /></label>
              <label>Phone number<input name="phone" value={registration.phone} onChange={update} inputMode="tel" autoComplete="tel" placeholder="07xx xxx xxx" /> <FieldError error={errors.phone} /></label>
            </div>
            <div className="form-grid">
              <label>County<input name="county" value={registration.county} onChange={update} autoComplete="address-level1" /> <FieldError error={errors.county} /></label>
              <label>Account type<select name="role" value={registration.role} onChange={update}><option value="buyer">Buyer</option><option value="farmer">Farmer</option><option value="supplier">Input or service supplier</option></select><FieldError error={errors.role} /></label>
            </div>
            <label>Primary crops, livestock or business <span className="optional">Optional</span><input name="focus" value={registration.focus} onChange={update} placeholder="For example, horticulture or animal health" /></label>
          </>}
          <label>Email address<input type="email" name="email" value={form.email} onChange={update} autoComplete="email" /> <FieldError error={errors.email} /></label>
          <label>Password<input type="password" name="password" value={form.password} onChange={update} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /> <FieldError error={errors.password} /></label>
          <button className="button button-primary button-full" disabled={isSubmitting}>{isSubmitting ? 'Working…' : mode === 'login' ? 'Sign in' : 'Create account'}</button>
        </form>
        <p className="switch-copy">{mode === 'login' ? 'New to AgroConnect?' : 'Already have an account?'} <button className="text-button" onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}>{mode === 'login' ? 'Create an account' : 'Sign in'}</button></p>
      </section>
    </div>
  );
}
