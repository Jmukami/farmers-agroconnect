export default function SkillBridgeWordmark() {
  return <div className="skillbridge-wordmark">
    <svg width="32" height="32" viewBox="0 0 120 120" aria-hidden="true">
      <rect x="0" y="0" width="120" height="120" rx="16" fill="#ECFDF5" />
      <rect x="16" y="30" width="88" height="60" rx="6" fill="#10B981" />
      <rect x="20" y="34" width="80" height="52" rx="4" fill="none" stroke="#ECFDF5" strokeWidth="1.5" />
      <circle cx="60" cy="60" r="16" fill="none" stroke="#ECFDF5" strokeWidth="1.5" />
      <text x="60" y="68" fontFamily="'Space Grotesk',sans-serif" fontSize="26" fontWeight="700" fill="#ECFDF5" textAnchor="middle">S</text>
    </svg>
    <span>Skill<span className="skillbridge-wordmark-accent">Bridge</span></span>
  </div>;
}
