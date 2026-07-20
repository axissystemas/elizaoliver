'use client';

import React, { useState } from 'react';
import { 
  X, 
  Plus, 
  Trash2, 
  Edit2, 
  Check, 
  ClipboardList, 
  Activity, 
  FileText, 
  ToggleLeft, 
  ToggleRight, 
  Copy,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { EvaluationTemplate, TemplateStep, TemplateField, FieldType, DEFAULT_SYSTEM_TEMPLATES } from '@/types/evaluationTemplate';
import { saveEvaluationTemplates, deleteEvaluationTemplate } from '@/lib/evaluationTemplateService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  templates: EvaluationTemplate[];
  onTemplatesChange: (updated: EvaluationTemplate[]) => void;
}

export default function EvaluationTemplatesModal({ isOpen, onClose, templates, onTemplatesChange }: Props) {
  const [currentTemplates, setCurrentTemplates] = useState<EvaluationTemplate[]>(() => 
    templates && templates.length > 0 ? templates : DEFAULT_SYSTEM_TEMPLATES
  );

  React.useEffect(() => {
    if (templates && templates.length > 0) {
      setCurrentTemplates(templates);
    }
  }, [templates]);

  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EvaluationTemplate | null>(null);

  // Form builder state
  const [templateName, setTemplateName] = useState('');
  const [templateCode, setTemplateCode] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [templateColor, setTemplateColor] = useState<'emerald' | 'indigo' | 'amber' | 'blue' | 'purple'>('emerald');
  const [templateIcon, setTemplateIcon] = useState('ClipboardList');
  const [templateSteps, setTemplateSteps] = useState<TemplateStep[]>([]);
  const [expandedStepIndex, setExpandedStepIndex] = useState<number | null>(0);

  if (!isOpen) return null;

  const handleToggleActive = async (templateId: string) => {
    const updated = currentTemplates.map(t => {
      if (t.id === templateId) {
        return { ...t, isActive: !t.isActive };
      }
      return t;
    });
    setCurrentTemplates(updated);
    onTemplatesChange(updated);
    await saveEvaluationTemplates(updated);
  };

  const handleOpenBuilder = (template?: EvaluationTemplate) => {
    if (template) {
      setEditingTemplate(template);
      setTemplateName(template.name);
      setTemplateCode(template.code);
      setTemplateDescription(template.description);
      setTemplateColor(template.colorTheme);
      setTemplateIcon(template.icon);
      setTemplateSteps(JSON.parse(JSON.stringify(template.steps || [])));
    } else {
      setEditingTemplate(null);
      setTemplateName('');
      setTemplateCode('');
      setTemplateDescription('');
      setTemplateColor('emerald');
      setTemplateIcon('ClipboardList');
      setTemplateSteps([
        {
          id: 'step-1',
          label: 'Dados Iniciais',
          fields: [
            { id: 'f-1', label: 'Queixa Principal', type: 'textarea', required: true }
          ]
        }
      ]);
    }
    setExpandedStepIndex(0);
    setIsBuilderOpen(true);
  };

  const handleSaveBuilder = async () => {
    if (!templateName.trim()) return;

    const newTemplateId = editingTemplate ? editingTemplate.id : `tpl-${Date.now()}`;
    const newTemplate: EvaluationTemplate = {
      id: newTemplateId,
      name: templateName.trim(),
      code: templateCode.trim().toUpperCase() || `F-${Date.now().toString().slice(-4)}`,
      description: templateDescription.trim(),
      colorTheme: templateColor,
      icon: templateIcon,
      isActive: true,
      isSystem: false,
      steps: templateSteps
    };

    let updated: EvaluationTemplate[];
    if (editingTemplate) {
      updated = currentTemplates.map(t => t.id === editingTemplate.id ? newTemplate : t);
    } else {
      updated = [...currentTemplates, newTemplate];
    }

    setCurrentTemplates(updated);
    onTemplatesChange(updated);
    await saveEvaluationTemplates(updated);
    setIsBuilderOpen(false);
  };

  const handleDeleteCustom = async (id: string) => {
    const updated = currentTemplates.filter(t => t.id !== id);
    setCurrentTemplates(updated);
    onTemplatesChange(updated);
    await deleteEvaluationTemplate(id);
    await saveEvaluationTemplates(updated);
  };

  // Helper step operations
  const addStep = () => {
    const newStep: TemplateStep = {
      id: `step-${Date.now()}`,
      label: `Etapa ${templateSteps.length + 1}`,
      fields: []
    };
    setTemplateSteps([...templateSteps, newStep]);
    setExpandedStepIndex(templateSteps.length);
  };

  const removeStep = (index: number) => {
    setTemplateSteps(templateSteps.filter((_, i) => i !== index));
  };

  const addFieldToStep = (stepIndex: number) => {
    const newField: TemplateField = {
      id: `f-${Date.now()}`,
      label: 'Novo Campo',
      type: 'text',
      required: false
    };
    const updatedSteps = [...templateSteps];
    updatedSteps[stepIndex].fields.push(newField);
    setTemplateSteps(updatedSteps);
  };

  const removeFieldFromStep = (stepIndex: number, fieldIndex: number) => {
    const updatedSteps = [...templateSteps];
    updatedSteps[stepIndex].fields.splice(fieldIndex, 1);
    setTemplateSteps(updatedSteps);
  };

  const systemTemplates = currentTemplates.filter(t => t.isSystem || t.code === 'MTC' || t.code === 'RADIESTESIA');
  const customTemplates = currentTemplates.filter(t => !t.isSystem && t.code !== 'MTC' && t.code !== 'RADIESTESIA');

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-8 border-b border-outline-variant/10 flex justify-between items-center bg-surface-container-low/30">
          <div>
            <h3 className="text-2xl font-bold font-headline text-on-surface flex items-center gap-3">
              <ClipboardList className="text-teal-600" size={28} />
              Fichas de Avaliação Modulares
            </h3>
            <p className="text-sm text-on-surface-variant font-medium mt-1">
              Ative, desative ou construa fichas de avaliação personalizadas para a sua clínica.
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface-container-low rounded-full transition-all">
            <X size={24} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">

          {/* Modelos do Sistema */}
          <section className="space-y-4">
            <h4 className="text-sm font-bold text-outline uppercase tracking-wider">Modelos do Sistema</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {systemTemplates.map(template => (
                <div 
                  key={template.id} 
                  className={`p-6 rounded-2xl border transition-all flex items-start justify-between gap-4 ${
                    template.isActive 
                      ? 'border-emerald-200 bg-emerald-50/40' 
                      : 'border-outline-variant/20 bg-gray-50/50 opacity-70'
                  }`}
                >
                  <div className="flex gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold ${
                      template.colorTheme === 'emerald' ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'
                    }`}>
                      {template.code === 'MTC' ? <ClipboardList size={24} /> : <Activity size={24} />}
                    </div>
                    <div>
                      <h5 className="font-bold text-on-surface">{template.name}</h5>
                      <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">{template.description}</p>
                      <span className={`inline-block mt-3 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        template.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-700'
                      }`}>
                        {template.isActive ? 'Ativado por padrão' : 'Desativado'}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleToggleActive(template.id)}
                    className="text-2xl transition-transform active:scale-95"
                    title={template.isActive ? 'Desativar modelo' : 'Ativar modelo'}
                  >
                    {template.isActive ? (
                      <ToggleRight className="text-emerald-600 w-10 h-10" />
                    ) : (
                      <ToggleLeft className="text-gray-400 w-10 h-10" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          </section>

          <hr className="border-outline-variant/10" />

          {/* Fichas Personalizadas (CRUD) */}
          <section className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="text-sm font-bold text-outline uppercase tracking-wider">Fichas Personalizadas</h4>
                <p className="text-xs text-on-surface-variant">Crie novos modelos com suas próprias etapas e perguntas.</p>
              </div>
              <button
                onClick={() => handleOpenBuilder()}
                className="px-5 py-2.5 rounded-xl bg-teal-600 text-white font-bold text-xs hover:bg-teal-700 shadow-md shadow-teal-600/20 transition-all flex items-center gap-2"
              >
                <Plus size={16} /> Nova Ficha Personalizada
              </button>
            </div>

            {customTemplates.length === 0 ? (
              <div className="p-8 border border-dashed border-outline-variant/30 rounded-2xl text-center space-y-2">
                <FileText className="mx-auto text-outline" size={32} />
                <p className="text-sm font-medium text-on-surface">Nenhuma ficha personalizada criada ainda.</p>
                <p className="text-xs text-on-surface-variant">Clique em "Nova Ficha Personalizada" para construir seu primeiro modelo.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {customTemplates.map(template => (
                  <div key={template.id} className="p-6 rounded-2xl border border-outline-variant/20 bg-white shadow-sm flex flex-col justify-between space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex gap-3">
                        <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
                          <FileText size={20} />
                        </div>
                        <div>
                          <h5 className="font-bold text-on-surface">{template.name}</h5>
                          <p className="text-xs text-on-surface-variant mt-0.5">{template.description || 'Ficha personalizada'}</p>
                          <p className="text-[10px] text-outline font-medium mt-1">{template.steps?.length || 0} etapas cadastradas</p>
                        </div>
                      </div>

                      <button onClick={() => handleToggleActive(template.id)} title={template.isActive ? 'Desativar' : 'Ativar'}>
                        {template.isActive ? <ToggleRight className="text-emerald-600 w-8 h-8" /> : <ToggleLeft className="text-gray-400 w-8 h-8" />}
                      </button>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-outline-variant/10">
                      <button
                        onClick={() => handleOpenBuilder(template)}
                        className="p-2 text-xs font-bold text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all flex items-center gap-1"
                      >
                        <Edit2 size={14} /> Editar
                      </button>
                      <button
                        onClick={() => handleDeleteCustom(template.id)}
                        className="p-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-lg transition-all flex items-center gap-1"
                      >
                        <Trash2 size={14} /> Excluir
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Modal Builder de Fichas */}
        <AnimatePresence>
          {isBuilderOpen && (
            <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
              >
                <div className="p-6 border-b border-outline-variant/10 flex justify-between items-center bg-surface-container-low/30">
                  <h4 className="text-lg font-bold text-on-surface">
                    {editingTemplate ? 'Editar Ficha Personalizada' : 'Criar Nova Ficha Personalizada'}
                  </h4>
                  <button onClick={() => setIsBuilderOpen(false)} className="p-1.5 hover:bg-surface-container-low rounded-full">
                    <X size={20} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                  {/* Dados Básicos */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-on-surface-variant">Nome da Ficha *</label>
                      <input
                        type="text"
                        placeholder="Ex: Avaliação de Auriculoterapia"
                        value={templateName}
                        onChange={e => setTemplateName(e.target.value)}
                        className="w-full p-3 bg-surface-container-low rounded-xl border border-outline-variant/20 text-sm font-medium"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-on-surface-variant">Código Curto</label>
                      <input
                        type="text"
                        placeholder="Ex: AURICULO"
                        value={templateCode}
                        onChange={e => setTemplateCode(e.target.value)}
                        className="w-full p-3 bg-surface-container-low rounded-xl border border-outline-variant/20 text-sm font-medium"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-on-surface-variant">Descrição Breve</label>
                    <input
                      type="text"
                      placeholder="Ex: Ficha de anamnese e pontos auriculares"
                      value={templateDescription}
                      onChange={e => setTemplateDescription(e.target.value)}
                      className="w-full p-3 bg-surface-container-low rounded-xl border border-outline-variant/20 text-sm font-medium"
                    />
                  </div>

                  {/* Configuração de Etapas */}
                  <div className="space-y-4 pt-4 border-t border-outline-variant/10">
                    <div className="flex justify-between items-center">
                      <h5 className="text-sm font-bold text-on-surface">Etapas da Ficha</h5>
                      <button onClick={addStep} className="px-3 py-1.5 bg-teal-50 text-teal-700 text-xs font-bold rounded-lg flex items-center gap-1 hover:bg-teal-100">
                        <Plus size={14} /> Adicionar Etapa
                      </button>
                    </div>

                    {templateSteps.map((step, sIdx) => (
                      <div key={step.id} className="border border-outline-variant/20 rounded-2xl overflow-hidden bg-white shadow-sm">
                        <div className="p-4 bg-surface-container-low/20 flex items-center justify-between">
                          <input
                            type="text"
                            value={step.label}
                            onChange={e => {
                              const updated = [...templateSteps];
                              updated[sIdx].label = e.target.value;
                              setTemplateSteps(updated);
                            }}
                            className="bg-transparent font-bold text-sm text-on-surface border-b border-transparent hover:border-outline-variant/30 focus:border-primary px-1"
                          />
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setExpandedStepIndex(expandedStepIndex === sIdx ? null : sIdx)}
                              className="p-1.5 text-on-surface-variant hover:bg-surface-container-low rounded-lg"
                            >
                              {expandedStepIndex === sIdx ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>
                            {templateSteps.length > 1 && (
                              <button onClick={() => removeStep(sIdx)} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg">
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </div>

                        {expandedStepIndex === sIdx && (
                          <div className="p-4 space-y-3 bg-white">
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-bold text-outline">Campos desta etapa</span>
                              <button
                                onClick={() => addFieldToStep(sIdx)}
                                className="text-xs font-bold text-teal-600 hover:underline flex items-center gap-1"
                              >
                                <Plus size={12} /> Adicionar Campo
                              </button>
                            </div>

                            {step.fields.map((field, fIdx) => (
                              <div key={field.id} className="p-3 bg-surface-container-low/30 rounded-xl flex items-center gap-3">
                                <input
                                  type="text"
                                  placeholder="Nome do campo"
                                  value={field.label}
                                  onChange={e => {
                                    const updated = [...templateSteps];
                                    updated[sIdx].fields[fIdx].label = e.target.value;
                                    setTemplateSteps(updated);
                                  }}
                                  className="flex-1 p-2 bg-white rounded-lg border border-outline-variant/20 text-xs font-medium"
                                />

                                <select
                                  value={field.type}
                                  onChange={e => {
                                    const updated = [...templateSteps];
                                    updated[sIdx].fields[fIdx].type = e.target.value as FieldType;
                                    setTemplateSteps(updated);
                                  }}
                                  className="p-2 bg-white rounded-lg border border-outline-variant/20 text-xs font-medium"
                                >
                                  <option value="text">Texto Curto</option>
                                  <option value="textarea">Texto Longo</option>
                                  <option value="number">Número</option>
                                  <option value="checkbox">Caixa de Seleção</option>
                                </select>

                                <button onClick={() => removeFieldFromStep(sIdx, fIdx)} className="p-1 text-rose-600 hover:bg-rose-50 rounded">
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-6 border-t border-outline-variant/10 flex justify-end gap-3 bg-surface-container-low/20">
                  <button onClick={() => setIsBuilderOpen(false)} className="px-5 py-2.5 rounded-xl border border-outline-variant/20 text-xs font-bold">
                    Cancelar
                  </button>
                  <button onClick={handleSaveBuilder} className="px-5 py-2.5 rounded-xl bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 shadow-md">
                    Salvar Ficha
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
