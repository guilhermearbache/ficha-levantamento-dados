import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, onSnapshot, query, addDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Plus, Trash2, Database, ShieldCheck, Info, FileText, Download, Save, List, FolderPlus, Loader2 } from 'lucide-react';

// Firebase configuration from environment
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'data-project-survey-app';

const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [activeProjectId, setActiveProjectId] = useState(null);
  
  // Form State
  const [temaCentral, setTemaCentral] = useState('');
  const [acessoRows, setAcessoRows] = useState([{ id: 1, variavel: '', problema: '', detalhe: '' }]);
  const [qualidadeRows, setQualidadeRows] = useState([{ id: 1, variavel: '', problema: '', detalhe: '' }]);
  const [isSaving, setIsSaving] = useState(false);

  const acessoOpcoes = [
    "Indisponibilidade de Origem (Dados não capturados)",
    "Necessidade de Solicitação Personalizada (TI/DBA)",
    "Dificuldade de Extração (Latência/Volume excessivo)",
    "Restrição de Acesso/Segurança (LGPD/Compliance)",
    "API/Interface Inexistente ou Instável",
    "Dependência de Processamento Manual/Terceiros"
  ];

  const qualidadeOpcoes = [
    "Inconsistência Inter-sistemas (Discrepância entre fontes)",
    "Violação de Domínio (Dados fora da faixa esperada)",
    "Baixa Completitude (Presença excessiva de nulos/vazios)",
    "Inconformidade de Formato (Sujidade/Falta de padrão)",
    "Anacronismo (Dados obsoletos/fora de tempo)",
    "Redundância ou Duplicidade de Registros"
  ];

  // 1. Authentication
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Auth error:", error);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. Fetch Projects
  useEffect(() => {
    if (!user) return;
    const q = collection(db, 'artifacts', appId, 'public', 'data', 'projects');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const projs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProjects(projs);
    }, (err) => console.error("Firestore error:", err));
    return () => unsubscribe();
  }, [user]);

  const resetForm = () => {
    setActiveProjectId(null);
    setTemaCentral('');
    setAcessoRows([{ id: Date.now(), variavel: '', problema: '', detalhe: '' }]);
    setQualidadeRows([{ id: Date.now() + 1, variavel: '', problema: '', detalhe: '' }]);
  };

  const loadProject = (proj) => {
    setActiveProjectId(proj.id);
    setTemaCentral(proj.temaCentral || '');
    setAcessoRows(proj.acessoRows || []);
    setQualidadeRows(proj.qualidadeRows || []);
  };

  const saveProject = async () => {
    if (!user || !temaCentral.trim()) return;
    setIsSaving(true);
    try {
      const projectData = {
        temaCentral,
        acessoRows,
        qualidadeRows,
        updatedAt: serverTimestamp(),
        author: user.uid
      };

      if (activeProjectId) {
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'projects', activeProjectId), projectData);
      } else {
        const docRef = await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'projects'), projectData);
        setActiveProjectId(docRef.id);
      }
    } catch (error) {
      console.error("Save error:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const deleteProject = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("Deseja excluir este levantamento?")) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'projects', id));
      if (activeProjectId === id) resetForm();
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  const addRow = (type) => {
    const newRow = { id: Date.now(), variavel: '', problema: '', detalhe: '' };
    if (type === 'acesso') setAcessoRows([...acessoRows, newRow]);
    else setQualidadeRows([...qualidadeRows, newRow]);
  };

  const removeRow = (type, id) => {
    if (type === 'acesso') setAcessoRows(acessoRows.filter(r => r.id !== id));
    else setQualidadeRows(qualidadeRows.filter(r => r.id !== id));
  };

  const updateRow = (type, id, field, value) => {
    const setter = type === 'acesso' ? setAcessoRows : setQualidadeRows;
    const rows = type === 'acesso' ? acessoRows : qualidadeRows;
    setter(rows.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-blue-600" /></div>;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans">
      
      {/* SIDEBAR: PROJETOS SALVOS */}
      <aside className="w-full md:w-64 bg-slate-900 text-white p-4 flex flex-col gap-4 non-printable">
        <div className="flex items-center gap-2 px-2 py-4 border-b border-slate-700">
          <Database className="text-blue-400" size={20} />
          <h1 className="font-bold text-sm tracking-tight">DATA GOVERNANCE</h1>
        </div>
        
        <button 
          onClick={resetForm}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 transition-colors p-3 rounded-lg text-sm font-bold w-full shadow-lg"
        >
          <FolderPlus size={18} /> Novo Levantamento
        </button>

        <div className="mt-4 space-y-2 overflow-y-auto flex-1">
          <h3 className="text-[10px] uppercase text-slate-500 font-bold px-2 tracking-widest">Projetos Salvos</h3>
          {projects.length === 0 && <p className="text-xs text-slate-600 px-2 italic">Nenhum projeto ainda.</p>}
          {projects.map((proj) => (
            <div 
              key={proj.id}
              onClick={() => loadProject(proj)}
              className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all border ${activeProjectId === proj.id ? 'bg-slate-800 border-blue-500' : 'bg-transparent border-transparent hover:bg-slate-800'}`}
            >
              <div className="flex flex-col gap-1 overflow-hidden">
                <span className="text-xs font-medium truncate uppercase">{proj.temaCentral || 'Sem Título'}</span>
                <span className="text-[9px] text-slate-500">
                  {proj.updatedAt?.toDate?.() ? new Date(proj.updatedAt.toDate()).toLocaleDateString() : 'Agora'}
                </span>
              </div>
              <button onClick={(e) => deleteProject(proj.id, e)} className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 p-1">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>

        <div className="pt-4 border-t border-slate-700 text-[10px] text-slate-500">
          ID Usuário: {user?.uid.substring(0, 8)}...
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto space-y-6">
        
        {/* TOP ACTIONS */}
        <div className="flex justify-end gap-3 non-printable">
          <button 
            onClick={saveProject}
            disabled={isSaving || !temaCentral}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${isSaving ? 'bg-slate-200 text-slate-400' : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-md'}`}
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} 
            {activeProjectId ? 'Atualizar Projeto' : 'Salvar Projeto'}
          </button>
          <button 
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-700 transition-all shadow-md"
          >
            <Download size={16} /> Exportar PDF
          </button>
        </div>

        {/* HEADER / TEMA CENTRAL */}
        <Card className="border-t-8 border-t-blue-700 shadow-lg border-x-0 md:border-x">
          <CardHeader className="bg-white">
            <div className="flex items-center gap-3 mb-2 text-blue-700">
              <FileText size={24} />
              <span className="text-sm font-bold uppercase tracking-wider">Ficha de Levantamento Técnico</span>
            </div>
            <CardTitle className="text-slate-500 text-xs uppercase tracking-widest mb-1">Tema Central do Projeto</CardTitle>
            <input 
              type="text" 
              placeholder="DIGITE O NOME DO PROJETO AQUI..."
              className="w-full text-2xl md:text-3xl font-black text-slate-800 border-none focus:ring-0 placeholder:text-slate-200 uppercase"
              value={temaCentral}
              onChange={(e) => setTemaCentral(e.target.value)}
            />
          </CardHeader>
        </Card>

        {/* EIXO: ACESSO AOS DADOS */}
        <Card className="shadow-md overflow-hidden border-x-0 md:border-x">
          <div className="bg-blue-600 p-4 flex justify-between items-center text-white">
            <div className="flex items-center gap-2">
              <Database size={20} />
              <h2 className="font-bold uppercase tracking-wide text-sm">Eixo: Acesso aos Dados</h2>
            </div>
            <button 
              onClick={() => addRow('acesso')}
              className="bg-white/20 hover:bg-white/30 p-1 rounded transition-colors non-printable"
            >
              <Plus size={18} />
            </button>
          </div>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-600 text-[10px] uppercase font-bold border-b border-slate-200">
                  <th className="p-4 w-1/4">Variáveis / Dados</th>
                  <th className="p-4 w-1/3">Desafios Encontrados</th>
                  <th className="p-4 w-1/3">Detalhamento Técnico</th>
                  <th className="p-4 w-10 non-printable"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {acessoRows.map((row) => (
                  <tr key={row.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="p-3">
                      <input 
                        className="w-full p-2 bg-transparent border rounded border-slate-200 text-sm"
                        placeholder="Ex: Tabela de Pedidos"
                        value={row.variavel}
                        onChange={(e) => updateRow('acesso', row.id, 'variavel', e.target.value)}
                      />
                    </td>
                    <td className="p-3">
                      <select 
                        className="w-full p-2 bg-white border rounded border-slate-200 text-sm"
                        value={row.problema}
                        onChange={(e) => updateRow('acesso', row.id, 'problema', e.target.value)}
                      >
                        <option value="">Selecione o problema...</option>
                        {acessoOpcoes.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    </td>
                    <td className="p-3">
                      <textarea 
                        className="w-full p-2 bg-transparent border rounded border-slate-200 text-sm h-10 resize-none"
                        placeholder="Descreva o impacto..."
                        value={row.detalhe}
                        onChange={(e) => updateRow('acesso', row.id, 'detalhe', e.target.value)}
                      />
                    </td>
                    <td className="p-3 non-printable">
                      <button onClick={() => removeRow('acesso', row.id)} className="text-slate-300 hover:text-red-500">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* EIXO: QUALIDADE DOS DADOS */}
        <Card className="shadow-md overflow-hidden border-x-0 md:border-x">
          <div className="bg-emerald-600 p-4 flex justify-between items-center text-white">
            <div className="flex items-center gap-2">
              <ShieldCheck size={20} />
              <h2 className="font-bold uppercase tracking-wide text-sm">Eixo: Qualidade dos Dados</h2>
            </div>
            <button 
              onClick={() => addRow('qualidade')}
              className="bg-white/20 hover:bg-white/30 p-1 rounded transition-colors non-printable"
            >
              <Plus size={18} />
            </button>
          </div>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-600 text-[10px] uppercase font-bold border-b border-slate-200">
                  <th className="p-4 w-1/4">Variáveis / Dados</th>
                  <th className="p-4 w-1/3">Gargalo de Governança</th>
                  <th className="p-4 w-1/3">Descrição (Data Quality)</th>
                  <th className="p-4 w-10 non-printable"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {qualidadeRows.map((row) => (
                  <tr key={row.id} className="hover:bg-emerald-50/30 transition-colors">
                    <td className="p-3">
                      <input 
                        className="w-full p-2 bg-transparent border rounded border-slate-200 text-sm"
                        placeholder="Ex: CPF/CNPJ"
                        value={row.variavel}
                        onChange={(e) => updateRow('qualidade', row.id, 'variavel', e.target.value)}
                      />
                    </td>
                    <td className="p-3">
                      <select 
                        className="w-full p-2 bg-white border rounded border-slate-200 text-sm"
                        value={row.problema}
                        onChange={(e) => updateRow('qualidade', row.id, 'problema', e.target.value)}
                      >
                        <option value="">Selecione a falha...</option>
                        {qualidadeOpcoes.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    </td>
                    <td className="p-3">
                      <textarea 
                        className="w-full p-2 bg-transparent border rounded border-slate-200 text-sm h-10 resize-none"
                        placeholder="Explique a falha..."
                        value={row.detalhe}
                        onChange={(e) => updateRow('qualidade', row.id, 'detalhe', e.target.value)}
                      />
                    </td>
                    <td className="p-3 non-printable">
                      <button onClick={() => removeRow('qualidade', row.id)} className="text-slate-300 hover:text-red-500">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* FOOTER INFO */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between text-slate-400 text-[10px] italic bg-white p-4 rounded-lg shadow-sm border border-slate-200">
          <div className="flex items-center gap-2">
            <Info size={14} />
            <span>Padrão DAMA-DMBOK para diagnósticos de maturidade de dados.</span>
          </div>
          <div className="flex items-center gap-4 not-italic">
            <span className="font-bold text-slate-500 tracking-tighter uppercase">ID de Sessão: {appId}</span>
          </div>
        </div>
      </main>

      <style>{`
        @media print {
          .non-printable { display: none !important; }
          body { background-color: white; padding: 0; }
          main { padding: 0; }
          .max-w-5xl { max-width: 100%; width: 100%; }
          aside { display: none; }
          .shadow-lg, .shadow-md { shadow: none; border: 1px solid #e2e8f0; }
        }
      `}</style>
    </div>
  );
};

export default App;
