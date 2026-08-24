import Icon from './Icon';

export default function FilterBar({ search, onSearch, category, onCategory, county, onCounty, listings }) {
  const categories = [...new Set(listings.map((listing) => listing.category))].sort();
  const counties = [...new Set(listings.map((listing) => listing.county))].sort();
  return (
    <div className="filter-bar">
      <label className="search-field"><Icon name="search" size={18} /><span className="sr-only">Search listings</span><input value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Search listings" /></label>
      <label><span className="sr-only">Filter by category</span><select value={category} onChange={(event) => onCategory(event.target.value)}><option value="">All categories</option>{categories.map((item) => <option key={item}>{item}</option>)}</select></label>
      <label><span className="sr-only">Filter by county</span><select value={county} onChange={(event) => onCounty(event.target.value)}><option value="">All counties</option>{counties.map((item) => <option key={item}>{item}</option>)}</select></label>
    </div>
  );
}
