/**
 * Script de Exportação de Cópia Limpa do Sistema
 * Uso: node scripts/export-clean-copy.js [caminho_destino]
 */

const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const defaultTargetDir = path.resolve(projectRoot, '..', 'ElizaOliver-CopiaLimpa');
const targetDir = process.argv[2] ? path.resolve(process.argv[2]) : defaultTargetDir;

// Pastas e arquivos a ignorar no empacotamento limpo
const IGNORE_PATTERNS = [
  '.git',
  '.next',
  'node_modules',
  '.env.local',
  '.vercel',
  '.cursor',
  '.agents',
  'playwright-report',
  'test-results',
  'test_results.txt',
  'tsconfig.tsbuildinfo'
];

function copyFolderRecursiveSync(source, target) {
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }

  const files = fs.readdirSync(source);

  for (const file of files) {
    if (IGNORE_PATTERNS.includes(file)) {
      continue;
    }

    const currentSource = path.join(source, file);
    const currentTarget = path.join(target, file);
    const stat = fs.lstatSync(currentSource);

    if (stat.isDirectory()) {
      copyFolderRecursiveSync(currentSource, currentTarget);
    } else {
      fs.copyFileSync(currentSource, currentTarget);
    }
  }
}

console.log('🚀 Gerando cópia limpa do projeto...');
console.log(`📁 Origem: ${projectRoot}`);
console.log(`📂 Destino: ${targetDir}\n`);

try {
  copyFolderRecursiveSync(projectRoot, targetDir);

  // Criar template .env.example no destino se não existir
  const envExampleContent = `# Configurações de Ambiente - Novo Cliente
NEXT_PUBLIC_SUPABASE_URL=https://sua-instancia.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon-aqui
`;
  fs.writeFileSync(path.join(targetDir, '.env.example'), envExampleContent);

  console.log('✅ Cópia limpa gerada com sucesso!');
  console.log('\nPróximos passos para implantar no novo cliente:');
  console.log(`1. Acesse a pasta gerada em: ${targetDir}`);
  console.log('2. No Supabase do novo cliente, execute o script: supabase/full_schema_migration.sql');
  console.log('3. Duplique o .env.example para .env.local e insira as chaves do novo Supabase.');
  console.log('4. Suba o projeto na Vercel ou rode \`npm install && npm run dev\` localmente.\n');

} catch (err) {
  console.error('❌ Erro ao gerar cópia limpa:', err);
}
