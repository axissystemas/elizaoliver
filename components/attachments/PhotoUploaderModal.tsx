'use client';

import React, { useState, useRef } from 'react';
import { X, Upload, Camera, Check, RefreshCw, AlertCircle, FileText, Image as ImageIcon } from 'lucide-react';
import { AttachmentCategory, ATTACHMENT_CATEGORY_LABELS, PatientAttachment } from '@/types/attachments';
import { attachmentService } from '@/lib/attachmentService';

interface PhotoUploaderModalProps {
  patientId: string;
  consultationId?: string;
  defaultCategory?: AttachmentCategory;
  onClose: () => void;
  onSuccess: (newAttachment: PatientAttachment) => void;
}

export default function PhotoUploaderModal({
  patientId,
  consultationId,
  defaultCategory = 'auriculotherapy',
  onClose,
  onSuccess
}: PhotoUploaderModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [category, setCategory] = useState<AttachmentCategory>(defaultCategory);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Estados de Câmera
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Manipular arquivo selecionado
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Por favor, selecione um arquivo de imagem válido (PNG, JPG, WEBP).');
      return;
    }

    setErrorMsg(null);
    setSelectedFile(file);

    const reader = new FileReader();
    reader.onload = (e) => setPreviewUrl(e.target?.result as string);
    reader.readAsDataURL(file);

    if (!title) {
      const defaultName = file.name.replace(/\.[^/.]+$/, '');
      setTitle(defaultName);
    }
  };

  // Drag and Drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  // Ligar Câmera
  const startCamera = async () => {
    try {
      setErrorMsg(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false
      });
      setCameraStream(stream);
      setIsCameraActive(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      }, 100);
    } catch (err) {
      console.error('Erro ao acessar câmera:', err);
      setErrorMsg('Não foi possível acessar a câmera do dispositivo. Verifique as permissões.');
    }
  };

  // Parar Câmera
  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setIsCameraActive(false);
  };

  // Tirar Foto pela Câmera
  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `foto_${category}_${Date.now()}.jpg`, { type: 'image/jpeg' });
          processFile(file);
          stopCamera();
        }
      }, 'image/jpeg', 0.9);
    }
  };

  // Salvar/Enviar Anexo
  const handleSave = async () => {
    if (!selectedFile) {
      setErrorMsg('Por favor, selecione uma imagem ou tire uma foto antes de salvar.');
      return;
    }

    setIsUploading(true);
    setErrorMsg(null);

    try {
      const result = await attachmentService.uploadAttachment(selectedFile, {
        patientId,
        consultationId,
        category,
        title: title.trim() || ATTACHMENT_CATEGORY_LABELS[category].label,
        notes: notes.trim()
      });

      onSuccess(result);
      onClose();
    } catch (err: any) {
      console.error('Erro no upload:', err);
      setErrorMsg(err.message || 'Falha ao salvar a imagem. Tente novamente.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { stopCamera(); onClose(); }} />

      {/* Modal Card */}
      <div className="relative bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 border-b border-outline-variant/10 flex justify-between items-center bg-surface-container-low/40">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-primary/10 rounded-2xl flex items-center justify-center text-primary font-bold">
              📷
            </div>
            <div>
              <h3 className="text-lg font-bold font-headline text-on-surface">Anexar Foto / Imagem Clínica</h3>
              <p className="text-xs text-on-surface-variant font-medium">
                Inspeção de língua, auriculoterapia ou evolução da consulta
              </p>
            </div>
          </div>
          <button 
            onClick={() => { stopCamera(); onClose(); }}
            className="p-2 hover:bg-surface-container-low rounded-full transition-all text-on-surface-variant"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar flex-1">
          
          {errorMsg && (
            <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-950 text-xs font-semibold">
              <AlertCircle size={18} className="text-rose-500 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Seleção de Categoria */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-outline uppercase tracking-wider block">Categoria da Foto</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(Object.keys(ATTACHMENT_CATEGORY_LABELS) as AttachmentCategory[]).map((cat) => {
                const info = ATTACHMENT_CATEGORY_LABELS[cat];
                const isSelected = category === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`p-3 rounded-2xl border text-xs font-bold transition-all flex flex-col items-center gap-1.5 text-center ${
                      isSelected
                        ? 'bg-primary text-white border-primary shadow-sm'
                        : 'bg-surface-container-low text-on-surface border-outline-variant/15 hover:bg-surface-container-medium'
                    }`}
                  >
                    <span className="text-lg">{info.icon}</span>
                    <span className="truncate w-full">{info.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Área de Captura ou Preview */}
          {isCameraActive ? (
            <div className="relative bg-black rounded-3xl overflow-hidden flex flex-col items-center justify-center min-h-[300px]">
              <video ref={videoRef} className="w-full h-[320px] object-cover" autoPlay playsInline muted />
              <div className="absolute bottom-4 flex gap-4">
                <button
                  type="button"
                  onClick={capturePhoto}
                  className="px-6 py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-2xl shadow-lg flex items-center gap-2"
                >
                  <Camera size={18} /> Tirar Foto
                </button>
                <button
                  type="button"
                  onClick={stopCamera}
                  className="px-4 py-3 bg-white/20 hover:bg-white/30 text-white font-bold text-xs rounded-2xl backdrop-blur-md"
                >
                  Cancelar Câmera
                </button>
              </div>
            </div>
          ) : previewUrl ? (
            <div className="relative rounded-3xl border border-outline-variant/15 overflow-hidden bg-slate-900 group max-h-[320px] flex items-center justify-center">
              <img src={previewUrl} alt="Preview" className="max-h-[300px] w-auto object-contain rounded-2xl p-2" />
              <button
                type="button"
                onClick={() => { setSelectedFile(null); setPreviewUrl(null); }}
                className="absolute top-3 right-3 p-2 bg-black/60 text-white hover:bg-red-600 rounded-full backdrop-blur-sm transition-all"
                title="Trocar foto"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className="border-2 border-dashed border-outline-variant/30 hover:border-primary/50 bg-surface-container-low/40 rounded-3xl p-8 flex flex-col items-center justify-center gap-3 text-center transition-all cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />
              <div className="h-14 w-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                <ImageIcon size={28} />
              </div>
              <div>
                <p className="text-sm font-bold text-on-surface">Clique para escolher ou arraste a foto aqui</p>
                <p className="text-xs text-on-surface-variant font-medium mt-1">
                  Suporta PNG, JPG ou WEBP (Max 10MB)
                </p>
              </div>

              <div className="flex items-center gap-3 mt-2" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-white border border-outline-variant/20 rounded-xl text-xs font-bold text-on-surface hover:bg-surface-container-low transition-all shadow-xs flex items-center gap-1.5"
                >
                  <Upload size={14} /> Galeria de Arquivos
                </button>
                <button
                  type="button"
                  onClick={startCamera}
                  className="px-4 py-2 bg-primary/10 text-primary rounded-xl text-xs font-bold hover:bg-primary/20 transition-all flex items-center gap-1.5"
                >
                  <Camera size={14} /> Usar Câmera
                </button>
              </div>
            </div>
          )}

          {/* Título e Notas */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-outline uppercase">Título ou Identificação da Foto</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Inspeção Orelha Direita (Sessão 3)"
                className="w-full px-4 py-3 bg-surface-container-low rounded-2xl border border-outline-variant/15 text-xs font-semibold text-on-surface outline-none focus:border-primary transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-outline uppercase">Observações Clínicas (Opcional)</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Presença de estagnação de Qi no ponto Fígado e área de ansiedade avermelhada..."
                className="w-full px-4 py-3 bg-surface-container-low rounded-2xl border border-outline-variant/15 text-xs font-medium text-on-surface outline-none focus:border-primary transition-all resize-none"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-outline-variant/10 bg-surface-container-low/40 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => { stopCamera(); onClose(); }}
            className="px-5 py-3 rounded-2xl border border-outline-variant/20 text-xs font-bold text-on-surface hover:bg-surface-container-low transition-all"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isUploading || !selectedFile}
            className="px-6 py-3 rounded-2xl bg-primary text-white text-xs font-bold hover:bg-primary-container shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {isUploading ? (
              <>
                <RefreshCw className="animate-spin" size={16} />
                <span>Salvando...</span>
              </>
            ) : (
              <>
                <Check size={16} />
                <span>Salvar Foto no Prontuário</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
