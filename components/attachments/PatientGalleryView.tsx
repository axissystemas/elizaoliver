'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Camera, Plus, Filter, Search, Calendar, Trash2, ZoomIn, 
  ArrowLeftRight, FileText, Sparkles, AlertCircle, RefreshCw, Check, X 
} from 'lucide-react';
import { PatientAttachment, AttachmentCategory, ATTACHMENT_CATEGORY_LABELS } from '@/types/attachments';
import { attachmentService } from '@/lib/attachmentService';
import PhotoUploaderModal from './PhotoUploaderModal';
import PhotoComparisonModal from './PhotoComparisonModal';

interface PatientGalleryViewProps {
  patientId: string;
  patientName?: string;
  consultationId?: string;
  canCreate?: boolean;
  canDelete?: boolean;
}

export default function PatientGalleryView({
  patientId,
  patientName,
  consultationId,
  canCreate = true,
  canDelete = true
}: PatientGalleryViewProps) {
  const [attachments, setAttachments] = useState<PatientAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Modais
  const [isUploaderOpen, setIsUploaderOpen] = useState(false);
  const [selectedForZoom, setSelectedForZoom] = useState<PatientAttachment | null>(null);

  // Modo Comparativo
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
  const [compareModalPair, setCompareModalPair] = useState<[PatientAttachment, PatientAttachment] | null>(null);

  const fetchAttachments = useCallback(async () => {
    setLoading(true);
    try {
      const data = await attachmentService.getPatientAttachments(patientId, consultationId);
      setAttachments(data);
    } catch (e) {
      console.error('Erro ao buscar anexos:', e);
    } finally {
      setLoading(false);
    }
  }, [patientId, consultationId]);

  useEffect(() => {
    fetchAttachments();
  }, [fetchAttachments]);

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir esta imagem do prontuário?')) return;
    try {
      await attachmentService.deleteAttachment(id, patientId);
      setAttachments(prev => prev.filter(a => a.id !== id));
      if (selectedForCompare.includes(id)) {
        setSelectedForCompare(prev => prev.filter(i => i !== id));
      }
    } catch (e) {
      alert('Erro ao excluir foto.');
    }
  };

  const toggleSelectForCompare = (id: string) => {
    if (selectedForCompare.includes(id)) {
      setSelectedForCompare(prev => prev.filter(i => i !== id));
    } else {
      if (selectedForCompare.length >= 2) {
        setSelectedForCompare([selectedForCompare[1], id]);
      } else {
        setSelectedForCompare(prev => [...prev, id]);
      }
    }
  };

  const openComparisonModal = () => {
    if (selectedForCompare.length !== 2) return;
    const a = attachments.find(x => x.id === selectedForCompare[0]);
    const b = attachments.find(x => x.id === selectedForCompare[1]);
    if (a && b) {
      // Ordena por data (mais antiga primeiro)
      const sorted = [a, b].sort((x, y) => new Date(x.createdAt).getTime() - new Date(y.createdAt).getTime());
      setCompareModalPair([sorted[0], sorted[1]]);
    }
  };

  // Filtragem
  const filtered = attachments.filter(item => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const term = searchTerm.toLowerCase().trim();
    const matchesSearch = !term || (
      (item.title && item.title.toLowerCase().includes(term)) ||
      (item.notes && item.notes.toLowerCase().includes(term)) ||
      ATTACHMENT_CATEGORY_LABELS[item.category]?.label.toLowerCase().includes(term)
    );
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6">
      
      {/* Top Header Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-[2rem] border border-outline-variant/10 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-bold font-headline text-on-surface">Galeria & Mídias Clínicas</h3>
            <span className="px-2.5 py-0.5 bg-primary/10 text-primary text-xs font-bold rounded-full">
              {attachments.length} {attachments.length === 1 ? 'imagem' : 'imagens'}
            </span>
          </div>
          <p className="text-xs text-on-surface-variant font-medium mt-1">
            Fotos de auriculoterapia, avaliação de língua e registros evolutivos
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap w-full md:w-auto justify-end">
          {attachments.length >= 2 && (
            <button
              type="button"
              onClick={() => {
                if (isCompareMode && selectedForCompare.length === 2) {
                  openComparisonModal();
                } else {
                  setIsCompareMode(!isCompareMode);
                  setSelectedForCompare([]);
                }
              }}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border ${
                isCompareMode && selectedForCompare.length === 2
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-md animate-bounce'
                  : isCompareMode
                  ? 'bg-indigo-50 text-indigo-900 border-indigo-200'
                  : 'bg-white text-on-surface border-outline-variant/20 hover:bg-surface-container-low'
              }`}
            >
              <ArrowLeftRight size={16} />
              {isCompareMode && selectedForCompare.length === 2
                ? 'Ver Comparativo Lado a Lado (2 selecionadas)'
                : isCompareMode
                ? 'Selecione 2 fotos para comparar'
                : 'Comparar Fotos (Antes / Depois)'}
            </button>
          )}

          {canCreate && (
            <button
              type="button"
              onClick={() => setIsUploaderOpen(true)}
              className="px-5 py-2.5 bg-primary text-white rounded-xl text-xs font-bold shadow-md hover:bg-primary-container transition-all flex items-center gap-2"
            >
              <Plus size={16} /> Nova Foto / Imagem
            </button>
          )}
        </div>
      </div>

      {/* Category Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        {/* Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto custom-scrollbar pb-1">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 border ${
              selectedCategory === 'all'
                ? 'bg-on-surface text-white border-on-surface'
                : 'bg-white text-outline border-outline-variant/15 hover:bg-surface-container-low'
            }`}
          >
            Todas ({attachments.length})
          </button>
          {(Object.keys(ATTACHMENT_CATEGORY_LABELS) as AttachmentCategory[]).map(cat => {
            const count = attachments.filter(a => a.category === cat).length;
            const info = ATTACHMENT_CATEGORY_LABELS[cat];
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 border flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-primary text-white border-primary shadow-xs'
                    : 'bg-white text-on-surface-variant border-outline-variant/15 hover:bg-surface-container-low'
                }`}
              >
                <span>{info.icon}</span>
                <span>{info.label}</span>
                <span className="opacity-70">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar por título ou nota..."
            className="w-full pl-9 pr-4 py-2 bg-white rounded-xl border border-outline-variant/15 text-xs font-medium outline-none focus:border-primary transition-all"
          />
        </div>
      </div>

      {/* Media Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[220px] space-y-3 bg-white rounded-3xl border border-outline-variant/10">
          <RefreshCw className="animate-spin text-primary" size={28} />
          <span className="text-xs font-semibold text-outline">Carregando galeria de imagens...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-outline-variant/10 rounded-[2rem] p-10 text-center space-y-3">
          <div className="h-12 w-12 bg-surface-container-low rounded-2xl flex items-center justify-center mx-auto text-outline">
            <Camera size={24} />
          </div>
          <h4 className="text-base font-bold text-on-surface">Nenhuma Imagem Encontrada</h4>
          <p className="text-xs text-on-surface-variant font-medium max-w-sm mx-auto">
            {searchTerm || selectedCategory !== 'all'
              ? 'Nenhuma imagem corresponde aos filtros aplicados.'
              : 'Nenhuma foto anexada ao prontuário deste paciente ainda.'}
          </p>
          {canCreate && (
            <button
              onClick={() => setIsUploaderOpen(true)}
              className="px-5 py-2.5 bg-primary/10 text-primary font-bold text-xs rounded-xl hover:bg-primary/20 transition-all inline-flex items-center gap-2 mt-2"
            >
              <Plus size={16} /> Adicionar Primeira Foto
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filtered.map(item => {
            const catInfo = ATTACHMENT_CATEGORY_LABELS[item.category];
            const isSelectedForComp = selectedForCompare.includes(item.id);
            const dateFormatted = new Date(item.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

            return (
              <div
                key={item.id}
                className={`bg-white rounded-[2rem] border overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between group relative ${
                  isSelectedForComp
                    ? 'ring-4 ring-indigo-500 border-indigo-500'
                    : 'border-outline-variant/15'
                }`}
              >
                {/* Visual Image Container */}
                <div 
                  className="relative bg-slate-950 h-48 overflow-hidden cursor-pointer flex items-center justify-center"
                  onClick={() => {
                    if (isCompareMode) {
                      toggleSelectForCompare(item.id);
                    } else {
                      setSelectedForZoom(item);
                    }
                  }}
                >
                  <img
                    src={item.url}
                    alt={item.title || 'Foto Clínica'}
                    className="max-h-48 w-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />

                  {/* Badge de Categoria */}
                  <span className={`absolute top-3 left-3 px-2.5 py-1 rounded-lg text-[10px] font-bold border shadow-xs backdrop-blur-md ${catInfo.color}`}>
                    {catInfo.icon} {catInfo.label}
                  </span>

                  {/* Botão de seleção de Comparação se no Modo Comparar */}
                  {isCompareMode && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-white transition-all ${
                        isSelectedForComp ? 'bg-indigo-600 scale-110 shadow-lg' : 'bg-white/30 hover:bg-white/50'
                      }`}>
                        {isSelectedForComp ? <Check size={20} /> : <Plus size={20} />}
                      </div>
                    </div>
                  )}

                  {/* Quick Zoom Button */}
                  {!isCompareMode && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setSelectedForZoom(item); }}
                      className="absolute bottom-3 right-3 p-2 bg-black/60 text-white rounded-xl opacity-0 group-hover:opacity-100 transition-all hover:bg-black backdrop-blur-xs"
                      title="Ampliar foto"
                    >
                      <ZoomIn size={16} />
                    </button>
                  )}
                </div>

                {/* Card Meta & Info */}
                <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-on-surface line-clamp-1">{item.title || 'Sem título'}</h4>
                    {item.notes && (
                      <p className="text-[11px] text-on-surface-variant font-medium line-clamp-2 mt-1 leading-relaxed">
                        {item.notes}
                      </p>
                    )}
                  </div>

                  <div className="pt-2 border-t border-outline-variant/10 flex justify-between items-center text-[10px] text-outline font-bold">
                    <span className="flex items-center gap-1">
                      <Calendar size={12} /> {dateFormatted}
                    </span>

                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        className="p-1 hover:text-rose-600 transition-colors"
                        title="Excluir foto"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Upload */}
      {isUploaderOpen && (
        <PhotoUploaderModal
          patientId={patientId}
          consultationId={consultationId}
          onClose={() => setIsUploaderOpen(false)}
          onSuccess={() => {
            fetchAttachments();
          }}
        />
      )}

      {/* Modal de Zoom Lightbox */}
      {selectedForZoom && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/85 backdrop-blur-md" onClick={() => setSelectedForZoom(null)} />
          <div className="relative max-w-4xl w-full bg-slate-900 rounded-[2.5rem] overflow-hidden p-6 flex flex-col items-center max-h-[92vh]">
            <button
              onClick={() => setSelectedForZoom(null)}
              className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all"
            >
              <X size={20} />
            </button>
            <img src={selectedForZoom.url} alt={selectedForZoom.title} className="max-h-[70vh] w-auto object-contain rounded-2xl p-2" />
            <div className="mt-4 text-center text-white space-y-1">
              <h3 className="text-base font-bold">{selectedForZoom.title}</h3>
              {selectedForZoom.notes && <p className="text-xs text-slate-300 max-w-lg font-medium">{selectedForZoom.notes}</p>}
              <span className="text-[10px] text-slate-400 block pt-1">
                Capturada em {new Date(selectedForZoom.createdAt).toLocaleDateString('pt-BR')}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Modal Comparativo */}
      {compareModalPair && (
        <PhotoComparisonModal
          photoA={compareModalPair[0]}
          photoB={compareModalPair[1]}
          onClose={() => {
            setCompareModalPair(null);
            setIsCompareMode(false);
            setSelectedForCompare([]);
          }}
        />
      )}
    </div>
  );
}
