import { useState } from 'react';

export default function Register({ navigateTo }) {
  const [formData, setFormData] = useState({ name: '', phone: '', location: '', cropType: '' });

  const handleSubmit = (e) => {
    e.preventDefault();
    alert(`Registration successful for ${formData.name}!`);
    navigateTo('inputs'); // Redirect to inputs after registration
  };

  return (
    <div style={{ maxWidth: '400px', margin: '2rem auto', padding: '1rem' }}>
      <h2>Farmer Registration</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <input 
          type="text" 
          placeholder="Full Name" 
          required 
          onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
        />
        <input 
          type="tel" 
          placeholder="Phone Number (e.g., 0712345678)" 
          required 
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })} 
        />
        <input 
          type="text" 
          placeholder="County / Location" 
          required 
          onChange={(e) => setFormData({ ...formData, location: e.target.value })} 
        />
        <input 
          type="text" 
          placeholder="Main Crops / Livestock" 
          onChange={(e) => setFormData({ ...formData, cropType: e.target.value })} 
        />
        <button type="submit">Submit Registration</button>
      </form>
    </div>
  );
}