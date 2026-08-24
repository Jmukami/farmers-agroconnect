import { useState } from 'react';
import { ApiError, apiRequest } from '../api/client';
import { useApp } from '../context/useApp';
import { FieldError } from './Feedback';
import Icon from './Icon';

const blank = { kind: 'input', title: '', category: '', price: '', unit: '', quantity: '', county: '', description: '', availableFrom: '' };

function toForm(listing, type) {
  if (!listing) return { ...blank, kind: type === 'produce' ? 'produce' : 'input' };
  return { ...blank, ...listing, kind: listing.kind || type };
}

function validate(form) {
  const fields = {};
  if (form.title.trim().length < 2) fields.title = 'Enter a clear listing name.';
  if (form.category.trim().length < 2) fields.category = 'Enter a category.';
  if (form.price === '' || Number(form.price) < 0) fields.price = 'Enter a valid price.';
  if (!form.unit.trim()) fields.unit = 'Enter a unit.';
  if (!Number.isInteger(Number(form.quantity)) || Number(form.quantity) < 0) fields.quantity = 'Enter a whole number that is zero or more.';
  if (form.county.trim().length < 2) fields.county = 'Enter the county.';
  if (form.description.trim().length < 12) fields.description = 'Add at least 12 characters.';
  return fields;
}

export default function ListingFormDialog({ type, listing, onClose }) {
  const { token, refreshListings, showToast } = useApp();
  const [form, setForm] = useState(() => toForm(listing, type));
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isProduce = type === 'produce';
  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    const clientErrors = validate(form);
    if (Object.keys(clientErrors).length) return setErrors(clientErrors);
    setErrors({});
    setSubmitError('');
    setIsSubmitting(true);
    try {
      const endpoint = isProduce ? '/produce' : '/products';
      await apiRequest(listing ? `${endpoint}/${listing.id}` : endpoint, { method: listing ? 'PUT' : 'POST', token, body: form });
      await refreshListings(type);
      showToast(listing ? 'Listing updated.' : 'Listing published.');
      onClose();
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors(error.fields);
        setSubmitError(error.message);
      } else setSubmitError('Unable to save the listing. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="dialog-backdrop" role="presentation">
      <section className="dialog listing-dialog" role="dialog" aria-modal="true" aria-labelledby="listing-title">
        <button className="dialog-close icon-button" onClick={onClose} aria-label="Close listing form"><Icon name="close" /></button>
        <p className="eyebrow">{isProduce ? 'Produce listing' : 'Supplier listing'}</p>
        <h1 id="listing-title">{listing ? 'Edit listing' : `Post ${isProduce ? 'produce' : 'an offering'}`}</h1>
        {submitError && <div className="form-alert" role="alert">{submitError}</div>}
        <form onSubmit={submit} noValidate>
          {!isProduce && <label>Listing type<select name="kind" value={form.kind} onChange={update}><option value="input">Farm input</option><option value="service">Service</option></select><FieldError error={errors.kind} /></label>}
          <div className="form-grid"><label>Listing name<input name="title" value={form.title} onChange={update} placeholder={isProduce ? 'For example, fresh tomatoes' : 'For example, hybrid maize seed'} /><FieldError error={errors.title} /></label><label>Category<input name="category" value={form.category} onChange={update} placeholder={isProduce ? 'Vegetables' : 'Seeds'} /><FieldError error={errors.category} /></label></div>
          <div className="form-grid"><label>Price in KSh<input type="number" min="0" name="price" value={form.price} onChange={update} /><FieldError error={errors.price} /></label><label>Per unit<input name="unit" value={form.unit} onChange={update} placeholder="kg, bag, tray or visit" /><FieldError error={errors.unit} /></label></div>
          <div className="form-grid"><label>{isProduce ? 'Quantity available' : 'Stock or slots available'}<input type="number" min="0" step="1" name="quantity" value={form.quantity} onChange={update} /><FieldError error={errors.quantity} /></label><label>County<input name="county" value={form.county} onChange={update} /><FieldError error={errors.county} /></label></div>
          {isProduce && <label>Availability <span className="optional">Optional</span><input name="availableFrom" value={form.availableFrom} onChange={update} placeholder="For example, available now" /></label>}
          <label>Description<textarea name="description" value={form.description} onChange={update} rows="4" /><FieldError error={errors.description} /></label>
          <button className="button button-primary button-full" disabled={isSubmitting}>{isSubmitting ? 'Saving…' : listing ? 'Save changes' : 'Publish listing'}</button>
        </form>
      </section>
    </div>
  );
}
