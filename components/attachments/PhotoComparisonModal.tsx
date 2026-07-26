'use client';

import React, { useState } from 'react';
import { X, ArrowLeftRight, ZoomIn, Calendar, FileText, Download } from 'lucide-react';
import { PatientAttachment, ATTACHMENT_CATEGORY_LABELS } from '@/types/attachments';

interface PhotoComparisonModalProps {
  photoA: PatientAttachment;
  photoB: PatientAttachment;
  onClose: () => void;
}

export default function PhotoComparisonModal({ photoA, photoB, onClose }: PhotoComparisonModalProps) {
  const [activeZoom, setActiveZoom] = useState<'none' | 'a' | 'b'>('none');

  const dateA = new Date(photoA.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const dateB = new Date(photoB.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />

      {/* Container */}
      <div className="relative bg-white w-full max-w-5xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 border-b border-outline-variant/10 flex justify-between items-center bg-surface-container-low/50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-indigo-100 text-indigo-900 rounded-2xl flex items-center justify-center font-bold">
              <ArrowLeftRight size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold font-headline text-on-surface">Comparativo Evolutivo (Antes & Depois)</h3>
              <p className="text-xs text-on-surface-variant font-medium">
                Comparação de registro fotográfico em datas distintas
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-surface-container-low rounded-full transition-all text-on-surface-variant"
          >
            <X size={22} />
          </button>
        </div>

        {/* Comparison Grid */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto custom-scrollbar flex-1">
          
          {/* Foto A (Anterior / Inicial) */}
          <div className="flex flex-col bg-surface-container-low/30 border border-outline-variant/15 rounded-3xl p-5 space-y-4">
            <div className="flex justify-between items-center flex-wrap gap-2">
              <span className="px-3 py-1 bg-amber-100 text-amber-900 border border-amber-200 text-xs font-extrabold rounded-xl">
                1ª REGISTRO ({dateA})
              </span>
              <span className="text-xs font-bold text-outline flex items-center gap-1">
                <Calendar size={13} /> {dateA}
              </span>
            </div>

            <div className="relative bg-slate-950 rounded-2xl overflow-hidden h-[340px] flex items-center justify-center group">
              <img 
                src={photoA.url} 
                alt={photoA.title || 'Foto A'} 
                className="max-h-[330px] w-auto object-contain p-2 transition-all group-hover:scale-105" 
              />
              <button
                type="button"
                onClick={() => window.open(photoA.url, '_blank')}
                className="absolute top-3 right-3 p-2 bg-black/60 text-white rounded-xl backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all hover:bg-black"
                title="Ampliar Imagem"
              >
                <ZoomIn size={16} />
              </button>
            </div>

            <div className="space-y-1.5 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-on-surface">{photoA.title || 'Foto sem título'}</span>
                <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-purple-50 text-purple-700 border border-purple-200">
                  {ATTACHMENT_CATEGORY_LABELS[photoA.category]?.label}
                </span>
              </div>
              {photoA.notes ? (
                <p className="text-xs text-on-surface-variant font-medium bg-white p-3 rounded-xl border border-outline-variant/10 leading-relaxed">
                  {photoA.notes}
                </p>
              ) : (
                <p className="text-xs text-outline italic">Sem observações anotadas nesta data.</p>
              )}
            </div>
          </div>

          {/* Foto B (Atual / Evolução) */}
          <div className="flex flex-col bg-surface-container-low/30 border border-outline-variant/15 rounded-3xl p-5 space-y-4">
            <div className="flex justify-between items-center flex-wrap gap-2">
              <span className="px-3 py-1 bg-emerald-100 text-emerald-900 border border-emerald-200 text-xs font-extrabold rounded-xl">
                2º REGISTRO ({dateB})
              </span>
              <span className="text-xs font-bold text-outline flex items-center gap-1">
                <Calendar size={13} /> {dateB}
              </span>
            </div>

            <div className="relative bg-slate-950 rounded-2xl overflow-hidden h-[340px] flex items-center justify-center group">
              <img 
                src={photoB.url} 
                alt={photoB.title || 'Foto B'} 
                className="max-h-[330px] w-auto object-contain p-2 transition-all group-hover:scale-105" 
              />
              <button
                type="button"
                onClick={() => window.open(photoB.url, '_blank')}
                className="absolute top-3 right-3 p-2 bg-black/60 text-white rounded-xl backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all hover:bg-black"
                title="Ampliar Imagem"
              >
                <ZoomIn size={16} />
              </button>
            </div>

            <div className="space-y-1.5 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-on-surface">{photoB.title || 'Foto sem título'}</span>
                <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-purple-50 text-purple-700 border border-purple-200">
                  {ATTACHMENT_CATEGORY_LABELS[photoB.category]?.label}
                </span>
              </div>
              {photoB.notes ? (
                <p className="text-xs text-on-surface-variant font-medium bg-white p-3 rounded-xl border border-outline-variant/10 leading-relaxed">
                  {photoB.notes}
                </p>
              ) : (
                <p className="text-xs text-outline italic">Sem observações anotadas nesta data.</p>
              )}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-5 border-t border-outline-variant/10 bg-surface-container-low/50 flex justify-between items-center">
          <p className="text-xs font-semibold text-outline">
            Dica: Você pode abrir cada imagem individualmente para zoom ampliado.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-container transition-all"
          >
            Fechar Comparador
          </button>
        </div>
      </div>
    </div>
  );
}
