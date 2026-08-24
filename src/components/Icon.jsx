const paths = {
  search: 'm21 21-4.35-4.35m2.35-5.15a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z',
  basket: 'M5 9h14l-1 11H6L5 9Zm3 0 4-5 4 5M9 13v3m6-3v3',
  plus: 'M12 5v14M5 12h14',
  close: 'm6 6 12 12M18 6 6 18',
  chevron: 'm9 18 6-6-6-6',
  message: 'M20 15a4 4 0 0 1-4 4H8l-4 3v-7a4 4 0 0 1-2-3.5v-5A4 4 0 0 1 6 3h10a4 4 0 0 1 4 4v8Z',
  edit: 'M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z',
  trash: 'M4 7h16m-10 4v6m4-6v6M9 7l1-3h4l1 3m-9 0 1 14h10l1-14',
  user: 'M20 21a8 8 0 0 0-16 0m12-14a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
  logout: 'M10 17l5-5-5-5m5 5H3m7-8V3h8a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-8v-1',
  location: 'M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Zm-8 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  box: 'm21 8-9 5-9-5m9 5v9m8.5-12.5L12 5 3.5 9.5 12 14l8.5-4.5ZM3.5 9.5V18l8.5 5m8.5-5V9.5',
  order: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  menu: 'M4 7h16M4 12h16M4 17h16',
  arrow: 'M5 12h14m-6-6 6 6-6 6',
};

export default function Icon({ name, size = 20, label }) {
  return (
    <svg className="icon-svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" role={label ? 'img' : undefined} aria-hidden={label ? undefined : true}>
      {label && <title>{label}</title>}
      <path d={paths[name] || paths.box} />
    </svg>
  );
}
