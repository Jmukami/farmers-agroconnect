import { useMemo, useState } from 'react';
import { apiRequest } from '../api/client';
import { useApp } from '../context/useApp';
import FilterBar from '../components/FilterBar';
import { EmptyState, ListingsSkeleton } from '../components/Feedback';
import Icon from '../components/Icon';
import ListingCard from '../components/ListingCard';
import ListingFormDialog from '../components/ListingFormDialog';

function matches(listings, search, category, county) {
  const query = search.trim().toLowerCase();
  return listings.filter((listing) => (!query || `${listing.title} ${listing.description} ${listing.sellerName}`.toLowerCase().includes(query)) && (!category || listing.category === category) && (!county || listing.county === county));
}

export default function MarketplacePage() {
  const { catalogs, loading, user, token, addToCart, requireAuth, showToast, refreshListings, setAuthDialog } = useApp();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [county, setCounty] = useState('');
  const [editing, setEditing] = useState(null);
  const listings = useMemo(() => matches(catalogs.produce, search, category, county), [catalogs.produce, search, category, county]);

  const openPostForm = () => requireAuth((currentSession) => {
    if (currentSession.user.role !== 'farmer') return showToast('Use a farmer account to post produce listings.', 'error');
    setEditing({});
  }, 'register');
  const deleteListing = async (listing) => {
    if (!window.confirm(`Delete “${listing.title}”? This cannot be undone.`)) return;
    try {
      await apiRequest(`/produce/${listing.id}`, { method: 'DELETE', token });
      await refreshListings('produce');
      showToast('Listing deleted.');
    } catch (error) { showToast(error.message, 'error'); }
  };

  return (
    <div className="page-wrap">
      <section className="page-heading split-heading">
        <div><p className="eyebrow">Produce market</p><h1>Buy directly from farmers</h1><p>Search current listings by product, category and county.</p></div>
        <button className="button button-primary" onClick={openPostForm}><Icon name="plus" size={17} /> Post produce</button>
      </section>
      <FilterBar search={search} onSearch={setSearch} category={category} onCategory={setCategory} county={county} onCounty={setCounty} listings={catalogs.produce} />
      {loading.produce ? <ListingsSkeleton /> : listings.length ? <div className="listing-grid">{listings.map((listing) => <ListingCard key={listing.id} listing={listing} type="produce" onAdd={addToCart} isOwner={listing.ownerId === user?.id} onEdit={setEditing} onDelete={deleteListing} />)}</div> : <EmptyState title="No produce matches those filters" detail="Try a different search or clear one of the filters." action={<button className="button button-secondary" onClick={() => { setSearch(''); setCategory(''); setCounty(''); }}>Clear filters</button>} />}
      {!user && <section className="quiet-callout"><div><strong>Are you a farmer?</strong><p>Post a produce listing when you have stock ready to sell.</p></div><button className="text-button" onClick={() => setAuthDialog('register')}>Create farmer account <Icon name="arrow" size={16} /></button></section>}
      {editing && <ListingFormDialog type="produce" listing={editing.id ? editing : null} onClose={() => setEditing(null)} />}
    </div>
  );
}
