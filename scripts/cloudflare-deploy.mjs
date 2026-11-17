import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const wranglerPath = path.join(rootDir, 'wrangler.toml');

function run(cmd, options = {}) {
  return execSync(cmd, {
    cwd: rootDir,
    encoding: 'utf-8',
    stdio: options.capture ? 'pipe' : 'inherit'
  });
}

console.log('1. Checking Cloudflare Wrangler authentication...');
try {
  run('npx wrangler whoami', { capture: true });
} catch {
  console.error('Not logged in to Cloudflare yet. Launching `npx wrangler login`...');
  run('npx wrangler login');
}

let toml = fs.readFileSync(wranglerPath, 'utf-8');

console.log('2. Provisioning Cloudflare D1 database (beeloft-metric-db)...');
let dbId = '';
const existingMatch = toml.match(/^\s*database_id\s*=\s*"([0-9a-f-]{36})"/m);
if (existingMatch) {
  dbId = existingMatch[1];
  console.log(`   Using existing D1 database_id: ${dbId}`);
} else {
  try {
    const listJson = run('npx wrangler d1 list --json', { capture: true });
    const parsed = JSON.parse(listJson);
    const hit = Array.isArray(parsed)
      ? parsed.find((d) => d.name === 'beeloft-metric-db')
      : null;
    if (hit?.uuid) {
      dbId = hit.uuid;
    }
  } catch {
    // Ignore parse errors and attempt creation
  }

  if (!dbId) {
    const createOut = run('npx wrangler d1 create beeloft-metric-db', { capture: true });
    const idMatch = createOut.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
    if (idMatch) {
      dbId = idMatch[1];
    }
  }

  if (dbId) {
    console.log(`   Binding D1 database_id=${dbId} in wrangler.toml...`);
    const d1Block = `\n[[d1_databases]]\nbinding = "DB"\ndatabase_name = "beeloft-metric-db"\ndatabase_id = "${dbId}"\n`;
    toml = toml.replace(/# \[\[d1_databases\]\][\s\S]*?# database_id = "[^"]*"/, d1Block.trim());
    if (!toml.includes(`database_id = "${dbId}"`)) {
      toml += d1Block;
    }
    fs.writeFileSync(wranglerPath, toml, 'utf-8');
  }
}

if (dbId) {
  console.log('3. Applying D1 production schema (migrations/0001_production_schema.sql)...');
  run('npx wrangler d1 execute beeloft-metric-db --remote --file=./migrations/0001_production_schema.sql');
}

console.log('4. Checking Cloudflare R2 bucket (beeloft-metric-media)...');
if (!/^\s*\[\[r2_buckets\]\]/m.test(toml)) {
  try {
    run('npx wrangler r2 bucket create beeloft-metric-media', { capture: true });
    const r2Block = `\n[[r2_buckets]]\nbinding = "MEDIA_BUCKET"\nbucket_name = "beeloft-metric-media"\n`;
    toml = toml.replace(/# \[\[r2_buckets\]\][\s\S]*?# bucket_name = "[^"]*"/, r2Block.trim());
    fs.writeFileSync(wranglerPath, toml, 'utf-8');
    console.log('   Bound R2 bucket beeloft-metric-media.');
  } catch {
    try {
      const r2List = run('npx wrangler r2 bucket list', { capture: true });
      if (r2List.includes('beeloft-metric-media')) {
        const r2Block = `\n[[r2_buckets]]\nbinding = "MEDIA_BUCKET"\nbucket_name = "beeloft-metric-media"\n`;
        toml = toml.replace(/# \[\[r2_buckets\]\][\s\S]*?# bucket_name = "[^"]*"/, r2Block.trim());
        fs.writeFileSync(wranglerPath, toml, 'utf-8');
        console.log('   Bound existing R2 bucket beeloft-metric-media.');
      }
    } catch {
      console.log('   R2 subscription not active on Cloudflare account yet; media uploads <= 1.5 MB will use D1 fallback.');
    }
  }
}

console.log('5. Building production frontend bundle (dist/)...');
run('npm run build');

console.log('6. Deploying Worker + Static Assets + Cron to beeloftmetric.biz.id...');
run('npx wrangler deploy');

console.log('\nDeployment complete: https://beeloftmetric.biz.id');
