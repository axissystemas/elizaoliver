import React, { useState, useEffect } from 'react';
import { 
  X, Upload, Check, Trash2, AlertTriangle, RefreshCw, FileText, 
  ChevronRight, Info, History, Sparkles, Database, ShieldAlert, Download 
} from 'lucide-react';
import { dietotherapyService } from '@/lib/dietotherapyService';
import { FoodImportLine, ChineseDietFood } from '@/types/dietotherapy';

interface FoodImportModalProps {
  onClose: () => void;
  onImportSuccess: () => void;
}

const DEFAULT_CSV_SEED = `Categoria;Nome;Sabor;Natureza;Canais
Raízes;Gengibre;Picante;Morno;P, E, BP
Cereais;Arroz integral;Doce;Neutro;BP, E
Leguminosas;Feijão Azuki;Doce, Azedo;Neutro;R, IG
Folhas;Hortelã;Picante;Fresco;F, P
Frutas;Maçã;Doce, Azedo;Fresco;C, Baço, Pulmão
Animais;Carne de carneiro;Doce;Quente;BP, R
Alimentos extras;Mel;Doce;Neutro;BP, P, IG`;

export default function FoodImportModal({ onClose, onImportSuccess }: FoodImportModalProps) {
  const [activeTab, setActiveTab] = useState<'upload' | 'review' | 'history'>('upload');
  const [inputText, setInputText] = useState('');
  const [importHistory, setImportHistory] = useState<any[]>([]);
  const [importLines, setImportLines] = useState<FoodImportLine[]>([]);
  const [existingFoods, setExistingFoods] = useState<ChineseDietFood[]>([]);
  
  const [currentImportId, setCurrentImportId] = useState<string | null>(null);
  const [decisions, setDecisions] = useState<Record<string, { 
    decision: 'create_new' | 'link_to_existing' | 'add_synonym' | 'discard'; 
    targetFoodId?: string; 
  }>>({});
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [stats, setStats] = useState({ success: 0, duplicates: 0, errors: 0 });

  const loadHistory = async () => {
    try {
      const hist = await dietotherapyService.getImportHistory();
      setImportHistory(hist);
    } catch (e) {
      console.error(e);
    }
  };

  const loadExistingFoods = async () => {
    try {
      const foods = await dietotherapyService.getFoods();
      setExistingFoods(foods);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadHistory();
    loadExistingFoods();
  }, []);

  const handleDownloadTemplate = () => {
    const link = document.createElement('a');
    link.href = '/modelo_importacao_dietoterapia.csv';
    link.download = 'modelo_importacao_dietoterapia.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleLoadSeed = () => {
    setInputText(DEFAULT_CSV_SEED);
  };

  const splitList = (str?: string) => {
    if (!str) return [];
    return str.split(/[,;|]/).map(s => s.trim()).filter(Boolean);
  };

  const handleParseCSV = async () => {
    if (!inputText.trim()) {
      alert('Por favor, cole os dados CSV antes de prosseguir.');
      return;
    }
    setIsProcessing(true);
    try {
      const rawRows = inputText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
      const parsedLines: any[] = [];
      const delimiter = ';';

      let headerCols: string[] = [];
      let isFullHeader = false;

      let firstRowStr = rawRows[0] || '';
      if (firstRowStr.charCodeAt(0) === 0xFEFF) {
        firstRowStr = firstRowStr.slice(1);
      }

      const firstRowCols = firstRowStr.split(delimiter).map(c => c.trim().toLowerCase());
      if (firstRowCols.includes('categoria') || firstRowCols.includes('nome')) {
        headerCols = firstRowCols;
        isFullHeader = firstRowCols.includes('direcao_energetica') || firstRowCols.includes('nome_cientifico') || firstRowCols.length > 5;
      }

      const getColIdx = (colName: string) => headerCols.indexOf(colName.toLowerCase());

      let rowNum = 1;
      for (let i = 0; i < rawRows.length; i++) {
        let rowStr = rawRows[i];
        if (i === 0 && rowStr.charCodeAt(0) === 0xFEFF) {
          rowStr = rowStr.slice(1);
        }

        if (!rowStr.trim()) {
          rowNum++;
          continue;
        }

        if (i === 0 && headerCols.length > 0) {
          rowNum++;
          continue; // Skip header row
        }

        const cols = rowStr.split(delimiter).map(c => c.trim());
        if (cols.length < 2) {
          rowNum++;
          continue;
        }

        if (isFullHeader) {
          const getVal = (name: string) => {
            const idx = getColIdx(name);
            return idx !== -1 && cols[idx] !== undefined ? cols[idx] : '';
          };

          const nameVal = getVal('nome') || cols[1] || '';
          if (!nameVal) {
            rowNum++;
            continue;
          }

          parsedLines.push({
            row_number: rowNum,
            original_name: nameVal,
            original_category: getVal('categoria') || cols[0] || 'Outros',
            original_thermal_nature: getVal('natureza_termica') || cols[8] || 'Neutro',
            original_flavors: getVal('sabores') || cols[10] || '',
            original_channels: getVal('canais_meridianos') || cols[11] || '',

            is_active: getVal('ativo').toLowerCase() !== 'não' && getVal('ativo').toLowerCase() !== 'nao',
            scientific_name: getVal('nome_cientifico'),
            used_part: getVal('parte_utilizada'),
            synonyms: splitList(getVal('sinonimos')),
            image_url: getVal('imagem_url'),
            description: getVal('descricao'),
            energy_direction: getVal('direcao_energetica') || 'Neutro',
            therapeutic_functions: splitList(getVal('funcoes_terapeuticas')),
            indicated_patterns: splitList(getVal('padroes_indicados')),
            caution_patterns: splitList(getVal('padroes_cautela_contraindicacao')),
            clinical_notes: getVal('observacoes_clinicas'),
            culinary_notes: getVal('observacoes_culinarias'),
            preparation_modes: splitList(getVal('modos_preparo')),
            contraindications: getVal('contraindicacoes_gerais'),
            allergens: getVal('alergenicos'),
            restrictions: getVal('restricoes_alimentares'),
            source_title: getVal('titulo_obra_referencia'),
            author: getVal('autor_referencia'),
            edition: getVal('edicao_referencia'),
            page: getVal('pagina_referencia'),
            publication_year: getVal('ano_publicacao_referencia') ? Number(getVal('ano_publicacao_referencia')) : undefined
          });
        } else {
          parsedLines.push({
            row_number: rowNum,
            original_name: cols[1] || '',
            original_category: cols[0] || 'Outros',
            original_thermal_nature: cols[3] || 'Neutro',
            original_flavors: cols[2] || '',
            original_channels: cols[4] || ''
          });
        }
        rowNum++;
      }

      if (parsedLines.length === 0) {
        alert('Nenhum registro válido pôde ser extraído do CSV.');
        setIsProcessing(false);
        return;
      }

      const res = await dietotherapyService.importRawFoods(parsedLines);
      setCurrentImportId(res.importId);
      setStats({
        success: res.successCount,
        duplicates: res.duplicateCount,
        errors: res.errorCount
      });
      
      const lines = await dietotherapyService.getImportLines(res.importId);
      setImportLines(lines);
      
      const initialDecisions: Record<string, any> = {};
      lines.forEach(line => {
        initialDecisions[line.id] = {
          decision: line.possible_duplicate_food_id ? 'link_to_existing' : 'create_new',
          targetFoodId: line.possible_duplicate_food_id
        };
      });
      setDecisions(initialDecisions);
      
      setActiveTab('review');
    } catch (e) {
      console.error(e);
      alert('Erro ao processar dados de importação.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDecisionChange = (lineId: string, decision: any, targetFoodId?: string) => {
    setDecisions(prev => ({
      ...prev,
      [lineId]: { decision, targetFoodId }
    }));
  };

  const handleConfirmImport = async () => {
    if (!currentImportId) return;
    setIsProcessing(true);
    try {
      const { successCount } = await dietotherapyService.confirmImport(currentImportId, decisions);
      alert(`Importação concluída! ${successCount} registros consolidados com sucesso.`);
      setActiveTab('history');
      loadHistory();
      onImportSuccess();
    } catch (e: any) {
      alert(e.message || 'Falha ao confirmar importação.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRollback = async (importId: string) => {
    if (!confirm('Deseja realmente desfazer esta importação? Isso removerá os alimentos criados, exceto os que já foram revisados/editados.')) {
      return;
    }
    setIsProcessing(true);
    try {
      const { deletedCount, skippedCount } = await dietotherapyService.rollbackImport(importId);
      alert(`Rollback concluído! ${deletedCount} alimentos foram removidos. ${skippedCount} alimentos foram mantidos pois foram alterados/revisados.`);
      loadHistory();
      onImportSuccess();
    } catch (e: any) {
      alert(e.message || 'Erro ao reverter importação.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Card */}
      <div className="relative bg-white w-full max-w-5xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-8 border-b border-outline-variant/10 flex justify-between items-center bg-surface-container-low/40">
          <div>
            <span className="text-[10px] font-bold text-primary uppercase tracking-widest block">Dietoterapia Chinesa</span>
            <h3 className="text-2xl font-bold font-headline text-on-surface">Importação & Carga Inicial</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface-container-low rounded-full transition-all">
            <X size={24} />
          </button>
        </div>

        {/* Tabs Navigation */}
        <div className="bg-surface-container-low/20 border-b border-outline-variant/10 px-8 py-3 flex gap-2">
          {[
            { id: 'upload', label: 'Nova Carga (CSV)', icon: Upload },
            { id: 'review', label: 'Conciliação e Revisão', icon: Sparkles, disabled: !currentImportId },
            { id: 'history', label: 'Histórico & Rollback', icon: History }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                disabled={tab.disabled}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border ${
                  activeTab === tab.id 
                    ? 'bg-primary text-white border-primary shadow-sm' 
                    : 'bg-white border-outline-variant/15 text-outline hover:text-primary disabled:opacity-50'
                }`}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          
          {/* TAB 1: UPLOAD */}
          {activeTab === 'upload' && (
            <div className="space-y-6">
              <div className="bg-emerald-50/50 border border-emerald-100 p-6 rounded-2xl flex items-start gap-4 text-emerald-800 text-xs">
                <Info className="text-emerald-600 shrink-0 mt-0.5" size={18} />
                <div className="space-y-1.5 leading-relaxed">
                  <p className="font-bold text-sm">Como funciona a importação de alimentos?</p>
                  <p>
                    Você pode importar alimentos colando dados no formato simplificado (<strong>Categoria;Nome;Sabor;Natureza;Canais</strong>) ou baixando nossa <strong>Planilha Modelo Completa (.CSV)</strong> com os 26 campos (Identificação, MTC, Cuidados, Modos de Preparo e Bibliografia).
                  </p>
                  <p>O sistema higieniza automaticamente os textos, separa listas e expande abreviações de meridianos antes da aprovação final.</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <label className="text-xs font-bold text-outline uppercase tracking-wider">Colar Dados da Carga Inicial</label>
                  <div className="flex items-center gap-2">
                    <button 
                      type="button"
                      onClick={handleDownloadTemplate}
                      className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-xl font-bold transition-all shadow-sm flex items-center gap-1.5"
                      title="Baixar planilha CSV com todos os 26 campos padronizados"
                    >
                      <Download size={14} /> Baixar Planilha Modelo (.CSV)
                    </button>
                    <button 
                      type="button"
                      onClick={handleLoadSeed}
                      className="text-xs bg-primary/10 hover:bg-primary/20 text-primary px-3.5 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5"
                    >
                      <Sparkles size={14} /> Carregar Exemplo Prático
                    </button>
                  </div>
                </div>
                <textarea
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  rows={8}
                  className="w-full p-5 bg-surface-container-low rounded-2xl border border-outline-variant/15 text-xs font-mono outline-none focus:border-primary transition-all resize-none"
                  placeholder="Categoria;Nome;Sabor;Natureza;Canais..."
                />
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleParseCSV}
                  disabled={isProcessing || !inputText.trim()}
                  className="px-8 py-3.5 rounded-xl bg-primary hover:bg-primary-container text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {isProcessing ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <ChevronRight size={16} />
                  )}
                  Processar e Validar Dados
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: REVIEW & RECONCILE */}
          {activeTab === 'review' && currentImportId && (
            <div className="space-y-6 animate-in fade-in duration-300">
              
              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-center">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase block">Novos Alimentos</span>
                  <span className="text-2xl font-black text-emerald-950">{stats.success}</span>
                </div>
                <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl text-center">
                  <span className="text-[10px] font-bold text-amber-800 uppercase block">Duplicidades Suspeitas</span>
                  <span className="text-2xl font-black text-amber-950">{stats.duplicates}</span>
                </div>
                <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-center">
                  <span className="text-[10px] font-bold text-rose-800 uppercase block">Inconsistências/Erros</span>
                  <span className="text-2xl font-black text-rose-950">{stats.errors}</span>
                </div>
              </div>

              {/* Table list */}
              <div className="border border-outline-variant/10 rounded-2xl overflow-hidden shadow-sm bg-white">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-surface-container-low/60 border-b border-outline-variant/10 text-outline font-bold">
                      <th className="p-4">Linha</th>
                      <th className="p-4">Nome Original</th>
                      <th className="p-4">Categoria</th>
                      <th className="p-4">Natureza / Sabores / Canais</th>
                      <th className="p-4">Ação de Conciliação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importLines.map(line => {
                      const isDuplicate = !!line.possible_duplicate_food_id;
                      const hasError = line.processing_status === 'error';
                      const currentDecision = decisions[line.id]?.decision || 'create_new';
                      
                      return (
                        <tr key={line.id} className="border-b border-outline-variant/5 hover:bg-surface-container-low/20">
                          <td className="p-4 font-bold text-outline">#{line.row_number}</td>
                          <td className="p-4 font-bold text-on-surface">
                            {line.original_name}
                            {isDuplicate && (
                              <span className="text-[9px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-black block w-fit mt-1">
                                ⚠️ Possível Duplicado
                              </span>
                            )}
                            {hasError && (
                              <span className="text-[9px] bg-rose-100 text-rose-800 px-2 py-0.5 rounded font-black block w-fit mt-1">
                                ❌ Erro de Cadastro
                              </span>
                            )}
                          </td>
                          <td className="p-4">
                            <span className="px-2.5 py-1 bg-surface-container-low rounded-lg font-bold text-outline-variant">
                              {line.original_category}
                            </span>
                          </td>
                          <td className="p-4 space-y-1">
                            <div><span className="text-outline">Natureza:</span> <span className="font-bold">{line.original_thermal_nature}</span></div>
                            <div><span className="text-outline">Sabores:</span> <span className="font-bold">{line.original_flavors || '-'}</span></div>
                            <div><span className="text-outline">Canais:</span> <span className="font-bold text-primary">{line.original_channels || '-'}</span></div>
                            {line.inconsistency_notes && (
                              <div className="text-[10px] text-amber-700 italic font-semibold mt-1">
                                Obs: {line.inconsistency_notes}
                              </div>
                            )}
                          </td>
                          <td className="p-4">
                            <select
                              value={currentDecision}
                              onChange={e => handleDecisionChange(line.id, e.target.value, line.possible_duplicate_food_id)}
                              className="w-full p-2.5 bg-surface-container-low border border-outline-variant/10 rounded-xl font-bold"
                            >
                              <option value="create_new">Criar Novo Alimento</option>
                              {isDuplicate && <option value="link_to_existing">Mesclar com Existente</option>}
                              {isDuplicate && <option value="add_synonym">Adicionar como Sinônimo</option>}
                              <option value="discard">Descartar Registro</option>
                            </select>
                            
                            {currentDecision === 'link_to_existing' && isDuplicate && (
                              <p className="text-[9px] text-emerald-700 font-bold mt-1.5">
                                ✓ Associará referências e fontes ao registro existente.
                              </p>
                            )}
                            {currentDecision === 'add_synonym' && isDuplicate && (
                              <p className="text-[9px] text-indigo-700 font-bold mt-1.5">
                                ✓ Registrará "{line.original_name}" como sinônimo no sistema.
                              </p>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Confirm Buttons */}
              <div className="flex justify-end gap-3 text-xs font-bold">
                <button
                  onClick={() => setActiveTab('upload')}
                  className="px-6 py-3 border border-outline-variant/10 rounded-xl hover:bg-surface-container-low transition-all"
                >
                  Voltar
                </button>
                <button
                  onClick={handleConfirmImport}
                  disabled={isProcessing}
                  className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {isProcessing ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Check size={16} />
                  )}
                  Confirmar e Consolidar Alimentos
                </button>
              </div>

            </div>
          )}

          {/* TAB 3: HISTORY & ROLLBACK */}
          {activeTab === 'history' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="bg-rose-50/50 border border-rose-100 p-6 rounded-2xl flex items-start gap-4 text-rose-800 text-xs">
                <ShieldAlert className="text-rose-600 shrink-0 mt-0.5" size={18} />
                <div className="space-y-1 leading-relaxed">
                  <p className="font-bold text-sm">Área de Segurança: Reversão (Rollback) de Carga</p>
                  <p>O rollback remove com segurança alimentos inseridos em lote por uma carga específica. Alimentos que já foram revisados por profissionais, publicados editorialmente ou editados manualmente no formulário <strong>não serão removidos</strong> para preservar o prontuário.</p>
                </div>
              </div>

              <div className="space-y-4">
                {importHistory.length > 0 ? (
                  importHistory.map(item => (
                    <div key={item.id} className="p-6 bg-white border border-outline-variant/10 rounded-[2rem] shadow-sm flex justify-between items-center hover:shadow-md transition-all">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-on-surface">Lote: {item.id}</span>
                          <span className={`px-2 py-0.5 text-[8px] font-black rounded-md ${
                            item.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' :
                            item.status === 'rolled_back' ? 'bg-slate-100 text-outline' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {item.status === 'confirmed' ? 'Confirmado' :
                             item.status === 'rolled_back' ? 'Revertido / Desfeito' :
                             'Pendente de Revisão'}
                          </span>
                        </div>
                        <p className="text-xs text-outline font-semibold">
                          Importado em {new Date(item.date).toLocaleString('pt-BR')}
                        </p>
                        <p className="text-xs font-bold text-outline-variant mt-1.5">
                          Sucesso: {item.successCount} | Duplicados: {item.duplicateCount} | Erros: {item.errorCount}
                        </p>
                      </div>
                      
                      {item.status !== 'rolled_back' && (
                        <button
                          onClick={() => handleRollback(item.id)}
                          disabled={isProcessing}
                          className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-rose-100 shadow-sm transition-all disabled:opacity-50"
                        >
                          <Trash2 size={14} /> Reverter Lote
                        </button>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-20 border-2 border-dashed border-outline-variant/20 rounded-[2rem] text-outline font-semibold text-xs italic">
                    Nenhum histórico de importação encontrado no sistema.
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
