import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Check, AlertTriangle, AlertCircle, Eye, Info } from 'lucide-react';
import { ChineseDietFood, ThermalNature, EditorialStatus, FoodSource, AuditLogEntry, FoodDivergence } from '@/types/dietotherapy';
import { dietotherapyService } from '@/lib/dietotherapyService';

interface FoodFormModalProps {
  food?: ChineseDietFood | null;
  onClose: () => void;
  onSave: (food: Partial<ChineseDietFood>) => Promise<void>;
}

const CATEGORIES = ['raízes', 'leguminosas', 'folhas', 'cereais', 'frutas', 'animais', 'alimentos extras'];
const NATURES: ThermalNature[] = ['Quente', 'Morno', 'Neutro', 'Fresco', 'Frio'];
const FLAVORS = ['Doce', 'Picante', 'Amargo', 'Azedo', 'Salgado', 'Adstringente'];
const CHANNELS = ['Baço', 'Estômago', 'Fígado', 'Coração', 'Pulmão', 'Rim', 'Vesícula Biliar', 'Intestino Grosso', 'Intestino Delgado', 'Bexiga'];
const PREP_MODES = ['Cozido', 'Sopa', 'Assado', 'Vapor', 'Cru', 'Chá'];
const DIRECTIONS = ['Ascendente', 'Descendente', 'Neutro', 'Flutuante', 'Profundo'];

export default function FoodFormModal({ food, onClose, onSave }: FoodFormModalProps) {
  // Dados de Identificação
  const [name, setName] = useState(food?.name || '');
  const [scientificName, setScientificName] = useState(food?.scientific_name || '');
  const [category, setCategory] = useState(food?.category || 'raízes');
  const [description, setDescription] = useState(food?.description || '');
  const [usedPart, setUsedPart] = useState(food?.used_part || '');
  const [imageUrl, setImageUrl] = useState(food?.image_url || '');
  const [isActive, setIsActive] = useState(food?.is_active ?? true);
  const [synonymsText, setSynonymsText] = useState(food?.synonyms?.join(', ') || '');

  // Classificação Energética
  const [thermalNature, setThermalNature] = useState<ThermalNature>(food?.thermal_nature || 'Neutro');
  const [flavors, setFlavors] = useState<string[]>(food?.flavors || []);
  const [channels, setChannels] = useState<string[]>(food?.channels || []);
  const [energyDirection, setEnergyDirection] = useState(food?.energy_direction || 'Neutro');
  const [functionsText, setFunctionsText] = useState(food?.therapeutic_functions?.join(', ') || '');

  // Aplicação
  const [indicatedPatternsText, setIndicatedPatternsText] = useState(food?.indicated_patterns?.join(', ') || '');
  const [cautionPatternsText, setCautionPatternsText] = useState(food?.caution_patterns?.join(', ') || '');
  const [prepModes, setPrepModes] = useState<string[]>(food?.preparation_modes || []);
  const [clinicalNotes, setClinicalNotes] = useState(food?.clinical_notes || '');
  const [culinaryNotes, setCulinaryNotes] = useState(food?.culinary_notes || '');
  const [contraindications, setContraindications] = useState(food?.contraindications || '');
  const [allergens, setAllergens] = useState(food?.allergens || '');
  const [restrictions, setRestrictions] = useState(food?.restrictions || '');

  // Controle & Auditoria
  const [editorialStatus, setEditorialStatus] = useState<EditorialStatus>(food?.editorial_status || 'published');
  const [reviewedBy, setReviewedBy] = useState(food?.reviewed_by || '');
  const [reviewedAt, setReviewedAt] = useState(food?.reviewed_at || '');
  const [originalImportedText] = useState(food?.original_imported_text || '');

  // Referências
  const [sources, setSources] = useState<FoodSource[]>(food?.sources || []);

  // Form de Nova Referência
  const [newSrcTitle, setNewSrcTitle] = useState('');
  const [newSrcAuthor, setNewSrcAuthor] = useState('');
  const [newSrcEdition, setNewSrcEdition] = useState('');
  const [newSrcPage, setNewSrcPage] = useState('');
  const [newSrcYear, setNewSrcYear] = useState('');
  const [newSrcNotes, setNewSrcNotes] = useState('');
  const [newSrcNature, setNewSrcNature] = useState<ThermalNature | ''>('');
  const [newSrcFlavors, setNewSrcFlavors] = useState<string[]>([]);
  const [newSrcChannels, setNewSrcChannels] = useState<string[]>([]);

  // Verificação de Duplicidade
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  useEffect(() => {
    const checkDuplicity = async () => {
      if (!name.trim()) {
        setDuplicateWarning(null);
        return;
      }
      const allFoods = await dietotherapyService.getFoods();
      const normName = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
      
      const found = allFoods.find(f => 
        f.id !== food?.id && (
          f.normalized_name === normName ||
          f.synonyms.some(s => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim() === normName)
        )
      );

      if (found) {
        setDuplicateWarning(`O alimento "${found.name}" já está cadastrado no sistema (ou possui este termo como sinônimo).`);
      } else {
        setDuplicateWarning(null);
      }
    };
    checkDuplicity();
  }, [name, food]);

  const toggleFlavor = (flavor: string) => {
    setFlavors(prev => prev.includes(flavor) ? prev.filter(f => f !== flavor) : [...prev, flavor]);
  };

  const toggleChannel = (channel: string) => {
    setChannels(prev => prev.includes(channel) ? prev.filter(c => c !== channel) : [...prev, channel]);
  };

  const togglePrepMode = (mode: string) => {
    setPrepModes(prev => prev.includes(mode) ? prev.filter(m => m !== mode) : [...prev, mode]);
  };

  const toggleNewSrcFlavor = (flavor: string) => {
    setNewSrcFlavors(prev => prev.includes(flavor) ? prev.filter(f => f !== flavor) : [...prev, flavor]);
  };

  const toggleNewSrcChannel = (channel: string) => {
    setNewSrcChannels(prev => prev.includes(channel) ? prev.filter(c => c !== channel) : [...prev, channel]);
  };

  const handleAddSource = () => {
    if (!newSrcTitle || !newSrcAuthor) return;
    
    const newSource: FoodSource = {
      source_title: newSrcTitle,
      author: newSrcAuthor,
      edition: newSrcEdition || undefined,
      page: newSrcPage || undefined,
      publication_year: newSrcYear ? parseInt(newSrcYear) : undefined,
      notes: newSrcNotes || undefined,
      classification: newSrcNature || newSrcFlavors.length > 0 || newSrcChannels.length > 0 ? {
        thermal_nature: newSrcNature || undefined,
        flavors: newSrcFlavors.length > 0 ? newSrcFlavors : undefined,
        channels: newSrcChannels.length > 0 ? newSrcChannels : undefined
      } : undefined
    };

    setSources(prev => [...prev, newSource]);
    
    // Reset formulário de referência
    setNewSrcTitle('');
    setNewSrcAuthor('');
    setNewSrcEdition('');
    setNewSrcPage('');
    setNewSrcYear('');
    setNewSrcNotes('');
    setNewSrcNature('');
    setNewSrcFlavors([]);
    setNewSrcChannels([]);
  };

  const handleRemoveSource = (idx: number) => {
    setSources(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const parsedSynonyms = synonymsText.split(',').map(s => s.trim()).filter(s => s !== '');
    const parsedFunctions = functionsText.split(',').map(s => s.trim()).filter(s => s !== '');
    const parsedIndicated = indicatedPatternsText.split(',').map(s => s.trim()).filter(s => s !== '');
    const parsedCaution = cautionPatternsText.split(',').map(s => s.trim()).filter(s => s !== '');

    // Criação dos Logs de Auditoria para registrar alterações de classificação
    const auditLogs: AuditLogEntry[] = food?.audit_logs ? [...food.audit_logs] : [];
    
    if (food) {
      let changeDetails = '';
      if (food.thermal_nature !== thermalNature) {
        changeDetails += `Natureza: ${food.thermal_nature} -> ${thermalNature}. `;
      }
      if (food.flavors.join(',') !== flavors.join(',')) {
        changeDetails += `Sabores: [${food.flavors.join(',')}] -> [${flavors.join(',')}]. `;
      }
      if (food.channels.join(',') !== channels.join(',')) {
        changeDetails += `Tropismos: [${food.channels.join(',')}] -> [${channels.join(',')}]. `;
      }

      if (changeDetails) {
        auditLogs.push({
          timestamp: new Date().toISOString(),
          user: 'suporte@axissystemas.com.br', // Mock do usuário ativo
          action: 'UPDATE_CLASSIFICATION',
          details: changeDetails
        });
      }
    } else {
      auditLogs.push({
        timestamp: new Date().toISOString(),
        user: 'suporte@axissystemas.com.br',
        action: 'INSERT',
        details: 'Criação do alimento.'
      });
    }

    const foodData: Partial<ChineseDietFood> = {
      id: food?.id,
      name,
      scientific_name: scientificName || undefined,
      category,
      description: description || undefined,
      used_part: usedPart || undefined,
      image_url: imageUrl || undefined,
      is_active: isActive,
      synonyms: parsedSynonyms,
      
      thermal_nature: thermalNature,
      flavors,
      channels,
      energy_direction: energyDirection || undefined,
      therapeutic_functions: parsedFunctions,
      
      indicated_patterns: parsedIndicated,
      caution_patterns: parsedCaution,
      preparation_modes: prepModes,
      clinical_notes: clinicalNotes || undefined,
      culinary_notes: culinaryNotes || undefined,
      contraindications: contraindications || undefined,
      allergens: allergens || undefined,
      restrictions: restrictions || undefined,
      
      editorial_status: editorialStatus,
      reviewed_by: reviewedBy || undefined,
      reviewed_at: reviewedAt || undefined,
      original_imported_text: originalImportedText || undefined,
      audit_logs: auditLogs,
      
      sources,
      divergences: food?.divergences || []
    };

    await onSave(foodData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal Container */}
      <div className="relative bg-white w-full max-w-4xl rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-8 border-b border-outline-variant/10 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold font-headline text-on-surface">
              {food ? `Editar Alimento: ${food.name}` : 'Cadastrar Alimento'}
            </h2>
            {editorialStatus !== 'published' && (
              <span className="inline-flex items-center gap-1 mt-1 text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                <AlertTriangle size={12} /> Registro Não Revisado
              </span>
            )}
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-surface-container-low rounded-full transition-all text-on-surface-variant"
          >
            <X size={24} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
          
          {/* Seção 1: Identificação */}
          <div className="space-y-4">
            <h3 className="text-base font-bold text-primary flex items-center gap-2 border-b border-outline-variant/15 pb-2">
              📂 Identificação Básica
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Nome */}
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-bold text-outline uppercase">Nome do Alimento *</label>
                <input 
                  required
                  type="text" 
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-surface-container-low rounded-xl border border-outline-variant/10 focus:ring-2 focus:ring-primary/20 outline-none font-medium"
                  placeholder="Ex: Alho"
                />
                {duplicateWarning && (
                  <p className="text-xs font-semibold text-rose-700 mt-1 flex items-center gap-1">
                    <AlertCircle size={14} /> {duplicateWarning}
                  </p>
                )}
              </div>

              {/* Ativo / Inativo */}
              <div className="space-y-1.5 flex flex-col justify-end">
                <label className="text-xs font-bold text-outline uppercase mb-2">Status de Atividade</label>
                <label className="inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={isActive} 
                    onChange={e => setIsActive(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="relative w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  <span className="ms-3 text-xs font-bold text-on-surface">{isActive ? 'Ativo no Sistema' : 'Inativo / Oculto'}</span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Categoria */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-outline uppercase">Categoria</label>
                <select 
                  value={category} 
                  onChange={e => setCategory(e.target.value)}
                  className="w-full px-4 py-3.5 bg-surface-container-low rounded-xl border border-outline-variant/10 text-xs font-bold text-on-surface outline-none"
                >
                  {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat.toUpperCase()}</option>)}
                </select>
              </div>

              {/* Nome Científico */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-outline uppercase">Nome Científico</label>
                <input 
                  type="text" 
                  value={scientificName}
                  onChange={e => setScientificName(e.target.value)}
                  className="w-full px-4 py-3 bg-surface-container-low rounded-xl border border-outline-variant/10 text-xs font-semibold"
                  placeholder="Ex: Allium sativum"
                />
              </div>

              {/* Parte Utilizada */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-outline uppercase">Parte Utilizada</label>
                <input 
                  type="text" 
                  value={usedPart}
                  onChange={e => setUsedPart(e.target.value)}
                  className="w-full px-4 py-3 bg-surface-container-low rounded-xl border border-outline-variant/10 text-xs font-semibold"
                  placeholder="Ex: Bulbo"
                />
              </div>
            </div>

            {/* Nome Alternativo / Sinônimos */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-outline uppercase">Sinônimos ou Nomes Alternativos (separados por vírgula)</label>
              <input 
                type="text" 
                value={synonymsText}
                onChange={e => setSynonymsText(e.target.value)}
                className="w-full px-4 py-3 bg-surface-container-low rounded-xl border border-outline-variant/10 text-xs font-medium"
                placeholder="Ex: Alho-comum, Bulbo de Alho"
              />
            </div>

            {/* Imagem Opcional */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-outline uppercase">URL da Imagem Ilustrativa</label>
              <input 
                type="text" 
                value={imageUrl}
                onChange={e => setImageUrl(e.target.value)}
                className="w-full px-4 py-3 bg-surface-container-low rounded-xl border border-outline-variant/10 text-xs font-medium"
                placeholder="Ex: https://exemplo.com/alho.jpg"
              />
            </div>

            {/* Descrição */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-outline uppercase">Descrição Geral</label>
              <textarea 
                rows={3}
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full px-4 py-3 bg-surface-container-low rounded-xl border border-outline-variant/10 text-xs font-medium resize-none"
                placeholder="Descreva o alimento de forma sucinta..."
              />
            </div>
          </div>

          {/* Seção 2: Classificação Energética */}
          <div className="space-y-4">
            <h3 className="text-base font-bold text-primary flex items-center gap-2 border-b border-outline-variant/15 pb-2">
              ☯️ Classificação Energética MTC
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Natureza Térmica */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-outline uppercase">Natureza Térmica (Selecione da Base Padronizada) *</label>
                <select 
                  value={thermalNature} 
                  onChange={e => setThermalNature(e.target.value as ThermalNature)}
                  className="w-full px-4 py-3.5 bg-surface-container-low rounded-xl border border-outline-variant/10 text-xs font-bold text-on-surface outline-none"
                >
                  {NATURES.map(nat => <option key={nat} value={nat}>{nat}</option>)}
                </select>
              </div>

              {/* Direção Energética */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-outline uppercase">Direção Energética</label>
                <select 
                  value={energyDirection} 
                  onChange={e => setEnergyDirection(e.target.value)}
                  className="w-full px-4 py-3.5 bg-surface-container-low rounded-xl border border-outline-variant/10 text-xs font-bold text-on-surface outline-none"
                >
                  {DIRECTIONS.map(dir => <option key={dir} value={dir}>{dir}</option>)}
                </select>
              </div>
            </div>

            {/* Sabores */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-outline uppercase block">Sabores *</label>
              <div className="flex flex-wrap gap-2">
                {FLAVORS.map(flavor => (
                  <button
                    type="button"
                    key={flavor}
                    onClick={() => toggleFlavor(flavor)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                      flavors.includes(flavor) 
                        ? 'bg-primary text-white border-primary shadow-sm' 
                        : 'bg-surface-container-low text-on-surface border-outline-variant/20 hover:border-primary/30'
                    }`}
                  >
                    {flavor}
                  </button>
                ))}
              </div>
            </div>

            {/* Canais / Tropismo */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-outline uppercase block">Canais de Penetração (Meridianos) *</label>
              <div className="flex flex-wrap gap-2">
                {CHANNELS.map(channel => (
                  <button
                    type="button"
                    key={channel}
                    onClick={() => toggleChannel(channel)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                      channels.includes(channel) 
                        ? 'bg-secondary text-white border-secondary shadow-sm' 
                        : 'bg-surface-container-low text-on-surface border-outline-variant/20 hover:border-secondary/30'
                    }`}
                  >
                    {channel}
                  </button>
                ))}
              </div>
            </div>

            {/* Funções Terapêuticas */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-outline uppercase">Funções Terapêuticas (separadas por vírgula)</label>
              <textarea 
                rows={2}
                value={functionsText}
                onChange={e => setFunctionsText(e.target.value)}
                className="w-full px-4 py-3 bg-surface-container-low rounded-xl border border-outline-variant/10 text-xs font-semibold resize-none"
                placeholder="Ex: Tonificar Qi do Baço, Harmonizar o Estômago"
              />
            </div>
          </div>

          {/* Seção 3: Aplicação Prática */}
          <div className="space-y-4">
            <h3 className="text-base font-bold text-primary flex items-center gap-2 border-b border-outline-variant/15 pb-2">
              📋 Aplicação Prática & Cuidados
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Padrões Indicados */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-outline uppercase">Padrões Indicados (separados por vírgula)</label>
                <input 
                  type="text" 
                  value={indicatedPatternsText}
                  onChange={e => setIndicatedPatternsText(e.target.value)}
                  className="w-full px-4 py-3 bg-surface-container-low rounded-xl border border-outline-variant/10 text-xs font-medium"
                  placeholder="Ex: Deficiência de Yang, Frio no Estômago"
                />
              </div>

              {/* Padrões Cautela */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-outline uppercase">Padrões de Cautela / Contraindicação (separados por vírgula)</label>
                <input 
                  type="text" 
                  value={cautionPatternsText}
                  onChange={e => setCautionPatternsText(e.target.value)}
                  className="w-full px-4 py-3 bg-surface-container-low rounded-xl border border-outline-variant/10 text-xs font-medium"
                  placeholder="Ex: Deficiência de Yin, Calor de Estômago"
                />
              </div>
            </div>

            {/* Observações Clínicas & Culinárias */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-outline uppercase">Observações Clínicas</label>
                <textarea 
                  rows={2}
                  value={clinicalNotes}
                  onChange={e => setClinicalNotes(e.target.value)}
                  className="w-full px-4 py-3 bg-surface-container-low rounded-xl border border-outline-variant/10 text-xs font-medium resize-none"
                  placeholder="Instruções para o terapeuta na consulta..."
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-outline uppercase">Observações Culinárias (Preparo)</label>
                <textarea 
                  rows={2}
                  value={culinaryNotes}
                  onChange={e => setCulinaryNotes(e.target.value)}
                  className="w-full px-4 py-3 bg-surface-container-low rounded-xl border border-outline-variant/10 text-xs font-medium resize-none"
                  placeholder="Indicações de culinária curativa MTC..."
                />
              </div>
            </div>

            {/* Modos de Preparo */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-outline uppercase block">Modos de Preparo</label>
              <div className="flex flex-wrap gap-2">
                {PREP_MODES.map(mode => (
                  <button
                    type="button"
                    key={mode}
                    onClick={() => togglePrepMode(mode)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                      prepModes.includes(mode) 
                        ? 'bg-surface-container-high text-on-surface border-outline shadow-sm' 
                        : 'bg-surface-container-low text-on-surface border-outline-variant/20 hover:border-outline/30'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            {/* Contraindicações, restrições e alergênicos */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-outline uppercase">Contraindicações Gerais</label>
                <input 
                  type="text" 
                  value={contraindications}
                  onChange={e => setContraindications(e.target.value)}
                  className="w-full px-4 py-3 bg-surface-container-low rounded-xl border border-outline-variant/10 text-xs font-medium"
                  placeholder="Ex: Evitar em crises agudas"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-outline uppercase">Alergênicos</label>
                <input 
                  type="text" 
                  value={allergens}
                  onChange={e => setAllergens(e.target.value)}
                  className="w-full px-4 py-3 bg-surface-container-low rounded-xl border border-outline-variant/10 text-xs font-medium"
                  placeholder="Ex: Glúten, Lactose"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-outline uppercase">Restrições Alimentares</label>
                <input 
                  type="text" 
                  value={restrictions}
                  onChange={e => setRestrictions(e.target.value)}
                  className="w-full px-4 py-3 bg-surface-container-low rounded-xl border border-outline-variant/10 text-xs font-medium"
                  placeholder="Ex: Pacientes hipertensos"
                />
              </div>
            </div>
          </div>

          {/* Seção 4: Referências Bibliográficas (Divergências mantidas estritamente por fonte!) */}
          <div className="pt-6 border-t border-outline-variant/10 space-y-4">
            <h3 className="text-base font-bold text-primary flex items-center gap-2 border-b border-outline-variant/15 pb-2">
              📚 Fontes Bibliográficas & Referências Literárias
            </h3>

            {sources.length > 0 && (
              <div className="space-y-3">
                {sources.map((src, idx) => (
                  <div key={idx} className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/10 text-xs flex justify-between items-start">
                    <div className="space-y-1">
                      <span className="font-bold text-on-surface text-sm block">{src.source_title}</span>
                      <p className="text-on-surface-variant font-medium">
                        Autor: {src.author} | Edição: {src.edition || 'N/A'} | Ano: {src.publication_year || 'N/A'}
                      </p>
                      {src.classification && (
                        <div className="bg-white p-2.5 rounded border border-outline-variant/10 mt-2 text-[10px] text-primary">
                          <span className="font-bold block">Classificação declarada nesta obra:</span>
                          Natureza: {src.classification.thermal_nature || '-'} | Sabores: {src.classification.flavors?.join(', ') || '-'} | Canais: {src.classification.channels?.join(', ') || '-'}
                        </div>
                      )}
                    </div>
                    <button 
                      type="button" 
                      onClick={() => handleRemoveSource(idx)}
                      className="text-rose-500 hover:text-rose-700 p-1"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Adicionar Nova Referência */}
            <div className="bg-surface-container-low/50 p-6 rounded-2xl border border-outline-variant/10 space-y-4">
              <span className="text-xs font-bold text-on-surface block flex items-center gap-1.5">
                <Plus size={16} /> Registrar Informação de Nova Obra
              </span>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-outline uppercase">Título da Obra *</label>
                  <input 
                    type="text" 
                    value={newSrcTitle}
                    onChange={e => setNewSrcTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-white rounded-lg border border-outline-variant/10 text-xs"
                    placeholder="Ex: Medicina Chinesa"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-outline uppercase">Autor *</label>
                  <input 
                    type="text" 
                    value={newSrcAuthor}
                    onChange={e => setNewSrcAuthor(e.target.value)}
                    className="w-full px-3 py-2 bg-white rounded-lg border border-outline-variant/10 text-xs"
                    placeholder="Ex: Maciocia"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-outline uppercase">Edição</label>
                  <input 
                    type="text" 
                    value={newSrcEdition}
                    onChange={e => setNewSrcEdition(e.target.value)}
                    className="w-full px-3 py-2 bg-white rounded-lg border border-outline-variant/10 text-xs"
                    placeholder="Ex: 2ª Edição"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-outline uppercase">Página</label>
                  <input 
                    type="text" 
                    value={newSrcPage}
                    onChange={e => setNewSrcPage(e.target.value)}
                    className="w-full px-3 py-2 bg-white rounded-lg border border-outline-variant/10 text-xs"
                    placeholder="Ex: 112"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-outline uppercase">Ano de Publicação</label>
                  <input 
                    type="number" 
                    value={newSrcYear}
                    onChange={e => setNewSrcYear(e.target.value)}
                    className="w-full px-3 py-2 bg-white rounded-lg border border-outline-variant/10 text-xs"
                    placeholder="Ex: 2005"
                  />
                </div>
              </div>

              {/* Classificação específica da obra (Divergências preservadas!) */}
              <div className="p-4 bg-white rounded-xl border border-outline-variant/10 space-y-4">
                <span className="text-[10px] font-bold text-outline uppercase block">Classificação Específica segundo esta Referência</span>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-outline uppercase">Natureza Térmica da Referência</label>
                    <select 
                      value={newSrcNature}
                      onChange={e => setNewSrcNature(e.target.value as ThermalNature)}
                      className="w-full p-2.5 bg-surface-container-low rounded-lg border border-outline-variant/10 text-xs"
                    >
                      <option value="">Não declarada</option>
                      {NATURES.map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-bold text-outline uppercase block">Sabores da Referência</label>
                  <div className="flex flex-wrap gap-1.5">
                    {FLAVORS.map(flavor => (
                      <button
                        type="button"
                        key={flavor}
                        onClick={() => toggleNewSrcFlavor(flavor)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${
                          newSrcFlavors.includes(flavor) 
                            ? 'bg-primary text-white border-primary shadow-sm' 
                            : 'bg-surface-container-low text-on-surface border-outline-variant/20 hover:border-primary/30'
                        }`}
                      >
                        {flavor}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-bold text-outline uppercase block">Canais da Referência</label>
                  <div className="flex flex-wrap gap-1.5">
                    {CHANNELS.map(channel => (
                      <button
                        type="button"
                        key={channel}
                        onClick={() => toggleNewSrcChannel(channel)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${
                          newSrcChannels.includes(channel) 
                            ? 'bg-secondary text-white border-secondary shadow-sm' 
                            : 'bg-surface-container-low text-on-surface border-outline-variant/20 hover:border-secondary/30'
                        }`}
                      >
                        {channel}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-outline uppercase">Observações da Referência</label>
                <textarea 
                  rows={2} 
                  value={newSrcNotes}
                  onChange={e => setNewSrcNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-white rounded-lg border border-outline-variant/10 text-xs font-medium resize-none"
                  placeholder="Citações ou notas de preparo citadas especificamente por este autor..."
                />
              </div>

              <button
                type="button"
                onClick={handleAddSource}
                disabled={!newSrcTitle || !newSrcAuthor}
                className="px-5 py-2.5 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary-container disabled:opacity-40 shadow-sm"
              >
                Vincular Referência
              </button>
            </div>
          </div>

          {/* Seção 5: Controle e Auditoria */}
          <div className="pt-6 border-t border-outline-variant/10 space-y-4">
            <h3 className="text-base font-bold text-primary flex items-center gap-2 border-b border-outline-variant/15 pb-2">
              ⚙️ Controle Editorial & Auditoria
            </h3>

            {originalImportedText && (
              <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-100 space-y-1">
                <span className="text-xs font-bold text-amber-900 flex items-center gap-1">
                  <Info size={14} /> Texto Original Preservado (Carga de Importação)
                </span>
                <p className="text-xs text-on-surface-variant italic leading-relaxed">"{originalImportedText}"</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Status Editorial */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-outline uppercase">Status Editorial</label>
                <select 
                  value={editorialStatus} 
                  onChange={e => setEditorialStatus(e.target.value as EditorialStatus)}
                  className="w-full px-4 py-3.5 bg-surface-container-low rounded-xl border border-outline-variant/10 text-xs font-bold text-on-surface outline-none"
                >
                  <option value="published">Revisado e Publicado</option>
                  <option value="pending_review">Pendente de Revisão</option>
                  <option value="under_review">Em Revisão</option>
                  <option value="archived">Arquivado</option>
                </select>
              </div>

              {/* Revisado Por */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-outline uppercase">Revisado Por</label>
                <input 
                  type="text" 
                  value={reviewedBy}
                  onChange={e => setReviewedBy(e.target.value)}
                  className="w-full px-4 py-3 bg-surface-container-low rounded-xl border border-outline-variant/10 text-xs font-semibold"
                  placeholder="Ex: Dr. Silva"
                />
              </div>

              {/* Data da Revisão */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-outline uppercase">Data da Revisão</label>
                <input 
                  type="date" 
                  value={reviewedAt ? reviewedAt.split('T')[0] : ''}
                  onChange={e => setReviewedAt(e.target.value ? new Date(e.target.value).toISOString() : '')}
                  className="w-full px-4 py-3 bg-surface-container-low rounded-xl border border-outline-variant/10 text-xs font-semibold"
                />
              </div>
            </div>
          </div>

        </form>

        {/* Footer */}
        <div className="p-6 bg-surface-container-low border-t border-outline-variant/10 flex justify-end gap-3">
          <button 
            type="button"
            onClick={onClose}
            className="px-6 py-3 border border-outline-variant/20 rounded-xl font-bold text-sm text-outline hover:bg-white transition-all"
          >
            Cancelar
          </button>
          <button 
            onClick={handleSave}
            className="px-6 py-3 bg-primary text-white font-bold text-sm rounded-xl hover:bg-primary-container transition-all shadow-md flex items-center gap-2"
          >
            <Check size={18} /> Salvar Alimento
          </button>
        </div>

      </div>
    </div>
  );
}
