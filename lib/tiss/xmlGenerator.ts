import { BillingBatch, BillingItem } from '@/types/billing';

// Função auxiliar para escapar caracteres especiais de XML
function escapeXml(unsafe: string | null | undefined): string {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Implementação pura de MD5 em TypeScript para gerar o hash do epílogo do TISS
function md5(string: string): string {
  function md5cycle(x: any, k: any) {
    let a = x[0], b = x[1], c = x[2], d = x[3];

    a = ff(a, b, c, d, k[0], 7, -680876936);
    d = ff(d, a, b, c, k[1], 12, -389564586);
    c = ff(c, d, a, b, k[2], 17,  606105819);
    b = ff(b, c, d, a, k[3], 22, -1044525330);
    a = ff(a, b, c, d, k[4], 7, -176418897);
    d = ff(d, a, b, c, k[5], 12,  1200080426);
    c = ff(c, d, a, b, k[6], 17, -1473231341);
    b = ff(b, c, d, a, k[7], 22, -45705983);
    a = ff(a, b, c, d, k[8], 7,  1770035416);
    d = ff(d, a, b, c, k[9], 12, -1958414417);
    c = ff(c, d, a, b, k[10], 17, -42063);
    b = ff(b, c, d, a, k[11], 22, -1990404162);
    a = ff(a, b, c, d, k[12], 7,  1804603682);
    d = ff(d, a, b, c, k[13], 12, -40341101);
    c = ff(c, d, a, b, k[14], 17, -1502002290);
    b = ff(b, c, d, a, k[15], 22,  1236535329);

    a = gg(a, b, c, d, k[1], 5, -165796510);
    d = gg(d, a, b, c, k[6], 9, -1069501632);
    c = gg(c, d, a, b, k[11], 14,  643717713);
    b = gg(b, c, d, a, k[0], 20, -373897302);
    a = gg(a, b, c, d, k[5], 5, -701558691);
    d = gg(d, a, b, c, k[10], 9,  38016083);
    c = gg(c, d, a, b, k[15], 14, -660478335);
    b = gg(b, c, d, a, k[4], 20, -405537848);
    a = gg(a, b, c, d, k[9], 5,  568446438);
    d = gg(d, a, b, c, k[14], 9, -1019803690);
    c = gg(c, d, a, b, k[3], 14, -187363961);
    b = gg(b, c, d, a, k[8], 20,  1163531501);
    a = gg(a, b, c, d, k[13], 5, -1444681467);
    d = gg(d, a, b, c, k[2], 9, -51403784);
    c = gg(c, d, a, b, k[7], 14,  1735328473);
    b = gg(b, c, d, a, k[12], 20, -1926607734);

    a = hh(a, b, c, d, k[5], 4, -378558);
    d = hh(d, a, b, c, k[8], 11, -2022574463);
    c = hh(c, d, a, b, k[11], 16,  1839030562);
    b = hh(b, c, d, a, k[14], 23, -35309556);
    a = hh(a, b, c, d, k[1], 4, -1530992060);
    d = hh(d, a, b, c, k[4], 11,  1272893353);
    c = hh(c, d, a, b, k[7], 16, -155497632);
    b = hh(b, c, d, a, k[10], 23, -1094730640);
    a = hh(a, b, c, d, k[13], 4,  681279174);
    d = hh(d, a, b, c, k[0], 11, -358537222);
    c = hh(c, d, a, b, k[3], 16, -722521979);
    b = hh(b, c, d, a, k[6], 23,  76029189);
    a = hh(a, b, c, d, k[9], 4, -640364487);
    d = hh(d, a, b, c, k[12], 11, -421815835);
    c = hh(c, d, a, b, k[15], 16,  530742520);
    b = hh(b, c, d, a, k[2], 23, -995338651);

    a = ii(a, b, c, d, k[0], 6, -198630844);
    d = ii(d, a, b, c, k[7], 10,  1126891415);
    c = ii(c, d, a, b, k[14], 15, -1416354905);
    b = ii(b, c, d, a, k[5], 21, -57434055);
    a = ii(a, b, c, d, k[12], 6,  1700485571);
    d = ii(d, a, b, c, k[3], 10, -1894986606);
    c = ii(c, d, a, b, k[10], 15, -1051523);
    b = ii(b, c, d, a, k[1], 21, -2054922799);
    a = ii(a, b, c, d, k[8], 6,  1873313359);
    d = ii(d, a, b, c, k[15], 10, -30611744);
    c = ii(c, d, a, b, k[6], 15, -1560198380);
    b = ii(b, c, d, a, k[13], 21,  1309151649);
    a = ii(a, b, c, d, k[4], 6, -145523070);
    d = ii(d, a, b, c, k[11], 10, -1120210379);
    c = ii(c, d, a, b, k[2], 15,  718787259);
    b = ii(b, c, d, a, k[9], 21, -343485551);

    x[0] = add32(a, x[0]);
    x[1] = add32(b, x[1]);
    x[2] = add32(c, x[2]);
    x[3] = add32(d, x[3]);
  }

  function cmn(q: number, a: number, b: number, x: number, s: number, t: number) {
    a = add32(add32(a, q), add32(x, t));
    return add32((a << s) | (a >>> (32 - s)), b);
  }

  function ff(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return cmn((b & c) | ((~b) & d), a, b, x, s, t);
  }

  function gg(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return cmn((b & d) | (c & (~d)), a, b, x, s, t);
  }

  function hh(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return cmn(b ^ c ^ d, a, b, x, s, t);
  }

  function ii(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return cmn(c ^ (b | (~d)), a, b, x, s, t);
  }

  function md51(s: string) {
    let txt = '';
    let n = s.length, state = [1732584193, -271733879, -1732584194, 271733878], i;
    for (i = 64; i <= s.length; i += 64) {
      md5cycle(state, md5blk(s.substring(i - 64, i)));
    }
    s = s.substring(i - 64);
    let tail = [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0];
    for (i = 0; i < s.length; i++) {
      tail[i >> 2] |= s.charCodeAt(i) << ((i & 3) << 3);
    }
    tail[i >> 2] |= 0x80 << ((i & 3) << 3);
    if (i > 55) {
      md5cycle(state, tail);
      for (i = 0; i < 16; i++) tail[i] = 0;
    }
    tail[14] = n * 8;
    md5cycle(state, tail);
    return state;
  }

  function md5blk(s: string) {
    let md5blks = [], i;
    for (i = 0; i < 64; i += 4) {
      md5blks[i >> 2] = s.charCodeAt(i)
        + (s.charCodeAt(i + 1) << 8)
        + (s.charCodeAt(i + 2) << 16)
        + (s.charCodeAt(i + 3) << 24);
    }
    return md5blks;
  }

  let hex_chr = '0123456789abcdef'.split('');

  function rhex(n: number) {
    let s = '', j = 0;
    for (; j < 4; j++) {
      s += hex_chr[(n >> (j * 8 + 4)) & 0x0F] + hex_chr[(n >> (j * 8)) & 0x0F];
    }
    return s;
  }

  function hex(x: any) {
    for (let i = 0; i < x.length; i++) {
      x[i] = rhex(x[i]);
    }
    return x.join('');
  }

  function add32(a: number, b: number) {
    return (a + b) & 0xFFFFFFFF;
  }

  return hex(md51(string));
}

// Gera o arquivo XML TISS 4.01.00 a partir do lote e de seus itens
export function generateTissXml(batch: BillingBatch, items: BillingItem[]): string {
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
  const timeStr = today.toTimeString().split(' ')[0]; // HH:MM:SS
  
  // Obter CNPJ e ANS (caindo de volta para valores genéricos se não houverem)
  const providerCnpj = escapeXml(batch.insurer?.cnpj || '00000000000000');
  const insurerAns = escapeXml(batch.insurer?.ans_registration || '000000');
  const batchNum = escapeXml(batch.id.substring(0, 8).toUpperCase());

  // Início do corpo do XML (sem o epílogo para cálculo de hash)
  let xmlContent = `<?xml version="1.0" encoding="ISO-8859-1"?>
<ans:mensagemTISS xmlns:ans="http://www.ans.gov.br/padroes/tiss/schema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.ans.gov.br/padroes/tiss/schema http://www.ans.gov.br/padroes/tiss/schema/tissV4_01_00.xsd">
  <ans:cabecalho>
    <ans:identificacaoTransacao>
      <ans:tipoTransacao>ENVIO_LOTE_GUIAS</ans:tipoTransacao>
      <ans:sequencialTransacao>${escapeXml(batch.id.substring(0, 12))}</ans:sequencialTransacao>
      <ans:dataRegistroTransacao>${dateStr}</ans:dataRegistroTransacao>
      <ans:horaRegistroTransacao>${timeStr}</ans:horaRegistroTransacao>
    </ans:identificacaoTransacao>
    <ans:origem>
      <ans:identificacaoPrestador>
        <ans:cnpj>${providerCnpj}</ans:cnpj>
      </ans:identificacaoPrestador>
    </ans:origem>
    <ans:destino>
      <ans:registroANS>${insurerAns}</ans:registroANS>
    </ans:destino>
    <ans:versaoPadrao>4.01.00</ans:versaoPadrao>
  </ans:cabecalho>
  <ans:prestadorParaOperadora>
    <ans:loteGuias>
      <ans:numeroLote>${batchNum}</ans:numeroLote>
      <ans:guiasTISS>
  `;

  // Mapear cada item de faturamento para uma guia TISS
  items.forEach((item) => {
    const cardNum = escapeXml(item.patient?.active_insurance?.card_number || '0000000000000000');
    const guiaNum = escapeXml(item.guia_number || '00000000');
    const authNum = item.auth_number ? `<ans:numeroAutorizacao>${escapeXml(item.auth_number)}</ans:numeroAutorizacao>` : '';
    const serviceDate = item.service_date;

    // Distinguir entre guia de consulta e guia SP/SADT
    const isConsulta = item.procedure?.category === 'CONSULTA' || !item.procedure?.category;

    if (isConsulta) {
      xmlContent += `      <ans:guiaConsulta>
          <ans:cabecalhoGuia>
            <ans:registroANS>${insurerAns}</ans:registroANS>
            <ans:numeroGuiaPrestador>${guiaNum}</ans:numeroGuiaPrestador>
          </ans:cabecalhoGuia>
          <ans:beneficiario>
            <ans:numeroCarteira>${cardNum}</ans:numeroCarteira>
            <ans:nomeBeneficiario>${escapeXml(item.patient?.name)}</ans:nomeBeneficiario>
          </ans:beneficiario>
          <ans:dadosContratado>
            <ans:identificacaoPrestador>
              <ans:cnpj>${providerCnpj}</ans:cnpj>
            </ans:identificacaoPrestador>
            <ans:nomePrestador>${escapeXml(batch.insurer?.name || 'Clínica de Acupuntura')}</ans:nomePrestador>
          </ans:dadosContratado>
          <ans:dadosAtendimento>
            <ans:dataAtendimento>${serviceDate}</ans:dataAtendimento>
            <ans:tipoConsulta>1</ans:tipoConsulta>
            <ans:procedimento>
              <ans:codigoTabela>22</ans:codigoTabela>
              <ans:codigoProcedimento>${escapeXml(item.procedure?.code || '10101012')}</ans:codigoProcedimento>
              <ans:valorProcedimento>${item.unit_value.toFixed(2)}</ans:valorProcedimento>
            </ans:procedimento>
          </ans:dadosAtendimento>
        </ans:guiaConsulta>\n`;
    } else {
      // Guia SP/SADT para sessões, ex: Acupuntura / Auriculoterapia
      xmlContent += `      <ans:guiaSPSADT>
          <ans:cabecalhoGuia>
            <ans:registroANS>${insurerAns}</ans:registroANS>
            <ans:numeroGuiaPrestador>${guiaNum}</ans:numeroGuiaPrestador>
          </ans:cabecalhoGuia>
          ${authNum}
          <ans:beneficiario>
            <ans:numeroCarteira>${cardNum}</ans:numeroCarteira>
            <ans:nomeBeneficiario>${escapeXml(item.patient?.name)}</ans:nomeBeneficiario>
          </ans:beneficiario>
          <ans:dadosSolicitante>
            <ans:contratadoSolicitante>
              <ans:cnpj>${providerCnpj}</ans:cnpj>
              <ans:nomeContratado>${escapeXml(batch.insurer?.name || 'Clínica de Acupuntura')}</ans:nomeContratado>
            </ans:contratadoSolicitante>
          </ans:dadosSolicitante>
          <ans:dadosPrestadorExecutante>
            <ans:cnpj>${providerCnpj}</ans:cnpj>
            <ans:nomePrestador>${escapeXml(batch.insurer?.name || 'Clínica de Acupuntura')}</ans:nomePrestador>
          </ans:dadosPrestadorExecutante>
          <ans:procedimentosRealizados>
            <ans:procedimentoRealizado>
              <ans:dataExecucao>${serviceDate}</ans:dataExecucao>
              <ans:horaInicio>${timeStr}</ans:horaInicio>
              <ans:horaFim>${timeStr}</ans:horaFim>
              <ans:procedimento>
                <ans:codigoTabela>22</ans:codigoTabela>
                <ans:codigoProcedimento>${escapeXml(item.procedure?.code || '50000470')}</ans:codigoProcedimento>
                <ans:descricaoProcedimento>${escapeXml(item.procedure?.name)}</ans:descricaoProcedimento>
              </ans:procedimento>
              <ans:quantidade>${item.quantity}</ans:quantidade>
              <ans:valorUnitario>${item.unit_value.toFixed(2)}</ans:valorUnitario>
              <ans:valorTotal>${item.total_presented_value.toFixed(2)}</ans:valorTotal>
            </ans:procedimentoRealizado>
          </ans:procedimentosRealizados>
        </ans:guiaSPSADT>\n`;
    }
  });

  // Fecha as tags do lote
  xmlContent += `      </ans:guiasTISS>
    </ans:loteGuias>
  </ans:prestadorParaOperadora>\n`;

  // Calcula o MD5 hash de todo o conteúdo gerado
  const hashValue = md5(xmlContent.trim());

  // Adiciona o epílogo e fecha a mensagemTISS
  xmlContent += `  <ans:epilogo>
    <ans:hash>${hashValue}</ans:hash>
  </ans:epilogo>
</ans:mensagemTISS>`;

  return xmlContent;
}
