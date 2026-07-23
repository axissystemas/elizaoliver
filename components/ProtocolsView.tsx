'use client';

import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  Filter, 
  BookOpen, 
  Sparkles, 
  ChevronRight,
  Clock,
  Tag,
  MoreVertical,
  Star,
  X,
  Trash2,
  Edit2,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Protocol {
  id: string;
  title?: string;
  name?: string;
  description: string;
  points: string[];
  category: string;
  duration: string;
  usage: number;
  rating: number;
  color: string;
}

const INITIAL_PROTOCOLS: Protocol[] = [
  {
    id: '1',
    title: 'Equilíbrio de Qi do Baço',
    description: 'Protocolo focado em tonificar o Baço e resolver a Umidade.',
    points: ['ST36', 'SP6', 'SP9', 'CV12'],
    category: 'Tonificação',
    duration: '20 min',
    usage: 124,
    rating: 4.8,
    color: 'bg-emerald-500'
  },
  {
    id: '2',
    title: 'Harmonização do Fígado',
    description: 'Indicado para estagnação de Qi do Fígado e irritabilidade.',
    points: ['LR3', 'LI4', 'GB34', 'PC6'],
    category: 'Sedação',
    duration: '25 min',
    usage: 89,
    rating: 4.9,
    color: 'bg-indigo-500'
  }
];

const CATEGORIES = ['Todos', 'Tonificação', 'Sedação', 'Yin/Yang', 'Dor', 'Auriculoterapia', 'Moxabustão'];
const COLORS = ['bg-emerald-500', 'bg-indigo-500', 'bg-blue-500', 'bg-rose-500', 'bg-amber-500', 'bg-purple-500'];

import { User } from '@/types/auth';
import DietotherapyView from './dietotherapy/DietotherapyView';

export default function ProtocolsView({ 
  user,
  protocols,
  onSaveProtocol,
  onDeleteProtocol
}: { 
  user?: User | null,
  protocols: Protocol[],
  onSaveProtocol: (data: any) => Promise<void>,
  onDeleteProtocol: (id: string) => Promise<void>
}) {
  const [activeTab, setActiveTab] = useState<'acupuntura' | 'dietoterapia'>('dietoterapia');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProtocol, setEditingProtocol] = useState<Protocol | null>(null);
  
  const canCreate = user?.permissions.includes('protocols:create') || user?.role === 'ADMIN';
  const canEdit = user?.permissions.includes('protocols:edit') || user?.role === 'ADMIN';
  const canDelete = user?.permissions.includes('protocols:delete') || user?.role === 'ADMIN';

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    points: '',
    category: 'Tonificação',
    duration: '20 min',
    color: 'bg-emerald-500'
  });

  const handleOpenModal = (protocol?: Protocol) => {
    if (protocol) {
      setEditingProtocol(protocol);
      setFormData({
        title: protocol.title || protocol.name || '',
        description: protocol.description || '',
        points: (protocol.points || []).join(', '),
        category: protocol.category,
        duration: protocol.duration,
        color: protocol.color
      });
    } else {
      setEditingProtocol(null);
      setFormData({
        title: '',
        description: '',
        points: '',
        category: 'Tonificação',
        duration: '20 min',
        color: COLORS[Math.floor(Math.random() * COLORS.length)]
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const pointsArray = formData.points.split(',').map(p => p.trim()).filter(p => p !== '');
    
    const protocolData = {
      ...formData,
      points: pointsArray,
      id: editingProtocol?.id
    };

    await onSaveProtocol(protocolData);
    setIsModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    await onDeleteProtocol(id);
  };

  const filteredProtocols = protocols.filter(p => {
    const title = (p.title || p.name || '').toLowerCase();
    const description = (p.description || '').toLowerCase();
    const search = searchTerm.toLowerCase();
    
    const matchesSearch = title.includes(search) || 
                         description.includes(search) ||
                         (p.points || []).some((pt: string) => pt.toLowerCase().includes(search));
    const matchesCategory = selectedCategory === 'Todos' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="p-10 space-y-10 relative">
      {/* Tab Switcher */}
      <div className="flex border-b border-outline-variant/15 gap-8 mb-6">
        <button 
          onClick={() => setActiveTab('dietoterapia')}
          className={`pb-4 text-base font-bold transition-all relative ${activeTab === 'dietoterapia' ? 'text-primary' : 'text-outline hover:text-primary'}`}
        >
          Dietoterapia Chinesa
          {activeTab === 'dietoterapia' && (
            <motion.div layoutId="activeTabUnderline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
          )}
        </button>
        <button 
          onClick={() => setActiveTab('acupuntura')}
          className={`pb-4 text-base font-bold transition-all relative ${activeTab === 'acupuntura' ? 'text-primary' : 'text-outline hover:text-primary'}`}
        >
          Acupuntura e Moxabustão
          {activeTab === 'acupuntura' && (
            <motion.div layoutId="activeTabUnderline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
          )}
        </button>
      </div>

      {activeTab === 'acupuntura' ? (
        <>
          {/* Header */}
          <section className="flex flex-col md:flex-row gap-8 items-start justify-between">
            <div>
              <h2 className="text-4xl font-bold font-headline text-on-surface">Biblioteca de Protocolos</h2>
              <p className="text-on-surface-variant text-lg mt-2 font-medium">Gerencie e descubra protocolos de tratamento baseados em MTC.</p>
            </div>
            {canCreate && (
              <button 
                onClick={() => handleOpenModal()}
                className="px-8 py-4 rounded-2xl text-sm font-bold bg-primary text-white shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-3"
              >
                <Plus size={20} /> Criar Novo Protocolo
              </button>
            )}
          </section>

      {/* Search and Filter */}
      <section className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-outline" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por nome, ponto ou categoria..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-16 pr-6 py-5 bg-white rounded-2xl border border-outline-variant/10 shadow-sm focus:ring-2 focus:ring-primary/10 text-on-surface font-medium"
          />
        </div>
        <button className="px-6 py-5 bg-white rounded-2xl border border-outline-variant/10 shadow-sm text-outline hover:text-primary transition-all flex items-center gap-3 font-bold text-sm">
          <Filter size={20} /> Filtros
        </button>
      </section>

      {/* Categories */}
      <section className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
        {CATEGORIES.map((cat) => (
          <button 
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-6 py-3 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${selectedCategory === cat ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-white text-outline border border-outline-variant/10 hover:border-primary/30'}`}
          >
            {cat}
          </button>
        ))}
      </section>

      {/* Protocols Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <AnimatePresence mode="popLayout">
          {filteredProtocols.map((protocol) => (
            <motion.div 
              key={protocol.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              whileHover={{ y: -8 }}
              className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-outline-variant/10 group relative"
            >
              <div className="flex justify-between items-start mb-6">
                <div className={`w-14 h-14 rounded-2xl ${protocol.color} flex items-center justify-center text-white shadow-lg`}>
                  <BookOpen size={28} />
                </div>
                <div className="flex gap-2">
                  {canEdit && (
                    <button 
                      onClick={() => handleOpenModal(protocol)}
                      className="p-2.5 rounded-xl hover:bg-surface-container-low text-outline hover:text-primary transition-all"
                    >
                      <Edit2 size={20} />
                    </button>
                  )}
                  {canDelete && (
                    <button 
                      onClick={() => handleDelete(protocol.id)}
                      className="p-2.5 rounded-xl hover:bg-rose-50 text-outline hover:text-rose-500 transition-all"
                    >
                      <Trash2 size={20} />
                    </button>
                  )}
                </div>
              </div>

              <h3 className="text-2xl font-bold font-headline text-on-surface group-hover:text-primary transition-colors">
                {protocol.title || protocol.name || 'Protocolo Sem Título'}
              </h3>
              <p className="text-on-surface-variant text-sm mt-2 line-clamp-2 font-medium leading-relaxed">
                {protocol.description || 'Sem descrição disponível.'}
              </p>

              <div className="mt-8 flex flex-wrap gap-2">
                {(protocol.points || []).map((point: string, idx: number) => (
                  <span key={idx} className="px-3 py-1 bg-surface-container-low text-on-surface-variant text-[10px] font-bold rounded-lg border border-outline-variant/10">
                    {point}
                  </span>
                ))}
              </div>

              <div className="mt-10 pt-8 border-t border-outline-variant/10 flex items-center justify-between">
                <div className="flex gap-6">
                  <span className="flex items-center gap-2 text-[10px] font-bold text-outline uppercase tracking-widest">
                    <Clock size={14} /> {protocol.duration}
                  </span>
                  <span className="flex items-center gap-2 text-[10px] font-bold text-outline uppercase tracking-widest">
                    <Tag size={14} /> {protocol.category}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-on-surface">{protocol.rating}</span>
                  <div className="flex text-yellow-400">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={12} fill={i < Math.floor(protocol.rating) ? "currentColor" : "none"} />
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* AI Suggestion Card */}
        <motion.div 
          whileHover={{ y: -8 }}
          className="bg-primary rounded-[2.5rem] p-8 shadow-xl shadow-primary/20 text-white relative overflow-hidden h-full min-h-[320px]"
        >
          <div className="absolute top-0 right-0 p-10 opacity-10">
            <Sparkles size={120} />
          </div>
          <div className="relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-6">
              <Sparkles size={28} />
            </div>
            <h3 className="text-2xl font-bold font-headline">Gerador de Protocolos IA</h3>
            <p className="text-white/80 text-sm mt-2 font-medium leading-relaxed">
              Descreva os sintomas do paciente e nossa IA sugerirá uma combinação otimizada de pontos baseada em textos clássicos.
            </p>
            <button className="mt-10 px-8 py-4 bg-white text-primary rounded-2xl text-sm font-bold shadow-lg hover:bg-primary-fixed-dim transition-all flex items-center gap-3">
              Experimentar Agora <ChevronRight size={18} />
            </button>
          </div>
        </motion.div>
      </div>
      </>
      ) : (
        <DietotherapyView user={user} />
      )}

      {/* CRUD Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-outline-variant/10 flex justify-between items-center">
                <h3 className="text-2xl font-bold font-headline text-on-surface">
                  {editingProtocol ? 'Editar Protocolo' : 'Novo Protocolo'}
                </h3>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-surface-container-low rounded-full transition-all"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSave} className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-outline uppercase tracking-widest">Título</label>
                    <input 
                      required
                      type="text" 
                      value={formData.title}
                      onChange={e => setFormData({...formData, title: e.target.value})}
                      className="w-full px-5 py-4 bg-surface-container-low rounded-xl border border-outline-variant/10 focus:ring-2 focus:ring-primary/20 outline-none font-medium"
                      placeholder="Ex: Equilíbrio de Qi"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-outline uppercase tracking-widest">Categoria</label>
                    <select 
                      value={formData.category}
                      onChange={e => setFormData({...formData, category: e.target.value})}
                      className="w-full px-5 py-4 bg-surface-container-low rounded-xl border border-outline-variant/10 focus:ring-2 focus:ring-primary/20 outline-none font-medium appearance-none"
                    >
                      {CATEGORIES.filter(c => c !== 'Todos').map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-outline uppercase tracking-widest">Descrição</label>
                  <textarea 
                    required
                    rows={3}
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    className="w-full px-5 py-4 bg-surface-container-low rounded-xl border border-outline-variant/10 focus:ring-2 focus:ring-primary/20 outline-none font-medium resize-none"
                    placeholder="Descreva o objetivo e indicações do protocolo..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-outline uppercase tracking-widest">Pontos (separados por vírgula)</label>
                    <input 
                      required
                      type="text" 
                      value={formData.points}
                      onChange={e => setFormData({...formData, points: e.target.value})}
                      className="w-full px-5 py-4 bg-surface-container-low rounded-xl border border-outline-variant/10 focus:ring-2 focus:ring-primary/20 outline-none font-medium"
                      placeholder="Ex: ST36, SP6, PC6"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-outline uppercase tracking-widest">Duração Estimada</label>
                    <input 
                      type="text" 
                      value={formData.duration}
                      onChange={e => setFormData({...formData, duration: e.target.value})}
                      className="w-full px-5 py-4 bg-surface-container-low rounded-xl border border-outline-variant/10 focus:ring-2 focus:ring-primary/20 outline-none font-medium"
                      placeholder="Ex: 20 min"
                    />
                  </div>
                </div>

                <div className="pt-6 flex gap-4">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-4 rounded-2xl border border-outline-variant/20 font-bold text-outline hover:bg-surface-container-low transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-4 rounded-2xl bg-primary text-white font-bold shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <Check size={20} /> Salvar Protocolo
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
