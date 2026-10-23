// Standalone seeding script
import fetch from 'node-fetch';

async function runSeed() {
  const port = process.env.PORT || 5000;
  console.log(`Connecting to EduMate server on port ${port}...`);
  try {
    const res = await fetch(`http://localhost:${port}/api/seed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await res.json();
    console.log('Seed response:', data);
  } catch (err) {
    console.log('Server not reachable on port', port, '- if running in standalone script, check server.');
  }
}

runSeed();
