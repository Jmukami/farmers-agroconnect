const expertApiVersions = {
  v1: {
    listPath: '/experts',
    detailPath: (id) => `/experts/${id}`,
    locationQuery: 'estate',
    parseList: (body) => parseExpertList(body, 'estate'),
    parseDetail: (body) => normalizeExpert(body, 'estate'),
  },
  v2: {
    listPath: '/v2/experts',
    detailPath: (id) => `/v2/experts/${id}`,
    locationQuery: 'location',
    parseList: (body) => body && Number.isSafeInteger(body.count) && body.count >= 0 && Array.isArray(body.data) && body.count >= body.data.length
      ? parseExpertList(body.data, 'location')
      : null,
    parseDetail: (body) => body && normalizeExpert(body.data, 'location'),
  },
};

function normalizeExpert(expert, locationField) {
  if (!expert || !Number.isSafeInteger(expert.id) || expert.id < 1 || typeof expert.name !== 'string' ||
      typeof expert[locationField] !== 'string' || !Number.isFinite(expert.rating) ||
      (expert.bio !== undefined && typeof expert.bio !== 'string') ||
      (expert.latitude !== undefined && !Number.isFinite(expert.latitude)) ||
      (expert.longitude !== undefined && !Number.isFinite(expert.longitude)) ||
      (expert.distanceKm !== undefined && (!Number.isFinite(expert.distanceKm) || expert.distanceKm < 0)) ||
      !Array.isArray(expert.skills) || !expert.skills.every((skill) => typeof skill === 'string')) return null;

  return {
    id: expert.id,
    name: expert.name,
    estate: expert[locationField],
    rating: expert.rating,
    ...(expert.bio !== undefined ? { bio: expert.bio } : {}),
    ...(expert.latitude !== undefined ? { latitude: expert.latitude } : {}),
    ...(expert.longitude !== undefined ? { longitude: expert.longitude } : {}),
    skills: expert.skills,
    ...(expert.distanceKm !== undefined ? { distanceKm: expert.distanceKm } : {}),
  };
}

function parseExpertList(rows, locationField) {
  if (!Array.isArray(rows)) return null;
  const experts = rows.map((expert) => normalizeExpert(expert, locationField));
  return experts.some((expert) => expert === null) ? null : experts;
}

export function getSkillBridgeExpertApi(version = process.env.SKILLBRIDGE_EXPERTS_VERSION || 'v2') {
  const api = expertApiVersions[version];
  if (!api) throw new Error('SKILLBRIDGE_EXPERTS_VERSION must be v1 or v2.');
  return api;
}
