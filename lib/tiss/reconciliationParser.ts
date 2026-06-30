export interface ParsedReconciliationItem {
  guiaNumber: string;
  paidValue: number;
  glossedValue: number;
  glossCode?: string;
  glossReason?: string;
}

// Função para fazer o parse do XML de demonstrativo da operadora (TISS Retorno)
export function parseReconciliationXml(xmlText: string): ParsedReconciliationItem[] {
  const results: ParsedReconciliationItem[] = [];
  
  if (typeof window === 'undefined') {
    return results; // Evita que rode no servidor (Next.js SSR)
  }

  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
    
    // Verifica se houve erro no parse
    const parserError = xmlDoc.getElementsByTagName('parsererror');
    if (parserError.length > 0) {
      throw new Error('Erro ao interpretar o arquivo XML: Formato inválido.');
    }

    // Procura por nós que representem guias no XML de demonstrativo/retorno
    // No TISS, costuma vir em tags como <ans:guiaLiberada> ou similar.
    // Vamos buscar de forma ampla por tags que contêm o número da guia do prestador.
    const guiaNodes = xmlDoc.getElementsByTagNameNS('*', 'guiaLiberada');
    const guiaGlosaNodes = xmlDoc.getElementsByTagNameNS('*', 'guiaRejeitada');
    
    // Processar guias liberadas/pagas (total ou parcialmente)
    for (let i = 0; i < guiaNodes.length; i++) {
      const node = guiaNodes[i];
      
      const guiaNumberEl = node.getElementsByTagNameNS('*', 'numeroGuiaPrestador')[0];
      const guiaNumber = guiaNumberEl?.textContent?.trim() || '';
      
      if (!guiaNumber) continue;

      const valorPagoEl = node.getElementsByTagNameNS('*', 'valorPago')[0] || node.getElementsByTagNameNS('*', 'valorLiberado')[0];
      const paidValue = parseFloat(valorPagoEl?.textContent || '0');

      // Buscar glosas associadas à guia
      let glossedValue = 0;
      let glossCode = '';
      let glossReason = '';

      const glosaNode = node.getElementsByTagNameNS('*', 'glosaGuia')[0] || node.getElementsByTagNameNS('*', 'glosaProcedimento')[0];
      if (glosaNode) {
        const valorGlosaEl = glosaNode.getElementsByTagNameNS('*', 'valorGlosa')[0];
        glossedValue = parseFloat(valorGlosaEl?.textContent || '0');

        const codigoGlosaEl = glosaNode.getElementsByTagNameNS('*', 'codigoGlosa')[0] || glosaNode.getElementsByTagNameNS('*', 'codGlosa')[0];
        glossCode = codigoGlosaEl?.textContent?.trim() || '';

        const justificativaEl = glosaNode.getElementsByTagNameNS('*', 'justificativaGlosa')[0] || glosaNode.getElementsByTagNameNS('*', 'descricaoGlosa')[0];
        glossReason = justificativaEl?.textContent?.trim() || '';
      }

      results.push({
        guiaNumber,
        paidValue,
        glossedValue,
        glossCode: glossCode || undefined,
        glossReason: glossReason || undefined
      });
    }

    // Processar guias rejeitadas/glosadas totalmente
    for (let i = 0; i < guiaGlosaNodes.length; i++) {
      const node = guiaGlosaNodes[i];
      
      const guiaNumberEl = node.getElementsByTagNameNS('*', 'numeroGuiaPrestador')[0];
      const guiaNumber = guiaNumberEl?.textContent?.trim() || '';
      
      if (!guiaNumber) continue;

      const valorApresentadoEl = node.getElementsByTagNameNS('*', 'valorApresentado')[0];
      const presentedValue = parseFloat(valorApresentadoEl?.textContent || '0');

      const glosaNode = node.getElementsByTagNameNS('*', 'glosaGuia')[0] || node.getElementsByTagNameNS('*', 'glosa')[0];
      let glossCode = '';
      let glossReason = '';
      if (glosaNode) {
        const codigoGlosaEl = glosaNode.getElementsByTagNameNS('*', 'codigoGlosa')[0];
        glossCode = codigoGlosaEl?.textContent?.trim() || '';
        const justificativaEl = glosaNode.getElementsByTagNameNS('*', 'justificativaGlosa')[0] || glosaNode.getElementsByTagNameNS('*', 'motivoGlosa')[0];
        glossReason = justificativaEl?.textContent?.trim() || '';
      }

      results.push({
        guiaNumber,
        paidValue: 0,
        glossedValue: presentedValue || 0,
        glossCode: glossCode || 'REJ_TOTAL',
        glossReason: glossReason || 'Guia rejeitada/glosada na totalidade.'
      });
    }

    // Fallback: Se não encontrou usando tags do padrão TISS estruturadas (guiaLiberada/guiaRejeitada),
    // tenta um mapeamento genérico buscando qualquer tag <numeroGuiaPrestador> que tenha tags irmãs de valor
    if (results.length === 0) {
      const allGuiaNumbers = xmlDoc.getElementsByTagNameNS('*', 'numeroGuiaPrestador');
      const processedNumbers = new Set<string>();

      for (let i = 0; i < allGuiaNumbers.length; i++) {
        const el = allGuiaNumbers[i];
        const guiaNumber = el.textContent?.trim() || '';
        if (!guiaNumber || processedNumbers.has(guiaNumber)) continue;

        processedNumbers.add(guiaNumber);
        const parent = el.parentElement;
        if (!parent) continue;

        const valorPagoEl = parent.getElementsByTagNameNS('*', 'valorPago')[0] || parent.getElementsByTagNameNS('*', 'valorLiberado')[0];
        const paidValue = parseFloat(valorPagoEl?.textContent || '0');

        const valorGlosaEl = parent.getElementsByTagNameNS('*', 'valorGlosa')[0] || parent.getElementsByTagNameNS('*', 'valorGlosado')[0];
        const glossedValue = parseFloat(valorGlosaEl?.textContent || '0');

        const codGlosaEl = parent.getElementsByTagNameNS('*', 'codigoGlosa')[0];
        const glossCode = codGlosaEl?.textContent?.trim() || undefined;

        const descGlosaEl = parent.getElementsByTagNameNS('*', 'justificativaGlosa')[0] || parent.getElementsByTagNameNS('*', 'motivoGlosa')[0];
        const glossReason = descGlosaEl?.textContent?.trim() || undefined;

        results.push({
          guiaNumber,
          paidValue,
          glossedValue,
          glossCode,
          glossReason
        });
      }
    }

  } catch (error) {
    console.error('Erro no parse do XML de reconciliação:', error);
    throw error;
  }

  return results;
}
