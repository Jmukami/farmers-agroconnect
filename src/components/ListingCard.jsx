import Icon from './Icon';

const kindLabels = { produce: 'Produce', input: 'Farm input', service: 'Service' };

const formatKsh = (value) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(value);

export default function ListingCard({ listing, type, onAdd, isOwner, onEdit, onDelete }) {
  const kind = type === 'produce' ? 'produce' : listing.kind;

  const quantityLabel = kind === 'service' ? `${listing.quantity} slots` : `${listing.quantity} available`;
  return (
    <article className="listing-card">
      <div className="listing-topline"><span className={`tag tag-${kind}`}>{kindLabels[kind]}</span><span className="listing-category">{listing.category}</span></div>
      <div className="listing-content">
        <h2>{listing.title}</h2>
        <p className="listing-description">{listing.description}</p>
        <dl className="listing-details">
          <div><dt>Price</dt><dd>{formatKsh(listing.price)} <span>/ {listing.unit}</span></dd></div>
          <div><dt>Availability</dt><dd>{quantityLabel}</dd></div>
          <div><dt>Location</dt><dd><Icon name="location" size={15} /> {listing.county}</dd></div>
        </dl>
      </div>
      <div className="seller-row"><span>Listed by <strong>{listing.sellerName}</strong></span>{isOwner ? <span className="owner-note">Your listing</span> : null}</div>
      <div className="listing-actions">
        {isOwner ? (
          <><button className="button button-secondary" onClick={() => onEdit(listing)}><Icon name="edit" size={17} /> Edit</button><button className="button button-danger" onClick={() => onDelete(listing)}><Icon name="trash" size={17} /> Delete</button></>
        ) : <button className="button button-primary" disabled={listing.quantity < 1} onClick={() => onAdd(listing, type)}><Icon name="plus" size={17} /> {kind === 'service' ? 'Add service' : 'Add to order'}</button>}
      </div>
    </article>
  );
}
