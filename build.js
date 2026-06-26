console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? '設定済み' : '未設定（空）');
console.log('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? '設定済み' : '未設定（空）');

const fs = require('fs');
const path = require('path');

const envContent = 'window.__ENV__=' + JSON.stringify({
  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || ''
}) + ';';

fs.writeFileSync('env-config.js', envContent);
console.log('env-config.js生成内容:', envContent);

const vercelStaticDir = '/vercel/output/static';
if (fs.existsSync('/vercel/output')) {
  fs.mkdirSync(vercelStaticDir, { recursive: true });
  fs.copyFileSync('env-config.js', path.join(vercelStaticDir, 'env-config.js'));
  console.log('env-config.js を /vercel/output/static/ にコピー完了');
}
