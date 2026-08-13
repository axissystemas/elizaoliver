'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, 
  Plus, 
  Filter, 
  BookOpen, 
  ArrowUpDown, 
  ChevronLeft, 
  ChevronRight, 
  Sparkles, 
  RotateCcw,
  CheckCircle,
  Clock,
  Eye,
  AlertCircle,
  Upload,
  Compass,
  ArrowUp,
  ArrowDown,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ChineseDietFood, ThermalNature, EditorialStatus } from '@/types/dietotherapy';
import { dietotherapyService } from '@/lib/dietotherapyService';
import FoodDetailModal from './FoodDetailModal';
import FoodFormModal from './FoodFormModal';
import DietBuilderModal from './DietBuilderModal';
import FoodImportModal from './FoodImportModal';
import { User } from '@/types/auth';

interface DietotherapyViewProps {
  user?: User | null;
}

const CATEGORIES = ['Todos', 'raízes', 'leguminosas', 'folhas', 'cereais', 'frutas', 'animais', 'alimentos extras'];
const NATURES = ['Todos', 'Quente', 'Morno', 'Neutro', 'Fresco', 'Frio'];
const DIRECTIONS = ['Todos', 'Ascendente', 'Descendente', 'Flutuante', 'Afundante', 'Neutro'];
const FLAVORS = ['Todos', 'Doce', 'Picante', 'Amargo', 'Azedo', 'Salgado', 'Adstringente'];
const CHANNELS = ['Todos', 'Baço', 'Estômago', 'Fígado', 'Coração', 'Pulmão', 'Rim', 'Vesícula Biliar', 'Intestino Grosso', 'Intestino Delgado', 'Bexiga'];
const PREP_MODES = ['Todos', 'Cozido', 'Sopa', 'Assado', 'Vapor', 'Cru', 'Chá'];
const STATUSES = ['Todos', 'published', 'pending_review', 'under_review', 'archived'];

export default function DietotherapyView({ user }: DietotherapyViewProps) {
  // Estado dos Dados
  const [foods, setFoods] = useState<ChineseDietFood[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros e Busca
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [selectedNature, setSelectedNature] = useState('Todos');
  const [selectedDirection, setSelectedDirection] = useState('Todos');
  const [selectedFlavor, setSelectedFlavor] = useState('Todos');
  const [selectedChannel, setSelectedChannel] = useState('Todos');
  const [selectedFunction, setSelectedFunction] = useState('Todos');
  const [selectedIndication, setSelectedIndication] = useState('Todos');
  const [selectedCaution, setSelectedCaution] = useState('Todos');
  const [selectedPrepMode, setSelectedPrepMode] = useState('Todos');
  const [selectedStatus, setSelectedStatus] = useState('Todos');
  const [selectedSource, setSelectedSource] = useState('Todos');

  // Ordenação e Paginação
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Modais e Detalhes
  const [selectedFood, setSelectedFood] = useState<ChineseDietFood | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingFood, setEditingFood] = useState<ChineseDietFood | null>(null);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Permissões
  const canCreate = user?.permissions.includes('dietotherapy:create') || user?.role === 'ADMIN';

  // Forçar Sincronismo com o banco Supabase
  const handleForceSync = async () => {
    setIsSyncing(true);
    try {
      const res = await dietotherapyService.forceSyncWithDatabase();
      if (res.error) {
        alert(`Aviso na sincronização: ${res.error}\nRegistros processados: ${res.successCount}`);
      } else {
        alert(`Sincronização concluída com sucesso! ${res.successCount} alimentos salvos na tabela chinese_diet_foods do banco Supabase.`);
      }
      await fetchFoods();
    } catch (e: any) {
      alert(`Erro na sincronização: ${e.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Buscar alimentos
  const fetchFoods = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await dietotherapyService.getFoods({
        searchTerm,
        category: selectedCategory,
        thermal_nature: selectedNature,
        energy_direction: selectedDirection,
        flavor: selectedFlavor,
        channel: selectedChannel,
        therapeutic_function: selectedFunction !== 'Todos' ? selectedFunction : undefined,
        indicated_pattern: selectedIndication !== 'Todos' ? selectedIndication : undefined,
        caution_pattern: selectedCaution !== 'Todos' ? selectedCaution : undefined,
        preparation_mode: selectedPrepMode,
        editorial_status: selectedStatus,
        source: selectedSource,
        sortBy,
        sortOrder
      });
      setFoods(data);
    } catch (err: any) {
      setError(err?.message || 'Erro ao carregar alimentos.');
    } finally {
      setLoading(false);
    }
  }, [
    searchTerm, selectedCategory, selectedNature, selectedDirection, selectedFlavor, selectedChannel, 
    selectedFunction, selectedIndication, selectedCaution, selectedPrepMode, 
    selectedStatus, selectedSource, sortBy, sortOrder
  ]);

  useEffect(() => {
    fetchFoods();
  }, [fetchFoods]);

  // Resetar todos os filtros
  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedCategory('Todos');
    setSelectedNature('Todos');
    setSelectedDirection('Todos');
    setSelectedFlavor('Todos');
    setSelectedChannel('Todos');
    setSelectedFunction('Todos');
    setSelectedIndication('Todos');
    setSelectedCaution('Todos');
    setSelectedPrepMode('Todos');
    setSelectedStatus('Todos');
    setSelectedSource('Todos');
    setCurrentPage(1);
  };

  // Salvar alimento
  const handleSaveFood = async (foodData: Partial<ChineseDietFood>) => {
    try {
      await dietotherapyService.saveFood(foodData);
      await fetchFoods();
    } catch (err: any) {
      alert(err?.message || 'Erro ao salvar o alimento.');
    }
  };

  // Paginação
  const totalPages = Math.ceil(foods.length / itemsPerPage);
  const paginatedFoods = foods.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getThermalBadgeClass = (nature: string) => {
    const n = (nature || '').trim().toLowerCase();
    if (n.includes('quente')) return 'bg-amber-100 text-amber-900 border-amber-200';
    if (n.includes('morn')) return 'bg-orange-100 text-orange-900 border-orange-200';
    if (n.includes('neutr')) return 'bg-emerald-100 text-emerald-900 border-emerald-200';
    if (n.includes('fresc')) return 'bg-sky-100 text-sky-900 border-sky-200';
    if (n.includes('fri')) return 'bg-indigo-100 text-indigo-900 border-indigo-200';
    return 'bg-slate-100 text-slate-900 border-slate-200';
  };

  const getDirectionBadge = (direction?: string) => {
    const dir = direction || 'Neutro';
    let icon = <Compass size={11} className="shrink-0 text-purple-600" />;
    let color = 'bg-purple-50 text-purple-700 border-purple-200/80';

    if (dir.toLowerCase().includes('ascend') || dir.toLowerCase().includes('subir')) {
      icon = <ArrowUp size={11} className="shrink-0 text-amber-600" />;
      color = 'bg-amber-50 text-amber-900 border-amber-200/80';
    } else if (dir.toLowerCase().includes('descend') || dir.toLowerCase().includes('descer')) {
      icon = <ArrowDown size={11} className="shrink-0 text-sky-600" />;
      color = 'bg-sky-50 text-sky-900 border-sky-200/80';
    } else if (dir.toLowerCase().includes('flutua') || dir.toLowerCase().includes('superf')) {
      icon = <ArrowUpRight size={11} className="shrink-0 text-emerald-600" />;
      color = 'bg-emerald-50 text-emerald-900 border-emerald-200/80';
    } else if (dir.toLowerCase().includes('afunda') || dir.toLowerCase().includes('profund')) {
      icon = <ArrowDownRight size={11} className="shrink-0 text-indigo-600" />;
      color = 'bg-indigo-50 text-indigo-900 border-indigo-200/80';
    } else if (dir.toLowerCase().includes('neutr') || dir.toLowerCase().includes('centr')) {
      icon = <Minus size={11} className="shrink-0 text-slate-500" />;
      color = 'bg-slate-50 text-slate-800 border-slate-200/80';
    }

    return (
      <span className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border flex items-center gap-1 shadow-2xs ${color}`}>
        {icon}
        <span>Direção: <strong className="font-extrabold">{dir}</strong></span>
      </span>
    );
  };

  return (
    <div className="space-y-8">
      {/* Top Description & Actions */}
      <section className="flex flex-col md:flex-row gap-6 justify-between items-start">
        <div>
          <h2 className="text-3xl font-bold font-headline text-on-surface">Dietoterapia Chinesa</h2>
          <p className="text-on-surface-variant text-md mt-2 font-medium">
            Explore propriedades energéticas, classificações por autor, sabores, naturezas térmicas e canais de penetração para orientar a alimentação de pacientes.
          </p>
        </div>
        <div className="flex gap-2.5 flex-wrap">
          <button 
            onClick={() => {
              setIsBuilderOpen(true);
            }}
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-white text-primary border border-outline-variant/15 hover:bg-surface-container-low transition-all flex items-center gap-1.5 shadow-sm"
          >
            <Sparkles size={15} /> Criar Orientação Dietética
          </button>
          {canCreate && (
            <div className="flex gap-2">
              <button 
                onClick={() => {
                  setEditingFood(null);
                  setIsFormOpen(true);
                }}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-primary text-white hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-1.5 shadow-md shadow-primary/20"
              >
                <Plus size={15} /> Cadastrar Alimento
              </button>
              <button 
                onClick={() => {
                  setIsImportModalOpen(true);
                }}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
              >
                <Upload size={15} /> Importar Lote
              </button>
              <button 
                onClick={handleForceSync}
                disabled={isSyncing}
                className="px-5 py-3.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2 shadow-md shadow-indigo-600/20 disabled:opacity-50"
                title="Forçar envio de todos os alimentos locais para a tabela chinese_diet_foods no banco Supabase"
              >
                <RotateCcw size={16} className={isSyncing ? 'animate-spin' : ''} />
                {isSyncing ? 'Sincronizando...' : 'Sincronizar Nuvem'}
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Search and Filters Toggle */}
      <section className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-outline" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por nome, sinônimo, sabor, natureza, canal, padrão energético..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-12 pr-4 py-4 bg-white rounded-xl border border-outline-variant/10 shadow-sm text-on-surface font-medium placeholder-outline"
          />
        </div>
        
        <div className="flex gap-2">
          <button 
            onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
            className={`px-5 py-4 rounded-xl border text-xs font-bold flex items-center gap-2 shadow-sm transition-all ${
              isFilterPanelOpen 
                ? 'bg-primary text-white border-primary' 
                : 'bg-white text-on-surface border-outline-variant/10 hover:bg-surface-container-low'
            }`}
          >
            <Filter size={16} /> Filtros {isFilterPanelOpen ? '(Ocultar)' : '(Exibir)'}
          </button>
          
          <button 
            onClick={handleResetFilters}
            className="px-4 py-4 bg-white text-outline rounded-xl border border-outline-variant/10 shadow-sm hover:text-primary transition-all"
            title="Resetar Filtros"
          >
            <RotateCcw size={16} />
          </button>
        </div>
      </section>

      {/* Advanced Filters Panel */}
      <AnimatePresence>
        {isFilterPanelOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-white rounded-2xl border border-outline-variant/10 p-6 shadow-sm overflow-hidden"
          >
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* Categoria */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-outline uppercase tracking-wider">Categoria</label>
                <select 
                  value={selectedCategory} 
                  onChange={e => { setSelectedCategory(e.target.value); setCurrentPage(1); }}
                  className="w-full p-3 bg-surface-container-low rounded-xl border border-outline-variant/10 text-xs font-semibold text-on-surface"
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c === 'Todos' ? 'Todas' : c.toUpperCase()}</option>)}
                </select>
              </div>

              {/* Natureza */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-outline uppercase tracking-wider">Natureza Térmica</label>
                <select 
                  value={selectedNature} 
                  onChange={e => { setSelectedNature(e.target.value); setCurrentPage(1); }}
                  className="w-full p-3 bg-surface-container-low rounded-xl border border-outline-variant/10 text-xs font-semibold text-on-surface"
                >
                  {NATURES.map(n => <option key={n} value={n}>{n === 'Todos' ? 'Todas' : n}</option>)}
                </select>
              </div>

              {/* Direção Energética */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-outline uppercase tracking-wider">Direção Energética</label>
                <select 
                  value={selectedDirection} 
                  onChange={e => { setSelectedDirection(e.target.value); setCurrentPage(1); }}
                  className="w-full p-3 bg-surface-container-low rounded-xl border border-outline-variant/10 text-xs font-semibold text-on-surface"
                >
                  {DIRECTIONS.map(d => <option key={d} value={d}>{d === 'Todos' ? 'Todas as Direções' : d}</option>)}
                </select>
              </div>

              {/* Sabor */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-outline uppercase tracking-wider">Sabor</label>
                <select 
                  value={selectedFlavor} 
                  onChange={e => { setSelectedFlavor(e.target.value); setCurrentPage(1); }}
                  className="w-full p-3 bg-surface-container-low rounded-xl border border-outline-variant/10 text-xs font-semibold text-on-surface"
                >
                  {FLAVORS.map(f => <option key={f} value={f}>{f === 'Todos' ? 'Todos' : f}</option>)}
                </select>
              </div>

              {/* Tropismo / Canal */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-outline uppercase tracking-wider">Canal / Tropismo</label>
                <select 
                  value={selectedChannel} 
                  onChange={e => { setSelectedChannel(e.target.value); setCurrentPage(1); }}
                  className="w-full p-3 bg-surface-container-low rounded-xl border border-outline-variant/10 text-xs font-semibold text-on-surface"
                >
                  {CHANNELS.map(ch => <option key={ch} value={ch}>{ch === 'Todos' ? 'Todos' : ch}</option>)}
                </select>
              </div>

              {/* Modo de Preparo */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-outline uppercase tracking-wider">Modo de Preparo</label>
                <select 
                  value={selectedPrepMode} 
                  onChange={e => { setSelectedPrepMode(e.target.value); setCurrentPage(1); }}
                  className="w-full p-3 bg-surface-container-low rounded-xl border border-outline-variant/10 text-xs font-semibold text-on-surface"
                >
                  {PREP_MODES.map(pm => <option key={pm} value={pm}>{pm === 'Todos' ? 'Todos' : pm}</option>)}
                </select>
              </div>

              {/* Status de Revisão */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-outline uppercase tracking-wider">Status de Revisão</label>
                <select 
                  value={selectedStatus} 
                  onChange={e => { setSelectedStatus(e.target.value); setCurrentPage(1); }}
                  className="w-full p-3 bg-surface-container-low rounded-xl border border-outline-variant/10 text-xs font-semibold text-on-surface"
                >
                  {STATUSES.map(st => (
                    <option key={st} value={st}>
                      {st === 'Todos' ? 'Todos' : 
                       st === 'published' ? 'Revisado / Publicado' : 
                       st === 'pending_review' ? 'Pendente de Revisão' : st}
                    </option>
                  ))}
                </select>
              </div>

              {/* Origem ou Referência */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-outline uppercase tracking-wider">Origem / Autor</label>
                <select 
                  value={selectedSource} 
                  onChange={e => { setSelectedSource(e.target.value); setCurrentPage(1); }}
                  className="w-full p-3 bg-surface-container-low rounded-xl border border-outline-variant/10 text-xs font-semibold text-on-surface"
                >
                  <option value="Todos">Todas as Referências</option>
                  <option value="Dietoterapia Chinesa">Maciocia (Dietoterapia Chinesa)</option>
                  <option value="A Saúde Através dos Alimentos">Bob Flaws (A Saúde Através dos Alimentos)</option>
                </select>
              </div>

              {/* Funções Terapêuticas */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-outline uppercase tracking-wider">Função Terapêutica</label>
                <select 
                  value={selectedFunction} 
                  onChange={e => { setSelectedFunction(e.target.value); setCurrentPage(1); }}
                  className="w-full p-3 bg-surface-container-low rounded-xl border border-outline-variant/10 text-xs font-semibold text-on-surface"
                >
                  <option value="Todos">Todas as Funções</option>
                  <option value="Tonificar o Qi">Tonificar o Qi</option>
                  <option value="Drenar Umidade">Drenar Umidade</option>
                  <option value="Nutrir o Yin">Nutrir o Yin</option>
                  <option value="Limpar Calor">Limpar Calor</option>
                </select>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table & Cards Layout */}
      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] space-y-4">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-semibold text-on-surface-variant">Carregando Biblioteca de Alimentos...</span>
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-100 p-6 rounded-2xl flex items-center gap-4 text-rose-950">
          <AlertCircle className="text-rose-500" size={32} />
          <div>
            <h4 className="font-bold">Erro ao Carregar Dados</h4>
            <p className="text-sm font-medium">{error}</p>
          </div>
        </div>
      ) : foods.length === 0 ? (
        <div className="bg-white border border-outline-variant/10 rounded-[2rem] p-12 text-center space-y-4">
          <BookOpen className="mx-auto text-outline" size={48} />
          <h3 className="text-xl font-bold text-on-surface">Nenhum Alimento Encontrado</h3>
          <p className="text-sm text-on-surface-variant font-medium max-w-md mx-auto">
            Não encontramos alimentos com os filtros aplicados. Tente ajustar o termo de pesquisa ou resetar os filtros avançados.
          </p>
          <button 
            onClick={handleResetFilters}
            className="px-6 py-2.5 bg-primary text-white font-bold text-xs rounded-xl shadow-sm hover:bg-primary-container"
          >
            Limpar Filtros
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Sorting and Summary info */}
          <div className="flex justify-between items-center text-xs text-on-surface-variant font-semibold px-2">
            <span>Mostrando {foods.length} alimentos</span>
            <div className="flex items-center gap-2">
              <span className="text-outline">Ordenar por:</span>
              <button 
                onClick={() => {
                  setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                }}
                className="flex items-center gap-1 hover:text-primary transition-all font-bold"
              >
                {sortBy === 'name' ? 'Nome' : sortBy} <ArrowUpDown size={14} />
              </button>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedFoods.map(food => (
              <motion.div 
                key={food.id}
                whileHover={{ y: -6 }}
                className="bg-white rounded-[2rem] p-6 shadow-sm border border-outline-variant/10 flex flex-col justify-between group relative"
              >
                <div>
                  {/* Name and Scientific Name */}
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-bold font-headline text-on-surface group-hover:text-primary transition-all">
                        {food.name}
                      </h3>
                      {food.scientific_name && (
                        <p className="text-[10px] italic text-outline mt-0.5">{food.scientific_name}</p>
                      )}
                    </div>
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded border ${getThermalBadgeClass(food.thermal_nature)}`}>
                      {food.thermal_nature}
                    </span>
                  </div>

                  {/* Category & Direção Energética Chips */}
                  <div className="mt-3 flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-1 bg-surface-container-low text-on-surface-variant text-[10px] font-bold rounded-lg border border-outline-variant/10 uppercase tracking-wide">
                      {food.category}
                    </span>
                    {getDirectionBadge(food.energy_direction)}
                  </div>

                  {/* Flavors and Tropisms */}
                  <div className="mt-4 space-y-2">
                    <div className="flex flex-wrap gap-1">
                      {food.flavors.map(flavor => (
                        <span key={flavor} className="px-2 py-0.5 bg-white text-on-surface-variant text-[10px] font-bold rounded border border-outline-variant/20">
                          {flavor}
                        </span>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {food.channels.slice(0, 3).map(ch => (
                        <span key={ch} className="px-2 py-0.5 bg-primary/5 text-primary text-[10px] font-bold rounded border border-primary/10">
                          {ch}
                        </span>
                      ))}
                      {food.channels.length > 3 && (
                        <span className="text-[9px] text-outline font-bold flex items-center pl-1">
                          +{food.channels.length - 3} mais
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Footer / Actions */}
                <div className="mt-6 pt-4 border-t border-outline-variant/10 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-outline">
                    {food.editorial_status === 'published' ? (
                      <span className="flex items-center gap-1 text-emerald-600">
                        <CheckCircle size={12} /> Revisado
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-amber-600">
                        <Clock size={12} /> Pendente
                      </span>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setSelectedFood(food)}
                      className="p-2 bg-surface-container-low hover:bg-primary/5 text-on-surface-variant hover:text-primary rounded-xl transition-all"
                      title="Ver Ficha Completa"
                    >
                      <Eye size={16} />
                    </button>
                    {canCreate && (
                      <button 
                        onClick={() => {
                          setEditingFood(food);
                          setIsFormOpen(true);
                        }}
                        className="px-3 py-1 bg-surface-container-low text-on-surface text-[10px] font-bold rounded-xl hover:bg-surface-container-high transition-all"
                      >
                        Editar
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-4 pt-6">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                className="p-3 bg-white border border-outline-variant/10 rounded-xl disabled:opacity-40 text-on-surface hover:bg-surface-container-low transition-all"
              >
                <ChevronLeft size={16} />
              </button>
              
              <span className="text-xs font-bold text-on-surface-variant">
                Página {currentPage} de {totalPages}
              </span>
              
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                className="p-3 bg-white border border-outline-variant/10 rounded-xl disabled:opacity-40 text-on-surface hover:bg-surface-container-low transition-all"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Details Modal */}
      {selectedFood && (
        <FoodDetailModal 
          food={selectedFood}
          onClose={() => setSelectedFood(null)}
        />
      )}

      {/* Form Modal */}
      {isFormOpen && (
        <FoodFormModal 
          food={editingFood}
          onClose={() => {
            setIsFormOpen(false);
            setEditingFood(null);
          }}
          onSave={handleSaveFood}
        />
      )}

      {/* Builder Modal */}
      {isBuilderOpen && (
        <DietBuilderModal 
          onClose={() => setIsBuilderOpen(false)}
          onSave={async (presc) => {
            try {
              await dietotherapyService.savePrescription(presc);
              alert('Orientação Dietética salva com sucesso!');
            } catch (e: any) {
              alert(e.message || 'Erro ao salvar orientação.');
            }
          }}
          user={user}
        />
      )}

      {/* Import Modal */}
      {isImportModalOpen && (
        <FoodImportModal 
          onClose={() => setIsImportModalOpen(false)}
          onImportSuccess={fetchFoods}
        />
      )}
    </div>
  );
}
