import { useState } from 'react';
import Home from './Home';
import Register from './Register';
import Inputs from './Inputs'; // Assuming your current page code is inside Inputs.jsx

export default function App() {
  const [currentPage, setCurrentPage] = useState('home');

  return (
    <div>
      {/* Top Navigation Bar */}
      <nav style={{ display: 'flex', gap: '1rem', padding: '1rem', background: '#f0f0f0' }}>
        <button onClick={() => setCurrentPage('home')}>Home</button>
        <button onClick={() => setCurrentPage('register')}>Register</button>
        <button onClick={() => setCurrentPage('inputs')}>Farm Inputs</button>
      </nav>

      {/* Conditional Page Rendering */}
      {currentPage === 'home' && <Home navigateTo={setCurrentPage} />}
      {currentPage === 'register' && <Register navigateTo={setCurrentPage} />}
      {currentPage === 'inputs' && <Inputs />}
    </div>
  );
}