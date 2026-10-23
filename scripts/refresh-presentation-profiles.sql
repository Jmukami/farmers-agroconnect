-- Run against the hosted Turso database to update only the original fixture profiles.
-- Synthetic presentation data; no changes to real user profiles or credentials.
BEGIN TRANSACTION;
UPDATE users SET full_name = 'Daniel Kamau', focus = 'Horticulture and mixed farming'
WHERE email = 'nakuru-farmer@downstream-demo.invalid' AND full_name = 'DEMO Nakuru Farmer' AND role = 'farmer';
UPDATE users SET full_name = 'Akinyi Ouma', focus = 'Rice and mixed farming'
WHERE email = 'kisumu-farmer@downstream-demo.invalid' AND full_name = 'DEMO Kisumu Farmer' AND role = 'farmer';
UPDATE users SET full_name = 'Mavuno Farm Supplies', focus = 'Seeds, irrigation and soil advisory'
WHERE email = 'supplier@downstream-demo.invalid' AND full_name = 'DEMO Farm Supplies' AND role = 'supplier';
COMMIT;
