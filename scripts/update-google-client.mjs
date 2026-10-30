import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const newClientId = process.argv[2]?.trim();

if (!newClientId || !newClientId.includes('.apps.googleusercontent.com')) {
  console.error('Usage: node scripts/update-google-client.mjs <NEW_GOOGLE_CLIENT_ID>');
  console.error('Example: node scripts/update-google-client.mjs 123456789-abcdef.apps.googleusercontent.com');
  process.exit(1);
}

const rootDir = process.cwd();
const envPath = path.join(rootDir, '.env');
const envProdPath = path.join(rootDir, '.env.production');

function updateEnvFile(filePath, key, value) {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf-8');
  const regex = new RegExp(`^${key}=.*$`, 'm');
  if (regex.test(content)) {
    content = content.replace(regex, `${key}="${value}"`);
  } else {
    content += `\n${key}="${value}"\n`;
  }
  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`Updated ${key} in ${path.basename(filePath)}`);
}

updateEnvFile(envPath, 'VITE_GOOGLE_CLIENT_ID', newClientId);
updateEnvFile(envProdPath, 'VITE_GOOGLE_CLIENT_ID', newClientId);

console.log('Successfully updated local env files.');
