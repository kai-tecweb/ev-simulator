console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? '設定済み' : '未設定（空）');
console.log('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? '設定済み' : '未設定（空）');
const fs = require('fs');
fs.writeFileSync(
  'env-config.js',
  'window.__ENV__=' + JSON.stringify({
    SUPABASE_URL: process.env.SUPABASE_URL || '',
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || ''
  }) + ';'
);
console.log('env-config.js生成内容:', fs.readFileSync('env-config.js', 'utf8'));
