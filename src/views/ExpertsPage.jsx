import { useEffect, useState } from 'react';
import { apiRequest } from '../api/client';
import ConsultationForm from '../components/ConsultationForm';

export default function ExpertsPage() {
  const [catalog, setCatalog] = useState(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [search, setSearch] = useState('');
  const [skill, setSkill] = useState('');
  const [estate, setEstate] = useState('');
  const [sort, setSort] = useState('rating');
  const [coordinates, setCoordinates] = useState(null);
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [locationError, setLocationError] = useState('');
  const [loadedQuery, setLoadedQuery] = useState('');
  const [profileAttempt, setProfileAttempt] = useState(0);
  const query = new URLSearchParams({ sort, ...(estate ? { estate } : {}), ...(coordinates && sort === 'proximity' ? coordinates : {}) }).toString();
  const [selected, setSelected] = useState(null);
  const [profile, setProfile] = useState(null);
  const [profileError, setProfileError] = useState('');
  useEffect(() => {
    let active = true;
    apiRequest(`/skillbridge/experts?${query}`).then((data) => { if (active) { setCatalog((previous) => ({ ...data, estates: previous?.estates || data.estates })); setError(''); setLoadedQuery(query); } }).catch((e) => { if (active) { setError(e.message); setLoadedQuery(query); } });
    return () => { active = false; };
  }, [attempt, query]);
  useEffect(() => {
    if (!selected) return;
    let active = true;
    apiRequest(`/skillbridge/experts/${selected}`).then((data) => { if (active) setProfile(data); }).catch((e) => { if (active) setProfileError(e.message); });
    return () => { active = false; };
  }, [selected, profileAttempt]);
  const experts = catalog?.experts.filter((e) => (!skill || e.skills.includes(skill)) && (!estate || e.estate === estate) && `${e.name} ${e.bio || ''} ${e.skills.join(' ')}`.toLowerCase().includes(search.toLowerCase())) || [];
  const choose = (id) => { setProfile(null); setProfileError(''); setSelected(id); setProfileAttempt((n) => n + 1); };
  return <div className="page-wrap">
    <section className="page-heading"><p className="eyebrow">Expert advice · Powered by SkillBridge</p><h1>Practical guidance for your farm</h1><p>Find agricultural mentors, explore their experience and view availability.</p></section>
    <form className="expert-location" onSubmit={(e) => { e.preventDefault(); if (!lat.trim() || !lng.trim() || !Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng)) || Math.abs(Number(lat)) > 90 || Math.abs(Number(lng)) > 180) { setLocationError('Enter valid latitude (−90 to 90) and longitude (−180 to 180).'); return; } setLocationError(''); setCoordinates({ lat, lng }); setSort('proximity'); }}>
      <label>Sort<select value={sort} onChange={(e) => { if (e.target.value === 'proximity' && !coordinates) { setLocationError('Enter your coordinates and choose Find nearest.'); return; } setSort(e.target.value); }}><option value="rating">Highest rated</option><option value="proximity">Nearest first</option></select></label>
      <label>Latitude<input type="number" step="any" min="-90" max="90" value={lat} onChange={(e) => setLat(e.target.value)} placeholder="e.g. -1.286" /></label>
      <label>Longitude<input type="number" step="any" min="-180" max="180" value={lng} onChange={(e) => setLng(e.target.value)} placeholder="e.g. 36.817" /></label>
      <button className="button button-secondary">Find nearest</button>
    </form>{locationError && <p role="alert">{locationError}</p>}
    {error && loadedQuery === query ? <div role="alert"><p>{error}</p><button className="button button-secondary" onClick={() => { setError(''); setAttempt((n) => n + 1); }}>Try again</button></div> : !catalog || loadedQuery !== query ? <p role="status">Loading SkillBridge experts…</p> : <>
      <div className="filter-bar expert-filters">
        <label>Search experts<input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name or farming topic" /></label>
        <label>Skill<select value={skill} onChange={(e) => setSkill(e.target.value)}><option value="">All agricultural skills</option>{catalog.skills.map((s) => <option key={s.id}>{s.name}</option>)}</select></label>
        <label>Location<select value={estate} onChange={(e) => setEstate(e.target.value)}><option value="">All locations</option>{catalog.estates.map((name) => <option key={name}>{name}</option>)}</select></label>
      </div>
      <p>{experts.length} {experts.length === 1 ? 'expert' : 'experts'} · {sort === 'proximity' ? 'Nearest first' : 'Highest rated first'}</p>
      <div className="listing-grid">{experts.map((e) => <article className="expert-card" key={e.id}><p className="eyebrow">{e.estate}</p><h2>{e.name}</h2><p>★ {e.rating} / 5{Number.isFinite(e.distanceKm) && ` · ${e.distanceKm} km away`}</p><p>{e.bio}</p><p>{e.skills.join(' · ')}</p><button className="button button-primary" onClick={() => choose(e.id)}>View profile & availability</button></article>)}</div>
      {!experts.length && <p>No experts match these filters. <button className="text-button" onClick={() => { setSearch(''); setSkill(''); setEstate(''); }}>Clear filters</button></p>}
    </>}
    {selected && <section className="expert-profile" aria-label="Expert profile" aria-live="polite"><button className="text-button" onClick={() => setSelected(null)}>Close profile</button>
      {profileError ? <div role="alert"><p>{profileError}</p><button className="button button-secondary" onClick={() => choose(selected)}>Retry profile</button></div> : !profile ? <p role="status">Loading profile…</p> : <><h2>{profile.expert.name}</h2><p>{profile.expert.estate}</p><p>{profile.expert.bio}</p><p>{profile.expert.skills.join(' · ')}</p>
        <h3>Review summary</h3>{profile.reviews ? <p>★ {profile.reviews.rating} / 5 · {profile.reviews.reviewCount} reviews · {profile.reviews.completedSessions} completed sessions</p> : <p>Reviews are temporarily unavailable.</p>}
        <h3>Availability</h3><p>These are SkillBridge's published times; their timezone is not yet confirmed. Enter consultation requests separately in East Africa Time.</p>
        {profile.availability === null ? <p>Availability is temporarily unavailable.</p> : !profile.availability.length ? <p>No slots are currently available.</p> : <ul className="expert-slots">{profile.availability.map((s, i) => <li key={`${s.date}-${s.startTime}-${i}`}>{s.date} at {s.startTime.slice(0, 5)} · {s.durationMinutes} minutes</li>)}</ul>}
        {(profile.reviews === null || profile.availability === null) && <button className="button button-secondary" onClick={() => choose(selected)}>Refresh unavailable sections</button>}
        <ConsultationForm key={profile.expert.id} expert={profile.expert} />
      </>}
    </section>}
  </div>;
}
