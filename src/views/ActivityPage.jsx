import { useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../api/client';
import { useApp } from '../context/useApp';
import { EmptyState, ListingsSkeleton } from '../components/Feedback';
import Icon from '../components/Icon';
import ListingCard from '../components/ListingCard';
import ListingFormDialog from '../components/ListingFormDialog';
import { formatKsh } from '../utils/format';

function orderDate(value) {
  return new Intl.DateTimeFormat('en-KE', { dateStyle: 'medium' }).format(new Date(`${value}Z`));
}

export default function ActivityPage() {
  const { user, token, catalogs, loading, setAuthDialog, showToast, refreshListings } = useApp();
  const [tab, setTab] = useState('listings');
  const [orders, setOrders] = useState([]);
  const [messages, setMessages] = useState([]);
  const [remoteLoading, setRemoteLoading] = useState(false);
  const [editing, setEditing] = useState(null);

  const myListings = useMemo(() => ({
    produce: catalogs.produce.filter((listing) => listing.ownerId === user?.id),
    products: catalogs.products.filter((listing) => listing.ownerId === user?.id),
  }), [catalogs, user]);

  useEffect(() => {
    if (!user || tab === 'listings') return undefined;
    let current = true;
    const path = tab === 'orders' ? '/orders' : '/messages';
    apiRequest(path, { token })
      .then((response) => { if (current) (tab === 'orders' ? setOrders : setMessages)(tab === 'orders' ? response.orders : response.messages); })
      .catch((error) => { if (current) showToast(error.message, 'error'); })
      .finally(() => { if (current) setRemoteLoading(false); });
    return () => { current = false; };
  }, [tab, user, token, showToast]);

  if (!user) return <div className="page-wrap"><EmptyState title="Sign in to view your activity" detail="Your listings, messages and orders stay in one place once you have an account." action={<button className="button button-primary" onClick={() => setAuthDialog('login')}>Sign in</button>} /></div>;

  const postNew = () => {
    if (user.role === 'buyer') return showToast('Buyer accounts can place orders and message sellers, but cannot post listings.', 'error');
    setEditing({ type: user.role === 'farmer' ? 'produce' : 'product' });
  };
  const selectTab = (nextTab) => {
    if (nextTab !== 'listings') setRemoteLoading(true);
    setTab(nextTab);
  };
  const deleteListing = async (listing, type) => {
    if (!window.confirm(`Delete “${listing.title}”? This cannot be undone.`)) return;
    try {
      await apiRequest(`${type === 'produce' ? '/produce' : '/products'}/${listing.id}`, { method: 'DELETE', token });
      await refreshListings(type);
      showToast('Listing deleted.');
    } catch (error) { showToast(error.message, 'error'); }
  };
  const changeOrderStatus = async (order, status) => {
    try {
      await apiRequest(`/orders/${order.id}/status`, { method: 'PATCH', token, body: { status } });
      setOrders((current) => current.map((item) => item.id === order.id ? { ...item, status } : item));
      showToast(`Order #${order.id} marked as ${status}.`);
    } catch (error) { showToast(error.message, 'error'); }
  };

  const listings = user.role === 'farmer' ? myListings.produce : user.role === 'supplier' ? myListings.products : [];
  const listingType = user.role === 'farmer' ? 'produce' : 'product';

  return (
    <div className="page-wrap activity-page">
      <section className="page-heading split-heading"><div><p className="eyebrow">My activity</p><h1>Welcome, {user.fullName}</h1><p>{user.role === 'buyer' ? 'Review orders and stay in touch with sellers.' : 'Manage your listings, messages and orders.'}</p></div>{user.role !== 'buyer' && <button className="button button-primary" onClick={postNew}><Icon name="plus" size={17} /> New listing</button>}</section>
      <div className="tab-list" role="tablist" aria-label="Activity sections"><button role="tab" aria-selected={tab === 'listings'} className={tab === 'listings' ? 'is-selected' : ''} onClick={() => selectTab('listings')}>Listings</button><button role="tab" aria-selected={tab === 'orders'} className={tab === 'orders' ? 'is-selected' : ''} onClick={() => selectTab('orders')}>Orders</button><button role="tab" aria-selected={tab === 'messages'} className={tab === 'messages' ? 'is-selected' : ''} onClick={() => selectTab('messages')}>Messages</button></div>
      {tab === 'listings' && (loading.produce || loading.products ? <ListingsSkeleton count={3} /> : listings.length ? <div className="listing-grid">{listings.map((listing) => <ListingCard key={listing.id} listing={listing} type={listingType} isOwner onEdit={(next) => setEditing({ type: listingType, listing: next })} onDelete={(next) => deleteListing(next, listingType)} />)}</div> : <EmptyState title={user.role === 'buyer' ? 'Buyer accounts do not post listings' : 'You have no listings yet'} detail={user.role === 'buyer' ? 'Browse the market, contact sellers and place an order when ready.' : 'Create your first listing so people can find you.'} action={user.role !== 'buyer' ? <button className="button button-primary" onClick={postNew}>Create listing</button> : null} />)}
      {tab === 'orders' && (remoteLoading ? <div className="panel-loader">Loading orders…</div> : orders.length ? <div className="activity-list">{orders.map((order) => <article className="activity-card" key={order.id}><div className="activity-card-header"><div><p className="eyebrow">Order #{order.id}</p><h2>{order.buyerId === user.id ? 'Your purchase' : `Order from ${order.buyerName}`}</h2></div><span className={`status status-${order.status}`}>{order.status}</span></div><ul className="order-items">{order.items.map((item) => <li key={item.id}><span>{item.quantity} × {item.title}</span><span>{formatKsh(item.price * item.quantity)}</span></li>)}</ul><div className="activity-card-footer"><span>{orderDate(order.createdAt)} · {formatKsh(order.total)}</span><div>{order.buyerId === user.id && order.status === 'pending' && <button className="button button-secondary" onClick={() => changeOrderStatus(order, 'cancelled')}>Cancel order</button>}{order.items.some((item) => item.sellerId === user.id) && order.status === 'pending' && <button className="button button-secondary" onClick={() => changeOrderStatus(order, 'confirmed')}>Confirm</button>}{order.items.some((item) => item.sellerId === user.id) && order.status === 'confirmed' && <button className="button button-primary" onClick={() => changeOrderStatus(order, 'fulfilled')}>Mark fulfilled</button>}</div></div></article>)}</div> : <EmptyState title="No orders yet" detail="Orders you place and receive will appear here." />)}
      {tab === 'messages' && (remoteLoading ? <div className="panel-loader">Loading messages…</div> : messages.length ? <div className="activity-list">{messages.map((message) => <article className="activity-card message-card" key={message.id}><div><p className="eyebrow">{message.senderId === user.id ? `To ${message.recipientName}` : `From ${message.senderName}`}</p><h2>{message.subject}</h2></div><p>{message.body}</p><span className="message-date">{orderDate(message.createdAt)}</span></article>)}</div> : <EmptyState title="No messages yet" detail="Use the Contact button on a listing to ask a seller a question." />)}
      {editing && <ListingFormDialog type={editing.type} listing={editing.listing || null} onClose={() => setEditing(null)} />}
    </div>
  );
}
