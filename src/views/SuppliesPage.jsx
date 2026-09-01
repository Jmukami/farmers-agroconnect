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

export default function SuppliesPage() {
  const { catalogs, loading, user, token, addToCart, requireAuth, showToast, refreshListings, setAuthDialog } = useApp();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [county, setCounty] = useState('');
  const [kind, setKind] = useState('all');
  const [editing, setEditing] = useState(null);
  const visibleListings = useMemo(() => matches(catalogs.products.filter((listing) => kind === 'all' || listing.kind === kind), search, category, county), [catalogs.products, kind, search, category, county]);

  const openPostForm = () => requireAuth((currentSession) => {
    if (currentSession.user.role !== 'supplier') return showToast('Use a supplier account to post inputs or services.', 'error');
    setEditing({});
  }, 'register');
  const deleteListing = async (listing) => {
    if (!window.confirm(`Delete “${listing.title}”? This cannot be undone.`)) return;
    try {
      await apiRequest(`/products/${listing.id}`, { method: 'DELETE', token });
      await refreshListings('products');
      showToast('Listing deleted.');
    } catch (error) { showToast(error.message, 'error'); }
  };

  return (
    <div className="page-wrap">
      <section className="page-heading split-heading">
        <div><p className="eyebrow">Farm inputs & services</p><h1>Find what your farm needs</h1><p>Compare local input suppliers and book practical farm services.</p></div>
        <button className="button button-primary" onClick={openPostForm}><Icon name="plus" size={17} /> Post offering</button>
      </section>
      <div className="segment-control" aria-label="Listing type"><button className={kind === 'all' ? 'is-selected' : ''} onClick={() => setKind('all')}>All</button><button className={kind === 'input' ? 'is-selected' : ''} onClick={() => setKind('input')}>Farm inputs</button><button className={kind === 'service' ? 'is-selected' : ''} onClick={() => setKind('service')}>Services</button></div>
      <FilterBar search={search} onSearch={setSearch} category={category} onCategory={setCategory} county={county} onCounty={setCounty} listings={catalogs.products} />
      {loading.products ? <ListingsSkeleton /> : visibleListings.length ? <div className="listing-grid">{visibleListings.map((listing) => <ListingCard key={listing.id} listing={listing} type="product" onAdd={addToCart} isOwner={listing.ownerId === user?.id} onEdit={setEditing} onDelete={deleteListing} />)}</div> : <EmptyState title="No listings match those filters" detail="Try a different search or clear one of the filters." action={<button className="button button-secondary" onClick={() => { setSearch(''); setCategory(''); setCounty(''); setKind('all'); }}>Clear filters</button>} />}
      {!user && <section className="quiet-callout"><div><strong>Do you sell farm inputs or services?</strong><p>Create an account when you are ready to post an offering.</p></div><button className="text-button" onClick={() => setAuthDialog('register')}>Create supplier account <Icon name="arrow" size={16} /></button></section>}
      {editing && <ListingFormDialog type="product" listing={editing.id ? editing : null} onClose={() => setEditing(null)} />}
    </div>
  );
}
