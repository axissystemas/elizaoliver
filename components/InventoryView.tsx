'use client';

import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  Package, 
  PackageOpen,
  ArrowDownToLine,
  ArrowUpFromLine,
  MoreVertical,
  X,
  Check,
  Trash2,
  Edit2,
  AlertTriangle,
  History
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User } from '@/types/auth';

interface InventoryItem {
  id: string;
  name: string;
  description: string;
  quantity: number;
  min_quantity: number;
  unit: string;
  category: string;
  expiry_date?: string;
  unit_cost?: number;
  batch?: string;
  manufacturer?: string;
  color?: string; // Client-only
}

interface InventoryTransaction {
  id?: string;
  item_id: string;
  type: 'IN' | 'OUT';
  quantity: number;
  unit_price?: number;
  notes: string;
}

const CATEGORIES = ['Todos', 'Descartáveis', 'Acupuntura', 'Fisioterapia', 'Limpeza', 'Escritório', 'Outros'];
const COLORS = ['bg-emerald-500', 'bg-indigo-500', 'bg-blue-500', 'bg-rose-500', 'bg-amber-500', 'bg-purple-500'];

export default function InventoryView({ 
  user,
  items,
  onSaveItem,
  onDeleteItem,
  onAddTransaction,
  onDeleteTransaction,
  onFetchHistory
}: { 
  user?: User | null;
  items: InventoryItem[];
  onSaveItem: (data: any) => Promise<void>;
  onDeleteItem: (id: string) => Promise<void>;
  onAddTransaction: (data: InventoryTransaction) => Promise<void>;
  onDeleteTransaction: (id: string) => Promise<void>;
  onFetchHistory: (itemId: string) => Promise<any[]>;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [selectedItemForHistory, setSelectedItemForHistory] = useState<InventoryItem | null>(null);
  const [historyTransactions, setHistoryTransactions] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  
  // Form State - Item
  const [itemFormData, setItemFormData] = useState({
    name: '',
    description: '',
    quantity: 0,
    min_quantity: 0,
    unit: 'Unidade',
    category: 'Descartáveis',
    expiry_date: '',
    unit_cost: 0,
    batch: '',
    manufacturer: ''
  });

  // Form State - Transaction
  const [transactionFormData, setTransactionFormData] = useState({
    item_id: '',
    type: 'IN' as 'IN' | 'OUT',
    category: 'PURCHASE' as 'PURCHASE' | 'USAGE' | 'ADJUST',
    quantity: 1,
    unit_price: 0,
    notes: ''
  });

  const canCreate = user?.permissions.includes('inventory:create') || user?.role === 'ADMIN';
  const canEdit = user?.permissions.includes('inventory:edit') || user?.role === 'ADMIN';
  const canUndo = user?.permissions.includes('inventory:undo') || user?.role === 'ADMIN';
  const canDelete = user?.permissions.includes('inventory:delete') || user?.role === 'ADMIN';

  const lowStockItems = items.filter(item => item.quantity <= item.min_quantity);

  const handleOpenItemModal = (item?: InventoryItem) => {
    if (item) {
      setEditingItem(item);
      setItemFormData({
        name: item.name,
        description: item.description || '',
        quantity: item.quantity,
        min_quantity: item.min_quantity,
        unit: item.unit,
        category: item.category || 'Outros',
        expiry_date: item.expiry_date || '',
        unit_cost: item.unit_cost || 0,
        batch: item.batch || '',
        manufacturer: item.manufacturer || ''
      });
    } else {
      setEditingItem(null);
      setItemFormData({
        name: '',
        description: '',
        quantity: 0,
        min_quantity: 5,
        unit: 'Unidade',
        category: 'Descartáveis',
        expiry_date: '',
        unit_cost: 0,
        batch: '',
        manufacturer: ''
      });
    }
    setIsItemModalOpen(true);
  };

  const handleOpenTransactionModal = (item: InventoryItem, defaultType: 'IN' | 'OUT') => {
    setTransactionFormData({
      item_id: item.id,
      type: defaultType,
      category: defaultType === 'IN' ? 'PURCHASE' : 'USAGE',
      quantity: 1,
      unit_price: item.unit_cost || 0,
      notes: ''
    });
    setIsTransactionModalOpen(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSaveItem({
        ...itemFormData,
        id: editingItem?.id
      });
      setIsItemModalOpen(false);
    } catch (err: any) {
      console.error('InventoryView: Erro ao salvar produto:', err);
      alert(err?.message || 'Erro ao salvar produto. Verifique o console.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onAddTransaction(transactionFormData);
      setIsTransactionModalOpen(false);
    } catch (err: any) {
      console.error('InventoryView: Erro ao registrar transação:', err);
      alert(err?.message || 'Erro ao registrar transação. Verifique o console.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenHistory = async (item: InventoryItem) => {
    setSelectedItemForHistory(item);
    setIsLoadingHistory(true);
    setIsHistoryModalOpen(true);
    try {
      const data = await onFetchHistory(item.id);
      setHistoryTransactions(data);
    } catch (err) {
      console.error('Erro ao carregar histórico:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleUndoTransaction = async (transactionId: string) => {
    if (confirm('Deseja realmente estornar esta movimentação? Isso reverterá a quantidade e o custo médio ponderado do item.')) {
      try {
        await onDeleteTransaction(transactionId);
        // Refresh local history
        if (selectedItemForHistory) {
          const data = await onFetchHistory(selectedItemForHistory.id);
          setHistoryTransactions(data);
        }
      } catch (err) {
        console.error('Erro ao estornar:', err);
      }
    }
  };

  const filteredItems = items.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === 'Todos' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="p-10 space-y-10 relative">
      {/* Header */}
      <section className="flex flex-col md:flex-row gap-8 items-start justify-between">
        <div>
          <h2 className="text-4xl font-bold font-headline text-on-surface">Controle de Estoque</h2>
          <p className="text-on-surface-variant text-lg mt-2 font-medium">Cadastre produtos e gerencie o fluxo de entrada e saída.</p>
        </div>
        {canCreate && (
          <button 
            onClick={() => handleOpenItemModal()}
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-primary text-white shadow-md shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-1.5"
          >
            <Plus size={15} /> Cadastrar Produto
          </button>
        )}
      </section>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="bg-white rounded-3xl p-6 border border-outline-variant/10 shadow-sm flex items-center gap-6">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <Package size={28} />
            </div>
            <div>
              <p className="text-sm font-bold tracking-widest uppercase text-outline">Total de Itens</p>
              <h3 className="text-3xl font-extrabold text-on-surface font-headline leading-none mt-1">{items.length}</h3>
            </div>
         </div>
         <div className="bg-rose-50 rounded-3xl p-6 border border-rose-100 shadow-sm flex items-center gap-6">
            <div className="w-14 h-14 rounded-2xl bg-rose-200 flex items-center justify-center text-rose-600">
              <AlertTriangle size={28} />
            </div>
            <div>
              <p className="text-sm font-bold tracking-widest uppercase text-rose-600">Estoque Baixo</p>
              <h3 className="text-3xl font-extrabold text-rose-900 font-headline leading-none mt-1">{lowStockItems.length}</h3>
            </div>
         </div>
      </div>

      {/* Search and Category Filter */}
      <section className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-outline" size={20} />
          <input 
            type="text" 
            placeholder="Buscar item do estoque..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-16 pr-6 py-5 bg-white rounded-2xl border border-outline-variant/10 shadow-sm focus:ring-2 focus:ring-primary/10 text-on-surface font-medium"
          />
        </div>
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

      {/* Items List */}
      <section className="bg-white rounded-[2.5rem] border border-outline-variant/10 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant/10">
                <th className="py-5 px-6 font-bold text-xs uppercase tracking-widest text-outline">Item</th>
                <th className="py-5 px-6 font-bold text-xs uppercase tracking-widest text-outline">Categoria</th>
                <th className="py-5 px-6 font-bold text-xs uppercase tracking-widest text-outline text-right">Custo Un.</th>
                <th className="py-5 px-6 font-bold text-xs uppercase tracking-widest text-outline text-right">Validade</th>
                <th className="py-5 px-6 font-bold text-xs uppercase tracking-widest text-outline">Lote/Fab.</th>
                <th className="py-5 px-6 font-bold text-xs uppercase tracking-widest text-outline text-right">Estoque</th>
                <th className="py-5 px-6 font-bold text-xs uppercase tracking-widest text-outline text-center">Status</th>
                <th className="py-5 px-6 font-bold text-xs uppercase tracking-widest text-outline text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                 <tr>
                    <td colSpan={7} className="py-12 text-center text-outline">Nenhum item encontrado.</td>
                 </tr>
              ) : (
                filteredItems.map(item => {
                  const isLowStock = item.quantity <= item.min_quantity;
                  return (
                    <tr key={item.id} className="border-b border-outline-variant/5 hover:bg-surface-container-low/50 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white ${item.color || 'bg-slate-400'}`}>
                            {item.quantity === 0 ? <PackageOpen size={20} /> : <Package size={20} />}
                          </div>
                          <div>
                            <p className="font-bold text-on-surface">{item.name}</p>
                            <p className="text-xs text-on-surface-variant">{item.description || 'Sem descrição'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-sm font-medium text-on-surface-variant">
                        {item.category}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <span className="text-sm font-bold text-on-surface">
                          {item.unit_cost ? `R$ ${item.unit_cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        {item.expiry_date ? (
                          <div className="flex flex-col items-end">
                            <span className={`text-sm font-bold ${
                              new Date(item.expiry_date) < new Date() ? 'text-rose-600' :
                              new Date(item.expiry_date) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) ? 'text-amber-600' :
                              'text-on-surface'
                            }`}>
                              {new Date(item.expiry_date).toLocaleDateString('pt-BR')}
                            </span>
                            {new Date(item.expiry_date) < new Date() && (
                              <span className="text-[10px] font-bold text-rose-500 uppercase">Vencido</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-outline">-</span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-on-surface">{item.batch || '-'}</span>
                          <span className="text-[10px] text-outline uppercase">{item.manufacturer || '-'}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <span className="text-xl font-bold font-headline">{item.quantity}</span>
                        <span className="text-xs text-outline ml-1">{item.unit}</span>
                      </td>
                      <td className="py-4 px-6 text-center">
                        {isLowStock ? (
                           <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-50 text-rose-600 font-bold text-[10px] uppercase tracking-wider">
                             <AlertTriangle size={12} /> {item.quantity === 0 ? 'Sem Estoque' : 'Baixo'}
                           </span>
                        ) : (
                           <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 text-emerald-600 font-bold text-[10px] uppercase tracking-wider">
                             <Check size={12} /> Ok
                           </span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                           <button 
                            onClick={() => handleOpenTransactionModal(item, 'IN')}
                            title="Registrar Entrada"
                            className="p-2 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                           >
                              <ArrowUpFromLine size={16} />
                           </button>
                           <button 
                            onClick={() => handleOpenTransactionModal(item, 'OUT')}
                            title="Registrar Saída"
                            className="p-2 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors"
                           >
                              <ArrowDownToLine size={16} />
                           </button>
                           <button 
                            onClick={() => handleOpenHistory(item)}
                            title="Ver Histórico"
                            className="p-2 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
                           >
                              <History size={16} />
                           </button>
                           <button 
                            onClick={() => handleOpenItemModal(item)}
                            title="Editar Item"
                            className="p-2 rounded-lg bg-surface-container text-on-surface-variant hover:text-primary transition-colors ml-2"
                           >
                              <Edit2 size={16} />
                           </button>
                           {canDelete && (
                              <button 
                                onClick={() => onDeleteItem(item.id)}
                                title="Excluir"
                                className="p-2 rounded-lg bg-surface-container text-outline hover:text-rose-500 transition-all"
                              >
                                <Trash2 size={16} />
                              </button>
                           )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Item Modal */}
      <AnimatePresence>
        {isItemModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsItemModalOpen(false)}
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
                  {editingItem ? 'Editar Produto' : 'Novo Produto'}
                </h3>
                <button 
                  onClick={() => setIsItemModalOpen(false)}
                  className="p-2 hover:bg-surface-container-low rounded-full transition-all"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSaveItem} className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-outline uppercase tracking-widest">Nome do Produto</label>
                  <input 
                    required
                    type="text" 
                    value={itemFormData.name}
                    onChange={e => setItemFormData({...itemFormData, name: e.target.value})}
                    className="w-full px-5 py-4 bg-surface-container-low rounded-xl border border-outline-variant/10 focus:ring-2 focus:ring-primary/20 outline-none font-medium"
                    placeholder="Ex: Agulha de Acupuntura 0.25x30mm"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-outline uppercase tracking-widest">Lote</label>
                    <input 
                      type="text" 
                      value={itemFormData.batch}
                      onChange={e => setItemFormData({...itemFormData, batch: e.target.value})}
                      className="w-full px-5 py-4 bg-surface-container-low rounded-xl border border-outline-variant/10 focus:ring-2 focus:ring-primary/20 outline-none font-medium"
                      placeholder="Opcional"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-outline uppercase tracking-widest">Fabricante</label>
                    <input 
                      type="text" 
                      value={itemFormData.manufacturer}
                      onChange={e => setItemFormData({...itemFormData, manufacturer: e.target.value})}
                      className="w-full px-5 py-4 bg-surface-container-low rounded-xl border border-outline-variant/10 focus:ring-2 focus:ring-primary/20 outline-none font-medium"
                      placeholder="Opcional"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-outline uppercase tracking-widest">Categoria</label>
                    <select 
                      value={itemFormData.category}
                      onChange={e => setItemFormData({...itemFormData, category: e.target.value})}
                      className="w-full px-5 py-4 bg-surface-container-low rounded-xl border border-outline-variant/10 focus:ring-2 focus:ring-primary/20 outline-none font-medium appearance-none"
                    >
                      {CATEGORIES.filter(c => c !== 'Todos').map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-outline uppercase tracking-widest">Unidade Medida</label>
                    <input 
                      required
                      type="text" 
                      value={itemFormData.unit}
                      onChange={e => setItemFormData({...itemFormData, unit: e.target.value})}
                      className="w-full px-5 py-4 bg-surface-container-low rounded-xl border border-outline-variant/10 focus:ring-2 focus:ring-primary/20 outline-none font-medium"
                      placeholder="Ex: Unidade, Caixa, Pacote"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-outline uppercase tracking-widest">Data de Validade</label>
                    <input 
                      type="date" 
                      value={itemFormData.expiry_date}
                      onChange={e => setItemFormData({...itemFormData, expiry_date: e.target.value})}
                      className="w-full px-5 py-4 bg-surface-container-low rounded-xl border border-outline-variant/10 focus:ring-2 focus:ring-primary/20 outline-none font-medium"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-outline uppercase tracking-widest">Custo por Unidade (R$)</label>
                    <input 
                      type="number" 
                      min="0"
                      step="0.01"
                      value={itemFormData.unit_cost}
                      onChange={e => setItemFormData({...itemFormData, unit_cost: parseFloat(e.target.value)})}
                      className="w-full px-5 py-4 bg-surface-container-low rounded-xl border border-outline-variant/10 focus:ring-2 focus:ring-primary/20 outline-none font-medium"
                      placeholder="Opcional"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {!editingItem && (
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-outline uppercase tracking-widest">Estoque Inicial</label>
                      <input 
                        required
                        type="number" 
                        min="0"
                        step="0.01"
                        value={itemFormData.quantity}
                        onChange={e => setItemFormData({...itemFormData, quantity: parseFloat(e.target.value)})}
                        className="w-full px-5 py-4 bg-surface-container-low rounded-xl border border-outline-variant/10 focus:ring-2 focus:ring-primary/20 outline-none font-medium"
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-rose-500 uppercase tracking-widest">Alerta Estoque Mínimo</label>
                    <input 
                      required
                      type="number" 
                      min="0"
                      step="1"
                      value={itemFormData.min_quantity}
                      onChange={e => setItemFormData({...itemFormData, min_quantity: parseInt(e.target.value) || 0})}
                      className="w-full px-5 py-4 bg-rose-50 rounded-xl border border-rose-100 focus:ring-2 focus:ring-rose-200 outline-none font-medium text-rose-900"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-outline uppercase tracking-widest">Descrição / Observações</label>
                  <textarea 
                    rows={2}
                    value={itemFormData.description}
                    onChange={e => setItemFormData({...itemFormData, description: e.target.value})}
                    className="w-full px-5 py-4 bg-surface-container-low rounded-xl border border-outline-variant/10 focus:ring-2 focus:ring-primary/20 outline-none font-medium resize-none"
                    placeholder="Opcional..."
                  />
                </div>

                <div className="pt-6 flex gap-4">
                  <button 
                    type="button"
                    onClick={() => setIsItemModalOpen(false)}
                    className="flex-1 py-4 rounded-2xl border border-outline-variant/20 font-bold text-outline hover:bg-surface-container-low transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 py-4 rounded-2xl bg-primary text-white font-bold shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100"
                  >
                    {isSaving ? (
                      <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Salvando...</>
                    ) : (
                      <><Check size={20} /> Salvar Produto</>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Transaction Modal */}
      <AnimatePresence>
        {isTransactionModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsTransactionModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className={`p-8 border-b ${transactionFormData.type === 'IN' ? 'bg-emerald-500' : 'bg-amber-500'} text-white flex justify-between items-center`}>
                <h3 className="text-xl font-bold font-headline flex items-center gap-2">
                  {transactionFormData.type === 'IN' ? <ArrowUpFromLine /> : <ArrowDownToLine />}
                  {transactionFormData.type === 'IN' ? 'Registrar Entrada' : 'Registrar Saída'}
                </h3>
                <button 
                  onClick={() => setIsTransactionModalOpen(false)}
                  className="p-2 hover:bg-white/20 rounded-full transition-all"
                >
                  <X size={24} />
                </button>
              </div>

                <form onSubmit={handleSaveTransaction} className="p-8 space-y-6">
                 <div className="space-y-2">
                    <label className="text-xs font-bold text-outline uppercase tracking-widest">Finalidade da Movimentação</label>
                    <select 
                      value={transactionFormData.category}
                      onChange={e => {
                        const newCat = e.target.value as any;
                        setTransactionFormData({
                          ...transactionFormData, 
                          category: newCat,
                          type: (newCat === 'PURCHASE' || (newCat === 'ADJUST' && transactionFormData.type === 'IN')) ? 'IN' : 'OUT'
                        });
                      }}
                      className="w-full px-5 py-4 bg-surface-container-low rounded-xl border border-outline-variant/10 focus:ring-2 focus:ring-primary/20 outline-none font-medium appearance-none"
                    >
                      <option value="PURCHASE">Compra (Entrada + Financeiro)</option>
                      <option value="USAGE">Consumo / Uso Interno (Saída)</option>
                      <option value="ADJUST">Ajuste Técnico de Inventário (Correção)</option>
                    </select>
                    {transactionFormData.category === 'ADJUST' && (
                      <div className="flex bg-surface-container-low p-1 rounded-xl gap-1 mt-2">
                        <button 
                          type="button"
                          onClick={() => setTransactionFormData({...transactionFormData, type: 'IN'})}
                          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${transactionFormData.type === 'IN' ? 'bg-emerald-500 text-white shadow-sm' : 'text-outline hover:bg-surface-container'}`}
                        >
                          Entrada (Sobra)
                        </button>
                        <button 
                          type="button"
                          onClick={() => setTransactionFormData({...transactionFormData, type: 'OUT'})}
                          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${transactionFormData.type === 'OUT' ? 'bg-amber-500 text-white shadow-sm' : 'text-outline hover:bg-surface-container'}`}
                        >
                          Saída (Perda)
                        </button>
                      </div>
                    )}
                  </div>

                 <div className="space-y-2">
                    <label className="text-xs font-bold text-outline uppercase tracking-widest">Quantidade</label>
                    <input 
                      required
                      type="number" 
                      min="0.01"
                      step="0.01"
                      value={transactionFormData.quantity}
                      onChange={e => setTransactionFormData({...transactionFormData, quantity: parseFloat(e.target.value)})}
                      className="w-full px-5 py-4 text-center text-3xl bg-surface-container-low rounded-xl border border-outline-variant/10 focus:ring-2 focus:ring-primary/20 outline-none font-bold"
                    />
                    <p className="text-center text-xs text-outline font-medium mt-1">
                      Estoque Atual: {items.find(i => i.id === transactionFormData.item_id)?.quantity}
                    </p>
                  </div>
                  
                     {transactionFormData.type === 'IN' && (
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-outline uppercase tracking-widest">Preço de Compra (Unitário R$)</label>
                      <input 
                        required
                        type="number" 
                        min="0"
                        step="0.01"
                        value={transactionFormData.unit_price}
                        onChange={e => setTransactionFormData({...transactionFormData, unit_price: parseFloat(e.target.value)})}
                        className="w-full px-5 py-4 bg-emerald-50 rounded-xl border border-emerald-100 focus:ring-2 focus:ring-primary/20 outline-none font-bold text-emerald-900"
                        placeholder="Valor pago por unidade"
                      />
                      <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider text-center">
                        Esta entrada gerará uma despesa automática no financeiro.
                      </p>
                    </div>
                  )}

                <div className="space-y-2">
                  <label className="text-xs font-bold text-outline uppercase tracking-widest">Motivo / Observação</label>
                  <input 
                    type="text" 
                    value={transactionFormData.notes}
                    onChange={e => setTransactionFormData({...transactionFormData, notes: e.target.value})}
                    className="w-full px-5 py-4 bg-surface-container-low rounded-xl border border-outline-variant/10 focus:ring-2 focus:ring-primary/20 outline-none font-medium"
                    placeholder={transactionFormData.type === 'IN' ? "Ex: Compra Nota #123" : "Ex: Uso no consultório"}
                  />
                </div>

                <button 
                  type="submit"
                  disabled={isSaving}
                  className={`w-full py-4 rounded-2xl text-white font-bold shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed ${transactionFormData.type === 'IN' ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20' : 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20'}`}
                >
                  {isSaving ? (
                    <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Processando...</>
                  ) : (
                    <><Check size={20} /> Confirmar</>
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* History Modal */}
      <AnimatePresence>
        {isHistoryModalOpen && selectedItemForHistory && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsHistoryModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="p-8 border-b border-outline-variant/10 flex justify-between items-center bg-indigo-600 text-white">
                <div>
                  <h3 className="text-2xl font-bold font-headline flex items-center gap-3">
                    <History /> Histórico: {selectedItemForHistory.name}
                  </h3>
                  <p className="text-white/80 text-sm mt-1">Todas as movimentações registradas para este item.</p>
                </div>
                <button 
                  onClick={() => setIsHistoryModalOpen(false)}
                  className="p-2 hover:bg-white/20 rounded-full transition-all"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="overflow-y-auto p-8 flex-1">
                {isLoadingHistory ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-outline font-medium">Carregando histórico...</p>
                  </div>
                ) : historyTransactions.length === 0 ? (
                  <div className="text-center py-20 text-outline">
                    Nenhuma movimentação encontrada.
                  </div>
                ) : (
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-outline-variant/10">
                        <th className="py-4 px-4 text-xs font-bold text-outline uppercase tracking-widest text-center">Tipo</th>
                        <th className="py-4 px-4 text-xs font-bold text-outline uppercase tracking-widest">Data</th>
                        <th className="py-4 px-4 text-xs font-bold text-outline uppercase tracking-widest text-right">Qtd</th>
                        <th className="py-4 px-4 text-xs font-bold text-outline uppercase tracking-widest text-right">Preço Unit.</th>
                        <th className="py-4 px-4 text-xs font-bold text-outline uppercase tracking-widest">Observação</th>
                        <th className="py-4 px-4 text-xs font-bold text-outline uppercase tracking-widest text-center">Estorno</th>
                        <th className="py-4 px-4 text-xs font-bold text-outline uppercase tracking-widest text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/5">
                      {historyTransactions.map((t) => (
                        <tr key={t.id} className="hover:bg-surface-container-low/50 transition-colors">
                          <td className={`py-4 px-4 text-center ${t.is_reversed ? 'opacity-40' : ''}`}>
                            {t.type === 'IN' ? (
                              <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 inline-block">
                                <ArrowUpFromLine size={14} />
                              </span>
                            ) : (
                              <span className="p-1.5 rounded-lg bg-amber-50 text-amber-600 inline-block">
                                <ArrowDownToLine size={14} />
                              </span>
                            )}
                          </td>
                          <td className={`py-4 px-4 ${t.is_reversed ? 'opacity-40 line-through' : ''}`}>
                            <div className="flex flex-col">
                              <span className="text-on-surface font-medium">
                                {new Date(t.created_at).toLocaleDateString('pt-BR')}
                              </span>
                              <span className="text-[10px] text-outline">
                                {new Date(t.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </td>
                          <td className={`py-4 px-4 text-right ${t.is_reversed ? 'opacity-40 line-through' : ''}`}>
                            <span className={`font-bold ${t.type === 'IN' ? 'text-emerald-600' : 'text-amber-600'}`}>
                              {t.type === 'IN' ? '+' : '-'}{t.quantity}
                            </span>
                          </td>
                          <td className={`py-4 px-4 text-right font-medium ${t.is_reversed ? 'opacity-40 line-through' : ''}`}>
                            {t.unit_price > 0 ? `R$ ${t.unit_price.toFixed(2)}` : '-'}
                          </td>
                          <td className={`py-4 px-4 text-sm text-on-surface-variant italic ${t.is_reversed ? 'opacity-40 line-through' : ''}`}>
                            {t.notes || '-'}
                          </td>
                          <td className="py-4 px-4 text-center relative overflow-hidden">
                            {t.is_reversed && (
                              <motion.div 
                                initial={{ scale: 2, opacity: 0, rotate: -20 }}
                                animate={{ scale: 1, opacity: 1, rotate: -15 }}
                                className="inline-block px-3 py-1 border-4 border-rose-600 text-rose-600 font-black text-[11px] uppercase tracking-tighter rounded-sm mt-1 shadow-[2px_2px_0px_rgba(225,29,72,0.2)]"
                                style={{ 
                                  fontFamily: 'monospace',
                                  maskImage: 'radial-gradient(circle, #000 70%, transparent 100%)',
                                  WebkitMaskImage: 'radial-gradient(circle, #000 70%, transparent 100%)'
                                }}
                              >
                                Estornado
                              </motion.div>
                            )}
                          </td>
                          <td className="py-4 px-4 text-right">
                            {!t.is_reversed && canUndo && (
                              <button 
                                onClick={() => handleUndoTransaction(t.id)}
                                className="p-2 text-outline hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                                title="Estornar / Desfazer"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
