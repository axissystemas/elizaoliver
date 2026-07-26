import React from 'react';
import { X, Book, AlertTriangle, HelpCircle, Tag, Thermometer, Wind, ShieldAlert, Layers, CheckCircle2, History } from 'lucide-react';
import { ChineseDietFood } from '@/types/dietotherapy';

interface FoodDetailModalProps {
  food: ChineseDietFood;
  onClose: () => void;
}

export default function FoodDetailModal({ food, onClose }: FoodDetailModalProps) {
  // Cores de fundo baseadas na natureza térmica
  const getThermalBg = (nature: string) => {
    const n = (nature || '').trim().toLowerCase();
    if (n.includes('quente')) return 'bg-amber-100 text-amber-900 border-amber-300';
    if (n.includes('morn')) return 'bg-orange-100 text-orange-900 border-orange-300';
    if (n.includes('neutr')) return 'bg-emerald-100 text-emerald-900 border-emerald-300';
    if (n.includes('fresc')) return 'bg-sky-100 text-sky-900 border-sky-300';
    if (n.includes('fri')) return 'bg-indigo-100 text-indigo-900 border-indigo-300';
    return 'bg-slate-100 text-slate-900 border-slate-300';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal Container */}
      <div className="relative bg-white w-full max-w-4xl rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-8 border-b border-outline-variant/10 flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-3xl font-bold font-headline text-on-surface">{food.name}</h2>
              {food.scientific_name && (
                <span className="text-sm italic text-on-surface-variant font-medium">({food.scientific_name})</span>
              )}
              <span className={`px-3 py-1 text-xs font-bold rounded-lg border ${getThermalBg(food.thermal_nature)}`}>
                {food.thermal_nature}
              </span>
              <span className={`px-3 py-1 text-xs font-bold rounded-lg border ${
                food.is_active ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}>
                {food.is_active ? 'Ativo' : 'Inativo'}
              </span>
              <span className={`px-3 py-1 text-xs font-bold rounded-lg border ${
                food.editorial_status === 'published' ? 'bg-blue-50 border-blue-200 text-blue-800' :
                food.editorial_status === 'pending_review' ? 'bg-amber-50 border-amber-200 text-amber-800' :
                'bg-slate-50 border-slate-200 text-slate-800'
              }`}>
                {food.editorial_status === 'published' ? 'Revisado / Publicado' : 
                 food.editorial_status === 'pending_review' ? 'Pendente de Revisão' : 
                 food.editorial_status === 'under_review' ? 'Em Revisão' : food.editorial_status}
              </span>
            </div>
            {food.synonyms && food.synonyms.length > 0 && (
              <p className="text-xs text-on-surface-variant mt-2 font-semibold">
                Nomes Alternativos: {food.synonyms.join(', ')}
              </p>
            )}
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-surface-container-low rounded-full transition-all text-on-surface-variant"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-8 overflow-y-auto space-y-8 custom-scrollbar">
          
          {/* Identificação & Descrição */}
          <div className="bg-surface-container-low p-6 rounded-2xl border border-outline-variant/10 space-y-4">
            <h3 className="text-sm font-bold text-outline uppercase tracking-wider flex items-center gap-2">
              <Layers size={16} /> Identificação Básica
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm font-semibold text-on-surface">
              <div>
                <span className="text-xs text-outline font-medium block">Categoria</span>
                <span className="capitalize">{food.category}</span>
              </div>
              {food.used_part && (
                <div>
                  <span className="text-xs text-outline font-medium block">Parte Utilizada</span>
                  <span>{food.used_part}</span>
                </div>
              )}
            </div>
            {food.description && (
              <div className="pt-2 border-t border-outline-variant/10 text-sm text-on-surface-variant font-medium leading-relaxed">
                <span className="text-xs text-outline font-medium block">Descrição Geral</span>
                {food.description}
              </div>
            )}
          </div>

          {/* Classificação Energética MTC */}
          <div className="space-y-4">
            <h3 className="text-base font-bold text-on-surface flex items-center gap-2">
              ☯️ Classificação Energética MTC
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Sabores */}
              <div className="bg-surface-container-low p-5 rounded-xl border border-outline-variant/10">
                <span className="text-xs text-outline font-bold uppercase tracking-wider block mb-2">Sabores</span>
                <div className="flex flex-wrap gap-1.5">
                  {food.flavors.map(flavor => (
                    <span key={flavor} className="px-2.5 py-1 bg-white text-on-surface text-xs font-bold rounded-lg border border-outline-variant/20 shadow-sm">
                      {flavor}
                    </span>
                  ))}
                </div>
              </div>

              {/* Meridianos / Canais */}
              <div className="bg-surface-container-low p-5 rounded-xl border border-outline-variant/10">
                <span className="text-xs text-outline font-bold uppercase tracking-wider block mb-2">Tropismo (Canais)</span>
                <div className="flex flex-wrap gap-1.5">
                  {food.channels.map(ch => (
                    <span key={ch} className="px-2.5 py-1 bg-primary text-white text-xs font-bold rounded-lg shadow-sm">
                      {ch}
                    </span>
                  ))}
                </div>
              </div>

              {/* Direção Energética */}
              <div className="bg-surface-container-low p-5 rounded-xl border border-outline-variant/10">
                <span className="text-xs text-outline font-bold uppercase tracking-wider block mb-2">Direção Energética</span>
                <span className="text-sm font-bold text-on-surface block mt-1">
                  {food.energy_direction || <span className="text-outline italic font-medium">Não cadastrada</span>}
                </span>
              </div>
            </div>

            {/* Funções Terapêuticas */}
            <div className="bg-surface-container-low p-6 rounded-xl border border-outline-variant/10">
              <span className="text-xs text-outline font-bold uppercase tracking-wider block mb-3">Funções Terapêuticas</span>
              {food.therapeutic_functions && food.therapeutic_functions.length > 0 ? (
                <ul className="list-disc pl-5 space-y-1.5 text-sm text-on-surface-variant font-medium">
                  {food.therapeutic_functions.map((fn, idx) => <li key={idx}>{fn}</li>)}
                </ul>
              ) : (
                <p className="text-xs text-outline italic">Nenhuma função energética registrada.</p>
              )}
            </div>
          </div>

          {/* Aplicação Clínica & Culinária */}
          <div className="space-y-4">
            <h3 className="text-base font-bold text-on-surface flex items-center gap-2">
              📋 Aplicação Prática e Cuidados
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Padrões Indicados */}
              <div className="bg-emerald-50/50 p-5 rounded-xl border border-emerald-100">
                <span className="text-xs text-emerald-800 font-bold uppercase tracking-wider block mb-2">Padrões Indicados</span>
                {food.indicated_patterns && food.indicated_patterns.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {food.indicated_patterns.map(p => (
                      <span key={p} className="px-2.5 py-1 bg-white text-emerald-900 text-xs font-bold rounded-lg border border-emerald-200">
                        {p}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-emerald-600 italic">Nenhum padrão indicado.</span>
                )}
              </div>

              {/* Padrões Cautela */}
              <div className="bg-rose-50/50 p-5 rounded-xl border border-rose-100">
                <span className="text-xs text-rose-800 font-bold uppercase tracking-wider block mb-2">Padrões com Cautela</span>
                {food.caution_patterns && food.caution_patterns.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {food.caution_patterns.map(p => (
                      <span key={p} className="px-2.5 py-1 bg-white text-rose-900 text-xs font-bold rounded-lg border border-rose-200">
                        {p}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-rose-600 italic">Nenhum padrão de restrição cadastrado.</span>
                )}
              </div>
            </div>

            {/* Observações Gerais */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <span className="text-xs text-outline font-bold uppercase tracking-wider block">Observações Clínicas</span>
                <p className="text-sm font-medium text-on-surface-variant bg-surface-container-low p-4 rounded-xl border border-outline-variant/10">
                  {food.clinical_notes || <span className="text-outline italic font-medium">Nenhuma observação.</span>}
                </p>
              </div>
              <div className="space-y-1.5">
                <span className="text-xs text-outline font-bold uppercase tracking-wider block">Observações Culinárias</span>
                <p className="text-sm font-medium text-on-surface-variant bg-surface-container-low p-4 rounded-xl border border-outline-variant/10">
                  {food.culinary_notes || <span className="text-outline italic font-medium">Nenhuma observação.</span>}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-semibold">
              <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/10">
                <span className="text-[10px] text-outline font-bold block mb-1">MODOS DE PREPARO</span>
                <span>{food.preparation_modes?.join(', ') || '-'}</span>
              </div>
              <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/10">
                <span className="text-[10px] text-outline font-bold block mb-1">CONTRAINDICAÇÕES</span>
                <span>{food.contraindications || '-'}</span>
              </div>
              <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/10">
                <span className="text-[10px] text-outline font-bold block mb-1">ALERGÊNICOS</span>
                <span>{food.allergens || '-'}</span>
              </div>
              <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/10">
                <span className="text-[10px] text-outline font-bold block mb-1">RESTRIÇÕES GERAIS</span>
                <span>{food.restrictions || '-'}</span>
              </div>
            </div>
          </div>

          {/* Rastreabilidade por Referência */}
          <div className="pt-6 border-t border-outline-variant/10 space-y-4">
            <h3 className="text-base font-bold text-on-surface flex items-center gap-2">
              <Book size={18} /> Fontes Bibliográficas & Classificações por Obra
            </h3>
            {food.sources && food.sources.length > 0 ? (
              <div className="space-y-4">
                {food.sources.map((src, idx) => (
                  <div key={idx} className="bg-surface-container-low p-5 rounded-xl border border-outline-variant/10 text-xs space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-bold text-sm text-on-surface block">{src.source_title}</span>
                        <span className="text-outline">Autor: {src.author} | Edição: {src.edition || 'N/A'} | Ano: {src.publication_year || 'N/A'}</span>
                      </div>
                      {src.page && <span className="px-2.5 py-1 bg-white border rounded font-bold text-primary">Pág. {src.page}</span>}
                    </div>
                    {src.notes && (
                      <p className="text-outline italic border-l-2 border-outline-variant/30 pl-3">"{src.notes}"</p>
                    )}
                    
                    {/* Classificação específica da obra */}
                    {src.classification && (
                      <div className="mt-2 p-3 bg-white rounded-lg border border-outline-variant/5 space-y-2">
                        <span className="font-bold text-[10px] text-primary uppercase block">Classificação segundo esta referência:</span>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <span className="text-[9px] text-outline block">NATUREZA</span>
                            <span className="font-bold">{src.classification.thermal_nature || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-[9px] text-outline block">SABORES</span>
                            <span className="font-bold">{src.classification.flavors?.join(', ') || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-[9px] text-outline block">CANAIS</span>
                            <span className="font-bold">{src.classification.channels?.join(', ') || 'N/A'}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-outline italic">Nenhuma referência bibliográfica associada.</p>
            )}
          </div>

          {/* Divergências Literárias */}
          {food.divergences && food.divergences.length > 0 && (
            <div className="pt-6 border-t border-outline-variant/10 space-y-4">
              <h3 className="text-base font-bold text-rose-800 flex items-center gap-2">
                <AlertTriangle size={18} /> Divergências Literárias Identificadas (Histórico)
              </h3>
              <div className="space-y-4">
                {food.divergences.map((div, idx) => (
                  <div key={idx} className="bg-rose-50/50 p-4 rounded-xl border border-rose-100 text-xs space-y-2">
                    <span className="font-bold text-rose-950 uppercase tracking-wide">Divergência de Atributo: {div.attribute}</span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white p-3 rounded-lg border border-outline-variant/10">
                        <span className="font-bold block text-on-surface">Visão A ({div.source_a}):</span>
                        <span className="font-semibold text-on-surface-variant mt-1 block">{div.opinion_a}</span>
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-outline-variant/10">
                        <span className="font-bold block text-on-surface">Visão B ({div.source_b}):</span>
                        <span className="font-semibold text-on-surface-variant mt-1 block">{div.opinion_b}</span>
                      </div>
                    </div>
                    {div.clinical_recommendation && (
                      <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100 text-emerald-950">
                        <span className="font-bold flex items-center gap-1"><HelpCircle size={13} /> Recomendação adotada:</span>
                        <p className="font-medium mt-0.5">{div.clinical_recommendation}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Controle & Auditoria */}
          <div className="pt-6 border-t border-outline-variant/10 space-y-4">
            <h3 className="text-base font-bold text-on-surface flex items-center gap-2">
              <History size={18} /> Controle Editorial & Histórico de Alterações
            </h3>
            
            {food.original_imported_text && (
              <div className="bg-amber-50/30 p-4 rounded-xl border border-amber-100 text-xs space-y-1">
                <span className="font-bold text-amber-900 block">Texto Original da Carga de Importação</span>
                <p className="text-on-surface-variant italic">"{food.original_imported_text}"</p>
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-semibold text-on-surface">
              <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/10">
                <span className="text-[10px] text-outline font-bold block mb-1">CRIADO POR</span>
                <span>{food.created_by || 'Sistema'}</span>
              </div>
              <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/10">
                <span className="text-[10px] text-outline font-bold block mb-1">ATUALIZADO POR</span>
                <span>{food.updated_by || 'N/A'}</span>
              </div>
              <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/10">
                <span className="text-[10px] text-outline font-bold block mb-1">REVISADO POR</span>
                <span>{food.reviewed_by || 'Pendente'}</span>
              </div>
              <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/10">
                <span className="text-[10px] text-outline font-bold block mb-1">DATA DE REVISÃO</span>
                <span>{food.reviewed_at ? new Date(food.reviewed_at).toLocaleDateString('pt-BR') : 'N/A'}</span>
              </div>
            </div>

            {/* Histórico detalhado */}
            {food.audit_logs && food.audit_logs.length > 0 && (
              <div className="space-y-2 mt-4">
                <span className="text-xs text-outline font-bold uppercase tracking-wider block">Registros de Modificação</span>
                <div className="space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar">
                  {food.audit_logs.map((log, idx) => (
                    <div key={idx} className="flex justify-between items-center text-[10px] bg-surface-container-low p-2.5 rounded-lg border border-outline-variant/5">
                      <div>
                        <span className="font-bold text-on-surface">{new Date(log.timestamp).toLocaleDateString('pt-BR')} {new Date(log.timestamp).toLocaleTimeString('pt-BR')}</span>
                        <span className="text-outline mx-2">|</span>
                        <span className="font-bold text-primary">{log.action}</span>
                        <span className="text-outline mx-2">|</span>
                        <span className="text-on-surface-variant">{log.details}</span>
                      </div>
                      <span className="text-outline font-bold">{log.user}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="p-6 bg-surface-container-low border-t border-outline-variant/10 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-6 py-3 bg-primary text-white font-bold text-sm rounded-xl hover:bg-primary-container transition-all shadow-sm"
          >
            Fechar Ficha
          </button>
        </div>
        
      </div>
    </div>
  );
}
