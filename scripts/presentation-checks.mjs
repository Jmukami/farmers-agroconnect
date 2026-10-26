import { spawnSync } from 'node:child_process';

const baseUrl = (process.argv[2] || 'http://127.0.0.1:5173/api').replace(/\/$/, '');
function read(path, expected = 200) {
  console.log(`\nGET ${baseUrl}${path}`);
  const result = spawnSync(process.platform === 'win32' ? 'curl.exe' : 'curl', [
    '--silent', '--show-error', '--max-time', '65', '--write-out', '\n%{http_code}', `${baseUrl}${path}`,
  ], { encoding: 'utf8', timeout: 70000 });
  if (result.error || result.status !== 0) throw new Error(result.error?.message || result.stderr || 'curl failed');
  const split = result.stdout.lastIndexOf('\n');
  const status = Number(result.stdout.slice(split + 1));
  const body = result.stdout.slice(0, split);
  console.log(`HTTP ${status}\n${body}`);
  if (status !== expected) throw new Error(`Expected HTTP ${expected}; received ${status}. Retry this safe GET after service recovery.`);
  return JSON.parse(body);
}

try {
  read('/health');
  const farmers = read('/farmers').farmers;
  const farmer = farmers.find((item) => item.fullName === 'Daniel Kamau');
  if (!farmer) throw new Error('Presentation farmer not found. Check current hosted sample data.');
  read(`/farmers/${farmer.id}`);
  read(`/farmers/${farmer.id}/farm-location`);
  const products = read('/products').listings;
  const product = products.find((item) => item.stock > 0);
  if (!product) throw new Error('No stocked product available.');
  read(`/products/${product.id}`);
  read(`/products/${product.id}/inventory`);
  const empty = products.find((item) => item.stock === 0);
  if (empty) read(`/products/${empty.id}/inventory`);
  const produce = read('/produce').listings[0];
  if (produce) read(`/produce/${produce.id}`);
  read('/products/not-an-id', 400);
  read('/auth/me', 401);
  read('/skillbridge/skills?tag=Agriculture');
  const expert = read('/skillbridge/experts').experts[0];
  if (!expert) throw new Error('No agricultural experts available from SkillBridge.');
  read(`/skillbridge/experts/${expert.id}`);
  read(`/skillbridge/experts/${expert.id}/reviews`);
  read(`/skillbridge/experts/${expert.id}/availability`);
  read('/skillbridge/experts?sort=proximity&lat=-1.286&lng=36.817');
  read('/skillbridge/experts?sort=proximity', 400);
  console.log('\nAll presentation reads passed. No bookings, orders or other writes were made.');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
