export default function SkillBridgeSkeleton({ variant = 'experts' }) {
  const profile = variant === 'profile';
  const consultations = variant === 'consultations';
  const label = profile ? 'Loading expert profile and availability' : consultations ? 'Loading consultations' : 'Loading SkillBridge experts';
  return <div role="status" aria-label={label} aria-busy="true" className={profile ? 'skillbridge-profile-loader' : consultations ? 'activity-list' : 'listing-grid expert-grid'}>
    {Array.from({ length: profile ? 1 : 3 }, (_, index) => <div key={index} aria-hidden="true" className={`skillbridge-skeleton ${profile ? 'skillbridge-skeleton-profile' : consultations ? 'skillbridge-skeleton-consultation' : ''}`}>
      <div className="skeleton-identity"><span className="skeleton-avatar" /><div><span className="skeleton-line skeleton-line-title" /><span className="skeleton-line skeleton-line-short" /></div></div>
      <span className="skeleton-line" /><span className="skeleton-line" /><span className="skeleton-line skeleton-line-short" />
      <div className="skeleton-chips"><span /><span /><span /></div>
      {profile && <div className="skeleton-schedule"><span /><span /><span /></div>}
      <span className="skeleton-line skeleton-line-action" />
    </div>)}
  </div>;
}
