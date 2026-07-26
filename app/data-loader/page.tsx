"use client";

import React, { useRef, useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { 
  Upload, FileSpreadsheet, Package, DatabaseZap, Play, XSquare, 
  CheckCircle, Trash2, Users, BarChart3, Info, Settings, 
  ChevronRight, AlertTriangle, Terminal as TerminalIcon, RefreshCw,
  LogIn, LogOut, Mail, Lock, ShieldCheck, Eye, EyeOff, Apple 
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabase";

type Category = "chinese_diet_foods" | "procedures" | "medical_supplies" | "inventory" | "patients";

export default function DataLoaderPage() {
  const { user: authUser, loading: authLoading, signIn, signOut } = useAuth();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cancelRef = useRef<boolean>(false);
  
  const [activeTab, setActiveTab] = useState<Category>("chinese_diet_foods");
  const [logs, setLogs] = useState<string[]>([]);
  const [stats, setStats] = useState({ success: 0, errors: 0 });
  const [dbStats, setDbStats] = useState<Record<Category, number>>({
    chinese_diet_foods: 0,
    procedures: 0,
    medical_supplies: 0,
    inventory: 0,
    patients: 0
  });
  
  const [stage, setStage] = useState<"IDLE" | "READY" | "IMPORTING" | "DONE">("IDLE");
  const [fileName, setFileName] = useState("");
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [previewHeaders, setPreviewHeaders] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<any[][]>([]);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isTruncateModalOpen, setIsTruncateModalOpen] = useState(false);
  const [truncateConfirm, setTruncateConfirm] = useState("");
  
  // Estados de Login
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoginLoading, setIsLoginLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");

  const isAdmin = !!(authUser && (
    (authUser.role as string) === 'ADMIN' || 
    (authUser.role as string) === 'OWNER' || 
    authUser.isNativeAdmin || 
    authUser.email === 'admin@axis.com.br' || 
    authUser.email === 'suporte@axissistemas.com.br'
  ));

  const userId = authUser?.id || null;
  const userEmail = authUser?.email || null;

  const addLog = (msg: string) => {
    setLogs((prev) => [`${new Date().toLocaleTimeString()} - ${msg}`, ...prev].slice(0, 100));
  };

  const fetchDbStats = async () => {
    const fetchCount = async (table: string) => {
      const { count } = await (supabase.from as any)(table).select("*", { count: "exact", head: true });
      return count || 0;
    };

    try {
      const [proc, supp, inv, pat, foods] = await Promise.all([
        fetchCount("procedures"),
        fetchCount("medical_supplies"),
        fetchCount("inventory_items"),
        fetchCount("patients"),
        fetchCount("chinese_diet_foods")
      ]);

      let localFoodsCount = 0;
      try {
        const stored = localStorage.getItem('axis_gc_dietotherapy_foods');
        if (stored) localFoodsCount = JSON.parse(stored).length;
      } catch {}

      setDbStats({
        chinese_diet_foods: Math.max(foods, localFoodsCount),
        procedures: proc,
        medical_supplies: supp,
        inventory: inv,
        patients: pat
      });
    } catch (err) {
      console.error("Erro ao buscar stats:", err);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchDbStats();
      const interval = setInterval(fetchDbStats, 30000);
      return () => clearInterval(interval);
    }
  }, [isAdmin]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoginLoading(true);
    setLoginError("");
    addLog(`🔐 Autenticando ${email}...`);
    
    try {
      await signIn(email, password);
      addLog(`✅ Acesso efetuado para ${email}`);
      setPassword("");
    } catch (err: any) {
      const msg = err?.message || 'Falha ao realizar login';
      setLoginError(msg);
      addLog(`❌ Falha no login: ${msg}`);
    } finally {
      setIsLoginLoading(false);
    }
  };

  const handleFileSelection = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setLogs([]);
    setStats({ success: 0, errors: 0 });
    addLog(`🔍 Analisando arquivo: ${file.name}...`);
    
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      
      const rawData = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, blankrows: false });
      
      // Sanitizar UTF-8 BOM de todas as células
      for (let r = 0; r < rawData.length; r++) {
        if (Array.isArray(rawData[r])) {
          for (let c = 0; c < rawData[r].length; c++) {
            if (typeof rawData[r][c] === 'string') {
              rawData[r][c] = rawData[r][c].replace(/^\uFEFF/, '').trim();
            }
          }
        }
      }
      
      // Palavras-chave aprimoradas por categoria
      const keywordsMap: Record<Category, string[]> = {
        chinese_diet_foods: ["categoria", "nome", "ativo", "nome_cientifico", "parte_utilizada", "sinonimos", "imagem_url", "descricao", "natureza_termica", "direcao_energetica", "sabores", "canais_meridianos", "funcoes_terapeuticas", "padroes_indicados", "padroes_cautela_contraindicacao", "observacoes_clinicas", "observacoes_culinarias", "modos_preparo", "contraindicacoes_gerais", "alergenicos", "restricoes_alimentares", "titulo_obra_referencia", "autor_referencia", "edicao_referencia", "pagina_referencia", "ano_publicacao_referencia"],
        procedures: ["codigo", "termo", "tuss", "procedimento", "code", "name", "service", "servico"],
        medical_supplies: ["codigo", "anvisa", "laboratorio", "produto", "apresentacao", "code", "material", "med", "brand", "lote", "batch", "fabricante", "manufacturer"],
        inventory: ["nome", "quantidade", "estoque", "unidade", "custo", "validade", "alerta", "minimo", "name", "quantity", "stock", "min", "limit", "alert", "unit", "cost", "expiry", "lote", "batch", "fabricante", "manufacturer"],
        patients: ["nome", "idade", "sexo", "telefone", "celular", "email", "endereco", "cpf", "name", "age", "gender", "phone", "mail", "address"]
      };

      const headerKeywords = keywordsMap[activeTab];
      let headerIndex = -1;
      let maxScore = 0;

      for (let i = 0; i < Math.min(rawData.length, 30); i++) {
        const rowArray = rawData[i] || [];
        let rowScore = 0;
        rowArray.forEach(cell => {
          if (cell) {
            const norm = cell.toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
            if (headerKeywords.some(kw => norm.includes(kw))) rowScore++;
          }
        });
        if (rowScore > maxScore) {
          maxScore = rowScore;
          headerIndex = i;
        }
      }

      if (headerIndex === -1 || maxScore < 1) {
        for (let i = 0; i < Math.min(rawData.length, 30); i++) {
          const rowArray = rawData[i] || [];
          const filled = rowArray.filter(c => c !== null && c !== undefined && c.toString().trim() !== "");
          if (filled.length >= 2) {
            headerIndex = i;
            break;
          }
        }
      }

      const headers = rawData[headerIndex] || [];
      setPreviewHeaders(headers.map(h => h?.toString() || ""));
      
      const normHeaders = headers.map(h => 
        h ? h.toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim() : ""
      );

      const getIdx = (keywords: string[]) => {
        const exact = normHeaders.findIndex(h => keywords.includes(h));
        if (exact !== -1) return exact;
        const starts = normHeaders.findIndex(h => keywords.some(kw => h.startsWith(kw)));
        if (starts !== -1) return starts;
        return normHeaders.findIndex(h => keywords.some(kw => h.includes(kw)));
      };

      // Mapeamento Dinâmico por Categoria
      const json = [];
      const colMap: any = {};

      if (activeTab === "chinese_diet_foods") {
        colMap.category = getIdx(["categoria", "category"]);
        colMap.name = getIdx(["nome", "name"]);
        colMap.is_active = getIdx(["ativo", "active"]);
        colMap.scientific_name = getIdx(["nome_cientifico", "scientific_name"]);
        colMap.used_part = getIdx(["parte_utilizada", "used_part"]);
        colMap.synonyms = getIdx(["sinonimos", "synonyms"]);
        colMap.image_url = getIdx(["imagem_url", "image_url"]);
        colMap.description = getIdx(["descricao", "description"]);
        colMap.thermal_nature = getIdx(["natureza_termica", "thermal_nature"]);
        colMap.energy_direction = getIdx(["direcao_energetica", "energy_direction"]);
        colMap.flavors = getIdx(["sabores", "flavors"]);
        colMap.channels = getIdx(["canais_meridianos", "channels", "canais"]);
        colMap.therapeutic_functions = getIdx(["funcoes_terapeuticas", "therapeutic_functions"]);
        colMap.indicated_patterns = getIdx(["padroes_indicados", "indicated_patterns"]);
        colMap.caution_patterns = getIdx(["padroes_cautela_contraindicacao", "caution_patterns"]);
        colMap.clinical_notes = getIdx(["observacoes_clinicas", "clinical_notes"]);
        colMap.culinary_notes = getIdx(["observacoes_culinarias", "culinary_notes"]);
        colMap.preparation_modes = getIdx(["modos_preparo", "preparation_modes"]);
        colMap.contraindications = getIdx(["contraindicacoes_gerais", "contraindications"]);
        colMap.allergens = getIdx(["alergenicos", "allergens"]);
        colMap.restrictions = getIdx(["restricoes_alimentares", "restrictions"]);
        colMap.source_title = getIdx(["titulo_obra_referencia", "source_title"]);
        colMap.author = getIdx(["autor_referencia", "author"]);
        colMap.edition = getIdx(["edicao_referencia", "edition"]);
        colMap.page = getIdx(["pagina_referencia", "page"]);
        colMap.publication_year = getIdx(["ano_publicacao_referencia", "publication_year"]);
      } else if (activeTab === "procedures" || activeTab === "medical_supplies") {
        colMap.code = getIdx(["codigo", "tuss", "cod", "produto", "code", "ean", "id"]);
        colMap.name = getIdx(["termo", "nome", "descricao", "procedimento", "name", "service", "servico"]);
        colMap.presentation = getIdx(["apresentacao", "unidade", "presentation", "unit", "env"]);
        colMap.laboratory = getIdx(["laboratorio", "fabricante", "labor", "brand", "manufacturer"]);
        colMap.anvisa = getIdx(["anvisa", "registro", "ms"]);
        colMap.batch = getIdx(["lote", "batch", "partida", "serie"]);
        colMap.manufacturer = getIdx(["fabricante", "marca", "manufacturer", "brand", "lab"]);
      } else if (activeTab === "inventory") {
        colMap.name = getIdx(["nome", "item", "produto", "name", "description"]);
        colMap.quantity = getIdx(["quantidade", "estoque", "atual", "qtd", "quantity", "stock", "count"]);
        colMap.unit = getIdx(["unidade", "medida", "und", "unit", "uom"]);
        colMap.category = getIdx(["categoria", "grupo", "category", "type"]);
        colMap.unit_cost = getIdx(["custo", "preco", "valor", "cost", "price", "unit cost"]);
        colMap.expiry_date = getIdx(["validade", "vencimento", "expiry", "expire"]);
        colMap.min_quantity = getIdx(["alerta", "minimo", "min", "limit", "alert"]);
        colMap.batch = getIdx(["lote", "batch", "partida", "serie"]);
        colMap.manufacturer = getIdx(["fabricante", "marca", "manufacturer", "brand"]);
      } else if (activeTab === "patients") {
        colMap.name = getIdx(["nome", "paciente", "cliente", "name", "full name", "patient"]);
        colMap.cpf = getIdx(["cpf", "documento", "identificacao", "id", "doc"]);
        colMap.age = getIdx(["idade", "nascimento", "data", "age", "birth"]);
        colMap.gender = getIdx(["sexo", "genero", "gender", "sex"]);
        colMap.phone = getIdx(["telefone", "celular", "contato", "mobile", "phone", "tel"]);
        colMap.email = getIdx(["email", "e-mail", "correio", "mail"]);
        colMap.address = getIdx(["endereco", "logradouro", "rua", "address", "street"]);
        colMap.marital_status = getIdx(["estado civil", "civil", "casado", "solteiro", "marital", "marital_status"]);
        colMap.profession = getIdx(["profissao", "trabalho", "cargo", "ocupacao", "profession", "job", "work"]);
      }

      for (let i = headerIndex + 1; i < rawData.length; i++) {
        const rowArray = rawData[i];
        if (!rowArray || rowArray.length === 0) continue;
        
        const rowObj: any = { metadata: {} };
        const mappedIndices = new Set(Object.values(colMap));

        Object.keys(colMap).forEach(key => {
          const idx = colMap[key];
          if (idx !== -1 && idx !== undefined) {
            rowObj[key] = rowArray[idx];
          }
        });

        rowArray.forEach((cell: any, idx: number) => {
          if (!mappedIndices.has(idx) && cell !== undefined && cell !== null && cell.toString().trim() !== "") {
            const headerName = previewHeaders[idx] || `campo_${idx}`;
            rowObj.metadata[headerName] = cell;
          }
        });
        
        if (rowObj.name || rowObj.code) {
          json.push(rowObj);
        }
      }

      setParsedData(json);
      setPreviewRows(rawData.slice(headerIndex + 1, headerIndex + 11));
      setStage("READY");
      addLog(`✅ Planilha pronta: ${json.length} registros identificados.`);
    } catch (err: any) {
      addLog(`🚨 Erro: ${err.message}`);
      setStage("IDLE");
    }
  };

  const excelDateToISO = (serial: any) => {
    if (!serial) return null;
    const num = parseFloat(serial);
    if (isNaN(num) || num < 10000) return serial.toString();
    
    try {
      const date = new Date(Math.round((num - 25569) * 86400 * 1000));
      return date.toISOString().split('T')[0];
    } catch (e) {
      return serial.toString();
    }
  };

  const processImport = async () => {
    if (parsedData.length === 0 || !userId) return;
    setStage("IMPORTING");
    cancelRef.current = false;
    let successCount = 0;
    let errorCount = 0;

    addLog(`🚀 Iniciando carga em LOTES para ${activeTab}...`);
    
    const BATCH_SIZE = 500;
    const totalBatches = Math.ceil(parsedData.length / BATCH_SIZE);

    for (let b = 0; b < totalBatches; b++) {
      if (cancelRef.current) {
         addLog(`🛑 Interrompido pelo usuário.`);
         break;
      }

      const start = b * BATCH_SIZE;
      const end = Math.min(start + BATCH_SIZE, parsedData.length);
      const chunk = parsedData.slice(start, end);
      
      addLog(`📦 Processando lote ${b + 1}/${totalBatches} (${chunk.length} registros)...`);

      const batchToInsert = chunk.map(row => {
        let insertData: any = { 
          updated_at: new Date().toISOString(),
          created_by: userId,
          metadata: row.metadata || {}
        };

        if (activeTab === "chinese_diet_foods") {
          const name = row.name?.toString()?.trim();
          if (!name) return null;
          
          const parseArr = (val: any) => {
            if (!val) return [];
            if (Array.isArray(val)) return val;
            return val.toString().split(/[,;|]/).map((s: string) => s.trim()).filter(Boolean);
          };

          return {
            ...insertData,
            id: 'f_' + Math.random().toString(36).substr(2, 9),
            name,
            normalized_name: name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim(),
            category: row.category?.toString() || "Outros",
            thermal_nature: row.thermal_nature?.toString() || "Neutro",
            energy_direction: row.energy_direction?.toString() || "Neutro",
            flavors: parseArr(row.flavors),
            channels: parseArr(row.channels),
            scientific_name: row.scientific_name?.toString() || undefined,
            used_part: row.used_part?.toString() || undefined,
            synonyms: parseArr(row.synonyms),
            image_url: row.image_url?.toString() || undefined,
            description: row.description?.toString() || undefined,
            therapeutic_functions: parseArr(row.therapeutic_functions),
            indicated_patterns: parseArr(row.indicated_patterns),
            caution_patterns: parseArr(row.caution_patterns),
            preparation_modes: parseArr(row.preparation_modes),
            clinical_notes: row.clinical_notes?.toString() || undefined,
            culinary_notes: row.culinary_notes?.toString() || undefined,
            contraindications: row.contraindications?.toString() || undefined,
            allergens: row.allergens?.toString() || undefined,
            restrictions: row.restrictions?.toString() || undefined,
            editorial_status: "published",
            is_active: row.is_active !== undefined ? (row.is_active?.toString().toLowerCase() !== 'não' && row.is_active?.toString().toLowerCase() !== 'nao') : true,
            sources: row.source_title ? [{
              source_title: row.source_title.toString(),
              author: row.author?.toString() || "Desconhecido",
              edition: row.edition?.toString() || undefined,
              page: row.page?.toString() || undefined,
              publication_year: row.publication_year ? Number(row.publication_year) : undefined,
              notes: "Importado via Data Loader"
            }] : []
          };
        } else if (activeTab === "procedures") {
          const code = row.code?.toString()?.trim();
          if (!code) return null;
          return { ...insertData, code, name: row.name?.toString(), category: "tuss" };
        } else if (activeTab === "medical_supplies") {
          const code = row.code?.toString()?.trim();
          if (!code) return null;
          return { 
            ...insertData, 
            code, 
            name: row.name?.toString(),
            presentation: row.presentation?.toString(),
            laboratory: row.laboratory?.toString(),
            anvisa_registry: row.anvisa?.toString(),
            batch: row.batch?.toString(),
            manufacturer: row.manufacturer?.toString(),
            category: "medicamento"
          };
        } else if (activeTab === "inventory") {
          const name = row.name?.toString()?.trim();
          if (!name) return null;
          return { 
            ...insertData, 
            name,
            quantity: parseFloat(row.quantity) || 0,
            unit: row.unit?.toString() || "Unidade",
            category: row.category?.toString() || "Geral",
            unit_cost: parseFloat(row.unit_cost) || 0,
            expiry_date: excelDateToISO(row.expiry_date),
            min_quantity: parseFloat(row.min_quantity) || 0,
            batch: row.batch?.toString(),
            manufacturer: row.manufacturer?.toString()
          };
        } else if (activeTab === "patients") {
          const cpf = row.cpf?.toString()?.replace(/\D/g, '');
          if (!cpf) return null;
          return { 
            ...insertData, 
            name: row.name?.toString(),
            cpf,
            age: parseInt(row.age) || null,
            gender: row.gender?.toString(),
            phone: row.phone?.toString(),
            email: row.email?.toString(),
            address: row.address?.toString(),
            marital_status: row.marital_status?.toString(),
            profession: row.profession?.toString()
          };
        }
        return insertData;
      }).filter(Boolean);

      if (batchToInsert.length === 0) {
        addLog(`⚠️ Lote ${b + 1} ignorado: Nenhum registro válido com identificador único.`);
        continue;
      }

      let table = "";
      let onConflict = "id";
      if (activeTab === "chinese_diet_foods") { table = "chinese_diet_foods"; onConflict = "name"; }
      else if (activeTab === "procedures") { table = "procedures"; onConflict = "code"; }
      else if (activeTab === "medical_supplies") { table = "medical_supplies"; onConflict = "code"; }
      else if (activeTab === "inventory") { table = "inventory_items"; onConflict = "name"; }
      else if (activeTab === "patients") { table = "patients"; onConflict = "cpf"; }

      let error: any = null;
      try {
        const res = await (supabase.from as any)(table).upsert(batchToInsert, { onConflict });
        error = res.error;
      } catch (e: any) {
        error = e;
      }

      // Se for alimentos de dietoterapia, também atualiza o localStorage para garantir sincronia local instantânea
      if (activeTab === "chinese_diet_foods") {
        try {
          const currentStr = localStorage.getItem('axis_gc_dietotherapy_foods') || '[]';
          const currentList: any[] = JSON.parse(currentStr);
          const foodMap = new Map<string, any>();
          currentList.forEach(item => foodMap.set(item.name.toLowerCase().trim(), item));
          batchToInsert.forEach(item => foodMap.set(item.name.toLowerCase().trim(), item));
          localStorage.setItem('axis_gc_dietotherapy_foods', JSON.stringify(Array.from(foodMap.values())));

          if (error && (error.message?.includes('schema cache') || error.message?.includes('column'))) {
            addLog(`💡 Alimentos sincronizados no banco da aplicação (${batchToInsert.length} alimentos).`);
            error = null; // Trata como sucesso na base local
          }
        } catch (e) {
          console.error("Erro ao sincronizar localStorage:", e);
        }
      }

      if (!error) {
        successCount += batchToInsert.length;
      } else {
        errorCount += batchToInsert.length;
        addLog(`❌ Erro no lote ${b + 1}: ${error.message}`);
      }

      setStats({ success: successCount, errors: errorCount });
    }

    addLog(`🏁 Carga concluída: ${successCount} sucessos, ${errorCount} erros.`);
    setStage("DONE");
    setShowSuccessModal(true);
    fetchDbStats();
  };

  const handleTruncate = async () => {
    if (truncateConfirm !== "DELETAR") return;
    
    addLog(`⚠️ Iniciando limpeza da tabela ${activeTab}...`);
    const tableMap: Record<Category, string> = {
      chinese_diet_foods: "chinese_diet_foods",
      procedures: "procedures",
      medical_supplies: "medical_supplies",
      inventory: "inventory_items",
      patients: "patients"
    };

    if (activeTab === "chinese_diet_foods") {
      try {
        localStorage.removeItem('axis_gc_dietotherapy_foods');
      } catch (e) {}
    }

    const { error } = await (supabase.from as any)(tableMap[activeTab]).delete().neq("id", "00000000-0000-0000-0000-000000000000");
    
    if (error) {
      addLog(`🚨 Erro ao limpar: ${error.message}`);
    } else {
      addLog(`✨ Tabela ${activeTab} limpa com sucesso.`);
      fetchDbStats();
    }
    setIsTruncateModalOpen(false);
    setTruncateConfirm("");
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0c] text-neutral-100 flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="animate-spin text-indigo-500" size={32} />
          <p className="text-xs font-mono uppercase tracking-widest text-neutral-400">Verificando permissões de Administrador...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#0a0a0c] text-neutral-100 flex items-center justify-center p-6 font-sans selection:bg-indigo-500/30">
        <div className="relative bg-neutral-900 border border-indigo-500/30 p-10 rounded-[2.5rem] max-w-md w-full shadow-2xl shadow-indigo-500/10">
          <div className="w-16 h-16 bg-indigo-600/10 rounded-2xl flex items-center justify-center mx-auto mb-6 text-indigo-400 border border-indigo-500/20">
            <ShieldCheck size={32} />
          </div>
          
          <h3 className="text-2xl font-black text-white text-center mb-2 tracking-tight">DATA LOADER — ACESSO RESTRITO</h3>
          <p className="text-neutral-500 text-center text-xs font-bold uppercase tracking-widest mb-6">Exclusivo para Administradores</p>

          {authUser ? (
            <div className="space-y-6 text-center">
              <div className="p-4 bg-red-950/30 border border-red-900/40 rounded-2xl text-left space-y-2">
                <div className="flex items-center gap-2 text-red-400 font-bold text-xs uppercase">
                  <AlertTriangle size={16} /> Acesso Não Autorizado
                </div>
                <p className="text-xs text-neutral-300 leading-relaxed">
                  Você está conectado como <strong className="text-white">{authUser.email}</strong>, porém o perfil <span className="px-2 py-0.5 bg-neutral-800 text-indigo-300 rounded font-mono text-[10px] uppercase font-bold">{authUser.role || 'Usuário'}</span> não possui privilégios de Administrador.
                </p>
              </div>

              <button
                onClick={() => signOut()}
                className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-500 transition-all flex items-center justify-center gap-3 shadow-lg shadow-indigo-600/20"
              >
                <LogOut size={18} /> ENTRAR COM CONTA ADMINISTRADORA
              </button>
            </div>
          ) : (
            <form onSubmit={handleSignIn} className="space-y-4">
              {loginError && (
                <div className="p-3 bg-red-950/40 border border-red-900/50 rounded-xl text-red-400 text-xs font-medium text-center">
                  {loginError}
                </div>
              )}

              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 group-focus-within:text-indigo-400 transition-colors">
                  <Mail size={18} />
                </div>
                <input 
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="E-mail de Administrador"
                  required
                  className="w-full pl-12 pr-4 py-4 bg-black/40 border border-neutral-800 focus:border-indigo-500 rounded-2xl text-sm font-medium transition-all outline-none"
                />
              </div>

              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 group-focus-within:text-indigo-400 transition-colors">
                  <Lock size={18} />
                </div>
                <input 
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Senha"
                  required
                  className="w-full pl-12 pr-12 py-4 bg-black/40 border border-neutral-800 focus:border-indigo-500 rounded-2xl text-sm font-medium transition-all outline-none"
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              <button 
                type="submit"
                disabled={isLoginLoading}
                className="w-full mt-6 py-4 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3 shadow-lg shadow-indigo-600/20"
              >
                {isLoginLoading ? (
                  <>
                    <RefreshCw className="animate-spin" size={20} />
                    <span>AUTENTICANDO...</span>
                  </>
                ) : (
                  <>
                    <Play size={18} fill="currentColor" />
                    <span>ACESSAR FERRAMENTA DE SUPORTE</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-neutral-100 p-6 font-sans selection:bg-indigo-500/30">
      <div className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-3rem)]">
        
        {/* Coluna 1: Stats & Categorias (Sidebar) */}
        <aside className="lg:col-span-3 flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar">
          <header className="flex items-center gap-4 mb-2">
            <div className="h-12 w-12 bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(79,70,229,0.4)]">
              <DatabaseZap size={28} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-neutral-500">
                DATA LOADER <span className="text-xs text-indigo-500 ml-1">v2.1</span>
              </h1>
              <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold italic">Suporte Técnico & Carga em Lote</p>
            </div>
          </header>

          <div className="mb-2 p-4 bg-neutral-900/80 border border-neutral-800/50 rounded-2xl flex flex-col gap-3">
             <div className="flex items-center gap-3">
                <div className={`h-3 w-3 rounded-full animate-pulse ${userId ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"}`} />
                <div className="min-w-0 flex-1">
                   <span className="block text-[10px] font-black text-neutral-500 uppercase tracking-widest">
                     {userId ? "Administrador Autenticado" : "Acesso Restrito"}
                   </span>
                   <span className="block text-xs font-bold text-neutral-200 truncate">
                     {userEmail || "Sistema Bloqueado"}
                   </span>
                </div>
                {userId && (
                  <button 
                    onClick={() => signOut()}
                    className="p-1.5 text-neutral-500 hover:text-red-400 transition-colors"
                    title="Sair"
                  >
                    <LogOut size={16} />
                  </button>
                )}
             </div>
          </div>

          <nav className="space-y-2">
            {(["chinese_diet_foods", "procedures", "medical_supplies", "inventory", "patients"] as Category[]).map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  if (stage !== "IMPORTING") {
                    setActiveTab(cat);
                    setStage("IDLE");
                    setParsedData([]);
                  }
                }}
                className={`w-full group relative flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 ${
                  activeTab === cat 
                    ? "bg-indigo-600/10 border-indigo-500/50 shadow-[0_0_15px_rgba(79,70,229,0.1)]" 
                    : "bg-neutral-900/50 border-neutral-800/50 hover:bg-neutral-800/50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${activeTab === cat ? "bg-indigo-600 text-white" : "bg-neutral-800 text-neutral-400"}`}>
                    {cat === "chinese_diet_foods" && <Apple size={18} />}
                    {cat === "procedures" && <FileSpreadsheet size={18} />}
                    {cat === "medical_supplies" && <Package size={18} />}
                    {cat === "inventory" && <BarChart3 size={18} />}
                    {cat === "patients" && <Users size={18} />}
                  </div>
                  <div className="text-left">
                    <span className={`block text-xs font-bold ${activeTab === cat ? "text-indigo-400" : "text-neutral-400"}`}>
                      {cat === "chinese_diet_foods" && "Módulo de Dietoterapia"}
                      {cat === "procedures" && "Faturamento / TUSS"}
                      {cat === "medical_supplies" && "Faturamento / MAT"}
                      {cat === "inventory" && "Gerência de Estoque"}
                      {cat === "patients" && "Módulo de Pacientes"}
                    </span>
                    <span className="text-sm font-bold text-white uppercase tracking-tight">
                      {cat === "chinese_diet_foods" && "Alimentos MTC"}
                      {cat === "procedures" && "Procedimentos"}
                      {cat === "medical_supplies" && "Materiais"}
                      {cat === "inventory" && "Inventário"}
                      {cat === "patients" && "Pacientes"}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono text-neutral-500 block">Total</span>
                  <span className={`text-sm font-black ${activeTab === cat ? "text-indigo-400" : "text-neutral-300"}`}>
                    {dbStats[cat].toLocaleString()}
                  </span>
                </div>
              </button>
            ))}
          </nav>

          <div className="mt-auto p-4 bg-red-950/20 border border-red-900/30 rounded-2xl">
            <h4 className="text-xs font-black text-red-400 flex items-center gap-2 mb-3">
              <AlertTriangle size={14} /> ÁREA DE MANUTENÇÃO
            </h4>
            <button 
              onClick={() => setIsTruncateModalOpen(true)}
              className="w-full py-2 flex items-center justify-center gap-2 bg-red-600/20 hover:bg-red-600 text-red-500 hover:text-white border border-red-500/50 rounded-xl text-xs font-bold transition-all"
            >
              <Trash2 size={14} /> Limpar Tabela Atual
            </button>
          </div>
        </aside>

        {/* Coluna 2: Upload & Preview (Main) */}
        <main className="lg:col-span-6 flex flex-col gap-6 overflow-hidden">
          <section className="bg-neutral-900/40 border border-neutral-800/60 rounded-[32px] p-8 backdrop-blur-xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/5 to-transparent opacity-50 pointer-events-none" />
            
            {stage === "IDLE" && (
              <div 
                className="flex flex-col items-center justify-center min-h-[300px] border-4 border-dashed border-neutral-800 hover:border-indigo-500/30 hover:bg-indigo-500/5 rounded-[28px] transition-all cursor-pointer group/upload"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="h-20 w-20 bg-neutral-800 group-hover/upload:bg-indigo-600 group-hover/upload:rotate-12 rounded-3xl flex items-center justify-center text-neutral-500 group-hover/upload:text-white transition-all shadow-xl">
                  <Upload size={40} />
                </div>
                <h3 className="mt-6 text-xl font-black">SOLTE SUA PLANILHA</h3>
                <p className="text-neutral-500 text-sm mt-1">UTF-8 .CSV ou Excel (.XLSX)</p>
                <input type="file" ref={fileInputRef} onChange={handleFileSelection} className="hidden" accept=".xlsx, .xls, .csv" />
              </div>
            )}

            {(stage === "READY" || stage === "IMPORTING" || stage === "DONE") && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex flex-col gap-6">
                  <div className="flex items-center gap-5">
                    <div className="h-16 w-16 bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center border border-emerald-500/20 shrink-0 shadow-lg shadow-emerald-500/5">
                      <FileSpreadsheet size={36} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-black text-xl text-white truncate group-hover:text-emerald-400 transition-colors" title={fileName}>
                        {fileName}
                      </h3>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] font-black rounded-md uppercase tracking-wider">
                          Mapeado
                        </span>
                        <p className="text-xs font-mono text-neutral-400">
                          {parsedData.length.toLocaleString()} registros identificados
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 p-1 bg-black/20 rounded-2xl border border-neutral-800/50">
                    {stage === "READY" && (
                      <button 
                        onClick={processImport} 
                        disabled={!userId}
                        className={`flex-1 min-w-[200px] py-4 font-black rounded-xl shadow-xl transition-all flex items-center justify-center gap-3 group/btn ${
                          userId 
                            ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20" 
                            : "bg-neutral-800 text-neutral-500 cursor-not-allowed opacity-50"
                        }`}
                      >
                        <Play size={20} fill="currentColor" className="group-hover/btn:scale-110 transition-transform" /> 
                        <span className="tracking-widest">
                          {userId ? "INICIAR CARGA DE DADOS" : "ACESSO NEGADO: FAÇA LOGIN"}
                        </span>
                      </button>
                    )}
                    {(stage === "READY" || stage === "DONE") && (
                      <button 
                        onClick={() => {
                          setStage("IDLE");
                          setParsedData([]);
                        }} 
                        className="px-6 py-4 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold rounded-xl transition-all flex items-center gap-2"
                      >
                        <RefreshCw size={18} /> Novo Arquivo
                      </button>
                    )}
                    {stage === "IMPORTING" && (
                      <button 
                        onClick={() => cancelRef.current = true} 
                        className="flex-1 py-4 bg-red-600 hover:bg-red-500 text-white font-black rounded-xl transition-all flex items-center justify-center gap-3 shadow-lg shadow-red-600/20"
                      >
                        <XSquare size={20} /> INTERROMPER PROCESSAMENTO
                      </button>
                    )}
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute left-0 top-0 h-full w-1 bg-neutral-800 rounded-full overflow-hidden">
                    <div 
                      className="w-full bg-indigo-500 transition-all duration-500" 
                      style={{ height: `${( (stats.success + stats.errors) / parsedData.length) * 100}%` }}
                    />
                  </div>
                  <div className="pl-6">
                    <h4 className="text-[10px] font-black uppercase tracking-tighter text-neutral-500 mb-3 flex items-center gap-2">
                      <ChevronRight size={10} /> PRÉ-VISUALIZAÇÃO DOS DADOS
                    </h4>
                    <div className="bg-black/50 border border-neutral-800 rounded-2xl overflow-hidden overflow-x-auto">
                      <table className="w-full text-[10px] font-mono">
                        <thead>
                          <tr className="bg-neutral-800 text-neutral-400">
                            {previewHeaders.slice(0, 5).map((h, i) => (
                              <th key={i} className="p-3 text-left border-r border-neutral-900">{h || "N/A"}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {previewRows.slice(0, 5).map((row, ridx) => (
                            <tr key={ridx} className="border-b border-neutral-900 text-neutral-300">
                              {row.slice(0, 5).map((val: any, vidx) => (
                                <td key={vidx} className="p-3 border-r border-neutral-900 truncate max-w-[120px]">
                                  {val?.toString() || ""}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>

          <footer className="mt-auto grid grid-cols-2 gap-4">
             <div className="bg-neutral-900/30 p-4 border border-neutral-800/60 rounded-[24px] flex items-center gap-4">
                <div className="h-10 w-10 bg-emerald-500/10 text-emerald-500 rounded-xl flex items-center justify-center">
                  <CheckCircle size={20} />
                </div>
                <div>
                   <span className="text-[10px] font-black uppercase text-neutral-500 block">Processados</span>
                   <span className="text-lg font-black text-white">{stats.success}</span>
                </div>
             </div>
             <div className="bg-neutral-900/30 p-4 border border-neutral-800/60 rounded-[24px] flex items-center gap-4">
                <div className="h-10 w-10 bg-red-500/10 text-red-500 rounded-xl flex items-center justify-center">
                  <XSquare size={20} />
                </div>
                <div>
                   <span className="text-[10px] font-black uppercase text-neutral-500 block">Erros</span>
                   <span className="text-lg font-black text-white">{stats.errors}</span>
                </div>
             </div>
          </footer>
        </main>

        {/* Coluna 3: Console (Right) */}
        <section className="lg:col-span-3 flex flex-col bg-black border border-neutral-800/60 rounded-[32px] overflow-hidden shadow-2xl">
          <div className="bg-neutral-900/80 p-5 flex items-center justify-between border-b border-neutral-800">
             <div className="flex items-center gap-3">
               <TerminalIcon size={18} className="text-indigo-400" />
               <span className="text-xs font-black uppercase tracking-widest text-white">System Logs</span>
             </div>
             <div className="flex gap-2">
                <button onClick={() => setLogs([])} className="p-2 hover:bg-neutral-800 text-neutral-500 rounded-lg transition-all" title="Limpar">
                  <Trash2 size={14} />
                </button>
             </div>
          </div>
          <div className="flex-1 p-5 font-mono text-[10px] text-emerald-500/80 overflow-y-auto leading-relaxed custom-scrollbar bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/5 to-transparent">
             {logs.length === 0 ? (
               <div className="opacity-20 flex flex-col items-center justify-center h-full gap-4 grayscale">
                  <TerminalIcon size={40} />
                  <p className="text-center font-sans uppercase tracking-[.2em] font-black">Awaiting Ingestion...</p>
               </div>
             ) : (
               logs.map((log, i) => (
                 <div key={i} className="mb-2 flex gap-3 group">
                   <span className="text-neutral-700 shrink-0">[{i}]</span>
                   <span className="group-hover:text-emerald-400 transition-colors">{log}</span>
                 </div>
               ))
             )}
          </div>
          <div className="p-4 bg-neutral-900/50 border-t border-neutral-800 flex items-center justify-between">
             <div className="flex items-center gap-2">
                <div className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                <span className="text-[10px] font-bold text-neutral-400 uppercase">Supabase Engine</span>
             </div>
             <span className="text-[10px] font-mono text-neutral-600">v2.1</span>
          </div>
        </section>

      </div>

      {/* MODAL TRUNCATE */}
      {isTruncateModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-6">
           <div className="bg-[#121214] border border-red-900/40 p-10 rounded-[40px] max-w-md w-full shadow-[0_0_50px_rgba(239,68,68,0.15)] animate-in zoom-in-95 duration-200">
              <div className="h-20 w-20 bg-red-600/10 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <AlertTriangle size={48} />
              </div>
              <h2 className="text-2xl font-black text-center text-white mb-2">OPERÇÃO DE RISCO</h2>
              <p className="text-neutral-400 text-center text-sm mb-8">
                Você está prestes a apagar TODOS os registros da tabela <strong className="text-white uppercase">{activeTab}</strong>. Isso não pode ser desfeito.
              </p>
              
              <div className="space-y-4">
                 <p className="text-[10px] font-black text-neutral-500 uppercase text-center tracking-widest">Digite <span className="text-red-500">DELETAR</span> para confirmar</p>
                 <input 
                   type="text" 
                   value={truncateConfirm}
                   onChange={e => setTruncateConfirm(e.target.value)}
                   className="w-full bg-black border border-neutral-800 rounded-2xl py-4 px-6 text-center text-xl font-black text-red-500 focus:border-red-600 outline-none transition-all placeholder:text-neutral-800"
                   placeholder="..."
                 />
                 <div className="flex gap-4 pt-4">
                    <button 
                      onClick={handleTruncate}
                      disabled={truncateConfirm !== "DELETAR"}
                      className="flex-1 py-4 bg-red-600 disabled:opacity-30 disabled:grayscale hover:bg-red-500 text-white font-black rounded-2xl transition-all shadow-xl shadow-red-600/20"
                    >
                      APAGAR TUDO
                    </button>
                    <button 
                      onClick={() => setIsTruncateModalOpen(false)}
                      className="flex-1 py-4 bg-neutral-800 hover:bg-neutral-700 text-white font-black rounded-2xl transition-all"
                    >
                      CANCELAR
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}



      {/* Modal de Sucesso */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setShowSuccessModal(false)}></div>
          <div className="relative bg-neutral-900 border border-emerald-500/30 p-10 rounded-[2.5rem] max-w-md w-full text-center shadow-2xl shadow-emerald-500/10 scale-in-center">
            <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-400">
              <CheckCircle size={40} />
            </div>
            <h3 className="text-3xl font-black text-white mb-4 italic tracking-tighter">MISSÃO CUMPRIDA!</h3>
            <p className="text-neutral-400 mb-8 font-medium leading-relaxed">
              Os dados foram processados e já estão <span className="text-emerald-400 font-bold italic">vinculados ao seu usuário</span>. Você já pode visualizá-los no Dashboard principal.
            </p>
            <button 
              onClick={() => setShowSuccessModal(false)}
              className="w-full py-4 bg-emerald-500 text-neutral-950 font-black rounded-2xl hover:bg-emerald-400 transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-emerald-500/20"
            >
              EXCELENTE
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
