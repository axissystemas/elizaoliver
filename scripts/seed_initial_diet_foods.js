/**
 * Script de Carga Inicial Idempotente - Dietoterapia Chinesa MTC
 * Execução: node scripts/seed_initial_diet_foods.js
 */

const fs = require('fs');
const path = require('path');

const CHANNEL_MAP = {
  'BP': 'Baço',
  'BAÇO': 'Baço',
  'E': 'Estômago',
  'ESTÔMAGO': 'Estômago',
  'IG': 'Intestino Grosso',
  'ID': 'Intestino Delgado',
  'P': 'Pulmão',
  'PULMÃO': 'Pulmão',
  'R': 'Rim',
  'RIM': 'Rim',
  'F': 'Fígado',
  'FÍGADO': 'Fígado',
  'C': 'Coração',
  'CORAÇÃO': 'Coração',
  'B': 'Bexiga',
  'VB': 'Vesícula Biliar',
  'VC': 'Vaso Concepção',
  'VG': 'Vaso Governador',
  'TA': 'Triplo Aquecedor',
  'PC': 'Pericárdio'
};

function parseChannels(rawText) {
  if (!rawText) return [];
  const parts = rawText.split(/[,/;|\s+]\s*/).map(p => p.trim().toUpperCase());
  const result = new Set();
  for (const part of parts) {
    if (CHANNEL_MAP[part]) {
      result.add(CHANNEL_MAP[part]);
    } else if (part !== '') {
      const capitalized = part.charAt(0) + part.slice(1).toLowerCase();
      result.add(capitalized);
    }
  }
  return Array.from(result);
}

function parseFlavors(rawText) {
  if (!rawText) return [];
  const parts = rawText.split(/[,/;|]\s*/).map(p => p.trim());
  const result = new Set();
  for (const part of parts) {
    if (part !== '') {
      const capitalized = part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
      result.add(capitalized);
    }
  }
  return Array.from(result);
}

function normalizeText(text) {
  return (text || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

function runSeedProcess() {
  const jsonPath = path.join(__dirname, 'initial_diet_foods_import.json');
  if (!fs.existsSync(jsonPath)) {
    console.error('Arquivo de carga não encontrado:', jsonPath);
    process.exit(1);
  }

  const rawData = fs.readFileSync(jsonPath, 'utf8');
  const records = JSON.parse(rawData);

  let totalEncontrados = records.length;
  let totalImportados = 0;
  let totalDuplicados = 0;
  let totalAbreviacoes = 0;
  let totalInconsistencias = 0;
  let totalPendentesRevisao = 0;

  const seenNormalizedNames = new Set();
  const processedFoods = [];

  console.log('---------------------------------------------------------');
  console.log('  PROCESSAMENTO DE CARGA INICIAL - DIETOTERAPIA CHINESA  ');
  console.log('---------------------------------------------------------\n');

  records.forEach((rec, idx) => {
    const normName = normalizeText(rec.name);
    
    // Verificação de abreviação
    const hasAbbr = /[A-Z]{1,2}/.test(rec.original_channels) && !rec.original_channels.includes('Baço');
    if (hasAbbr || rec.has_abbreviation) {
      totalAbreviacoes++;
    }

    // Verificação de duplicidade
    let isDuplicate = seenNormalizedNames.has(normName) || rec.is_duplicate;
    if (isDuplicate) {
      totalDuplicados++;
      console.log(`⚠️ [DUPLICIDADE DETECTADA - LINHA ${idx + 1}]: "${rec.name}" já cadastrado ou em múltipla categoria (${rec.category}).`);
    } else {
      seenNormalizedNames.add(normName);
      totalImportados++;
    }

    // Verificação de inconsistências
    if (rec.has_inconsistency || rec.has_divergence || isDuplicate) {
      totalInconsistencias++;
    }

    totalPendentesRevisao++;

    const processedRecord = {
      nome: rec.name,
      categoria: rec.category,
      sabor_original: rec.original_flavor,
      sabores_normalizados: rec.normalized_flavors || parseFlavors(rec.original_flavor),
      natureza_original: rec.original_nature,
      natureza_normalizada: rec.normalized_nature,
      canais_originais: rec.original_channels,
      canais_normalizados: rec.normalized_channels || parseChannels(rec.original_channels),
      fonte_importacao: rec.source || "Tabela Inicial MTC",
      status: "pendente_revisao",
      duplicado: isDuplicate,
      inconsistencia_obs: rec.inconsistency_notes || (isDuplicate ? "Registro presente em mais de uma categoria ou duplicado." : "")
    };

    processedFoods.push(processedRecord);
  });

  console.log('\n=========================================================');
  console.log('                 RELATÓRIO DE IMPORTAÇÃO                 ');
  console.log('=========================================================');
  console.log(` - Total de registros encontrados:      ${totalEncontrados}`);
  console.log(` - Total importado (únicos):            ${totalImportados}`);
  console.log(` - Total duplicado (em >1 categoria):   ${totalDuplicados}`);
  console.log(` - Total com abreviações expandidas:   ${totalAbreviacoes}`);
  console.log(` - Total com possíveis inconsistências: ${totalInconsistencias}`);
  console.log(` - Total pendente de revisão:           ${totalPendentesRevisao}`);
  console.log('=========================================================\n');

  // Grava o resultado processado estruturado
  const outputPath = path.join(__dirname, 'processed_initial_foods_report.json');
  fs.writeFileSync(outputPath, JSON.stringify(processedFoods, null, 2), 'utf8');
  console.log(`✔ Arquivo estruturado de revisão salvo com sucesso em:\n  ${outputPath}\n`);
}

runSeedProcess();
