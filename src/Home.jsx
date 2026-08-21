export default function Home({ navigateTo }) {
  return (
    <div style={{ textAlign: 'center', padding: '2rem' }}>
      <h1>Welcome to AgroHub</h1>
      <p>Empowering farmers with quality inputs, modern tools, and direct market access.</p>
      
      <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
        <button onClick={() => navigateTo('register')}>Register as a Farmer</button>
        <button onClick={() => navigateTo('inputs')}>Browse Farm Inputs</button>
      </div>
    </div>
  );
}