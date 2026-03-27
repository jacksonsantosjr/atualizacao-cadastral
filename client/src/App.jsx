import { useState, useRef, useCallback, useEffect } from 'react';
import { 
  Upload, FileSpreadsheet, Play, Pause, Square, Download, 
  Sun, Moon, Settings, Activity, CheckCircle2, XCircle, 
  Clock, AlertCircle, Database, ChevronDown, RefreshCcw, Info, ListChecks, LogOut
} from 'lucide-react';
import Hero from './components/Hero';
import './index.css';

const API_BASE = 'http://localhost:3001/api';

const AVAILABLE_FIELDS = [
  { id: 'cnpj', label: 'CNPJ', category: 'Básico', default: true, disabled: true },
  { id: 'nome', label: 'Razão Social', category: 'Básico', default: true },
  { id: 'fantasia', label: 'Nome Fantasia', category: 'Básico', default: true },
  { id: 'abertura', label: 'Data de Abertura', category: 'Básico' },
  { id: 'tipo', label: 'Matriz/Filial', category: 'Básico' },
  
  { id: 'situacao', label: 'Situação Cadastral', category: 'Situação', default: true },
  { id: 'data_situacao', label: 'Data da Situação', category: 'Situação' },
  { id: 'motivo_situacao', label: 'Motivo da Situação', category: 'Situação' },
  
  { id: 'logradouro_tipo', label: 'Tipo de Logradouro', category: 'Endereço', default: true },
  { id: 'logradouro', label: 'Logradouro', category: 'Endereço', default: true },
  { id: 'numero', label: 'Número', category: 'Endereço', default: true },
  { id: 'complemento', label: 'Complemento', category: 'Endereço' },
  { id: 'cep', label: 'CEP', category: 'Endereço', default: true },
  { id: 'bairro', label: 'Bairro', category: 'Endereço', default: true },
  { id: 'municipio', label: 'Município', category: 'Endereço', default: true },
  { id: 'uf', label: 'UF', category: 'Endereço', default: true },

  { id: 'email', label: 'E-mail', category: 'Contato' },
  { id: 'telefone', label: 'Telefone', category: 'Contato' },

  { id: 'cnae_principal_codigo', label: 'CNAE (Código)', category: 'Atividade' },
  { id: 'cnae_principal_descricao', label: 'CNAE (Descrição)', category: 'Atividade' },
  { id: 'natureza_juridica', label: 'Natureza Jurídica', category: 'Jurídico' },
  { id: 'capital_social', label: 'Capital Social', category: 'Jurídico' },
  { id: 'porte', label: 'Porte da Empresa', category: 'Jurídico' },
  { id: 'simples_optante', label: 'Optante Simples', category: 'Jurídico' },
  { id: 'mei_optante', label: 'Optante MEI', category: 'Jurídico' },
];

function Header({ theme, onToggleTheme, onLogout, showLogout }) {
  return (
    <header className="header">
      <div className="header-left">
        <div className="header-icon"><Database size={20} /></div>
        <div>
          <div className="header-title">Atualização de Cadastro</div>
          <div className="header-subtitle">Consulta em massa de CNPJs</div>
        </div>
      </div>
      <div className="header-right" style={{ display: 'flex', gap: '0.5rem' }}>
        {showLogout && (
          <button className="theme-toggle" onClick={onLogout} title="Sair">
            <LogOut size={18} />
          </button>
        )}
        <button className="theme-toggle" onClick={onToggleTheme}>
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>
      </div>
    </header>
  );
}

function FileUpload({ onFileUploaded, disabled, uploadedFileInfo }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  const handleFile = useCallback((selectedFile) => {
    setError(null);
    const ext = selectedFile.name.split('.').pop().toLowerCase();
    if (!['xlsx', 'xls'].includes(ext)) {
      setError('Formato inválido. Envie um arquivo .xlsx ou .xls');
      return;
    }
    setFile(selectedFile);
  }, []);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${API_BASE}/upload`, { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro no upload');
      onFileUploaded(data.sessionId, data.totalCnpjs, file.name);
    } catch (err) { setError(err.message); } 
    finally { setUploading(false); }
  };

  return (
    <div className={`section card fade-in ${disabled ? 'readonly' : ''}`}>
      <div className="card-header">
        <Upload size={18} className="card-header-icon" />
        <span className="card-title">Upload da Planilha</span>
      </div>
      <div className="card-body">
        {error && <div className="error-message"><AlertCircle size={16} />{error}</div>}
        
        {disabled && uploadedFileInfo ? (
          <div className="upload-zone has-file disabled">
            <div className="upload-icon"><CheckCircle2 size={40} /></div>
            <div className="upload-title">{uploadedFileInfo.name}</div>
            <div className="upload-file-info">✓ {uploadedFileInfo.total} CNPJs prontos para processar</div>
          </div>
        ) : (
          <>
            <div
              className={`upload-zone ${isDragOver ? 'drag-over' : ''} ${file ? 'has-file' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setIsDragOver(false); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); }}
              onClick={() => inputRef.current?.click()}
            >
              <div className="upload-icon">{file ? <CheckCircle2 size={40} /> : <FileSpreadsheet size={40} />}</div>
              <div className="upload-title">{file ? file.name : 'Arraste a planilha aqui ou clique para selecionar'}</div>
              <div className="upload-subtitle">{file ? `${(file.size / 1024).toFixed(1)} KB` : 'Suporta arquivos .xlsx e .xls'}</div>
              <input ref={inputRef} type="file" className="upload-input" accept=".xlsx,.xls" onChange={(e) => e.target.files[0] && handleFile(e.target.files[0])} />
            </div>
            {file && (
              <div className="action-bar" style={{ marginTop: '1.5rem' }}>
                <button className="btn btn-primary btn-lg btn-full" onClick={handleUpload} disabled={uploading}>
                  <Upload size={18} /> {uploading ? 'Enviando...' : 'Enviar Planilha'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function FieldSelector({ totalCnpjs, onStart, onCancel }) {
  const [selectedFields, setSelectedFields] = useState(
    AVAILABLE_FIELDS.filter(f => f.default).map(f => f.id)
  );
  const [delay, setDelay] = useState(500);
  const [batchSize, setBatchSize] = useState(10);

  const toggleField = (id) => {
    if (id === 'cnpj') return;
    setSelectedFields(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
  };

  const categories = [...new Set(AVAILABLE_FIELDS.map(f => f.category))];

  return (
    <div className="section card fade-in shadow-lg">
      <div className="card-header">
        <ListChecks size={18} className="card-header-icon" />
        <span className="card-title">Configurar Colunas e Processamento</span>
      </div>
      <div className="card-body">
        <div className="info-box" style={{ marginBottom: '1.5rem' }}>
          <Info size={16} />
          Selecione abaixo as informações desejadas para os {totalCnpjs.toLocaleString()} CNPJs.
        </div>

        <div className="fields-grid-container">
          {categories.map(cat => (
            <div key={cat} className="field-category">
              <h4 className="category-title">{cat}</h4>
              <div className="fields-list">
                {AVAILABLE_FIELDS.filter(f => f.category === cat).map(field => (
                  <label key={field.id} className={`field-checkbox ${selectedFields.includes(field.id) ? 'checked' : ''} ${field.disabled ? 'disabled' : ''}`}>
                    <input 
                      type="checkbox" 
                      checked={selectedFields.includes(field.id)} 
                      onChange={() => toggleField(field.id)}
                      disabled={field.disabled}
                    />
                    <span>{field.label}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="settings-grid" style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--color-border)' }}>
          <div className="setting-group">
            <label className="setting-label"><Clock size={14} /> Delay entre requisições</label>
            <div className="setting-input-row">
              <input type="range" className="setting-slider" min="200" max="5000" step="100" value={delay} onChange={(e) => setDelay(Number(e.target.value))} />
              <span className="setting-value">{delay}ms</span>
            </div>
          </div>
          <div className="setting-group">
            <label className="setting-label"><Settings size={14} /> Tamanho do lote</label>
            <div className="setting-input-row">
              <input type="range" className="setting-slider" min="1" max="50" step="1" value={batchSize} onChange={(e) => setBatchSize(Number(e.target.value))} />
              <span className="setting-value">{batchSize}</span>
            </div>
          </div>
        </div>

        <div className="action-bar" style={{ marginTop: '2rem', gap: '1rem' }}>
          <button className="btn btn-secondary" onClick={onCancel} style={{ flex: 1 }}>Reiniciar</button>
          <button className="btn btn-primary btn-lg" onClick={() => onStart(selectedFields, delay, batchSize)} style={{ flex: 2 }}>
            <Play size={18} /> Iniciar Processamento
          </button>
        </div>
      </div>
    </div>
  );
}

function Modal({ isOpen, title, message, onConfirm, onCancel, icon: Icon = AlertCircle }) {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay">
      <div className="modal-content fade-in">
        <div className="modal-title">
          <Icon className="text-warning" size={20} />
          {title}
        </div>
        <p className="modal-message">{message}</p>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onCancel}>Manter</button>
          <button className="btn btn-danger" onClick={onConfirm}>Sim, Cancelar</button>
        </div>
      </div>
    </div>
  );
}

function ProgressPanel({ sessionId, totalCnpjs, selectedFields, delay, batchSize, onComplete, onReset }) {
  const [progress, setProgress] = useState(null);
  const [status, setStatus] = useState('processing');
  const [logs, setLogs] = useState([]);
  const [errors, setErrors] = useState([]); // Lista detalhada de erros
  const [showCheckpoint, setShowCheckpoint] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isErrorModalOpen, setIsErrorModalOpen] = useState(false);
  const eventSourceRef = useRef(null);

  useEffect(() => {
    if (!sessionId) return;
    
    fetch(`${API_BASE}/start/${sessionId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ selectedFields, delay, batchSize })
    });

    const es = new EventSource(`${API_BASE}/progress/${sessionId}`);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'complete') {
        setStatus('completed');
        onComplete(data.stats);
        es.close();
      } else if (data.type === 'progress') {
        setProgress(data);
        if (data.current % 50 === 0) {
          setShowCheckpoint(true);
          setTimeout(() => setShowCheckpoint(false), 3000);
        }
        
        const lastResult = data.lastResult;
        if (lastResult.status === 'error') {
          setErrors(prev => [...prev, lastResult]);
        }
        
        setLogs(prev => [{ ...lastResult }, ...prev].slice(0, 50));
      }
    };
    return () => es.close();
  }, [sessionId]);

  const handlePause = () => { setStatus('paused'); fetch(`${API_BASE}/pause/${sessionId}`, { method: 'POST' }); };
  const handleResume = () => { setStatus('processing'); fetch(`${API_BASE}/resume/${sessionId}`, { method: 'POST' }); };
  
  const handleConfirmCancel = () => {
    setIsModalOpen(false);
    setStatus('cancelled');
    fetch(`${API_BASE}/cancel/${sessionId}`, { method: 'POST' });
    eventSourceRef.current?.close();
  };

  const handleCancelClick = () => {
    setIsModalOpen(true);
  };

  const handleRetryErrors = async () => {
    if (errors.length === 0) return;
    const cnpjsToRetry = errors.map(e => e.cnpj);
    try {
      const res = await fetch(`${API_BASE}/retry/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cnpjs: cnpjsToRetry })
      });
      if (res.ok) {
        setErrors([]); // Limpa a lista após re-tentar
        setIsErrorModalOpen(false);
        if (status === 'completed') setStatus('processing');
      }
    } catch (err) {
      console.error('Erro ao re-tentar:', err);
    }
  };

  const current = progress?.current || 0;
  const percentage = progress?.percentage || 0;

  return (
    <div className="section card fade-in">
      <div className="card-header">
        <Activity size={18} className="card-header-icon" />
        <span className="card-title">Processando Atualização</span>
        {showCheckpoint && <span className="checkpoint-badge fade-in"><Database size={12} /> Checkpoint Salvo</span>}
      </div>
      <div className="card-body">
        <div className="progress-stats">
          <div className="stat-card">
            <div className="stat-value accent">{current.toLocaleString()}</div>
            <div className="stat-label">Processados</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{totalCnpjs.toLocaleString()}</div>
            <div className="stat-label">Total</div>
          </div>
          <div className="stat-card success">
            <div className="stat-value">{(progress?.success || 0).toLocaleString()}</div>
            <div className="stat-label">Sucessos</div>
          </div>
          <div className="stat-card error clickable" onClick={() => setIsErrorModalOpen(true)}>
            <div className="stat-value">{(progress?.errors || 0).toLocaleString()}</div>
            <div className="stat-label">Erros</div>
          </div>
        </div>

        <div style={{ margin: '1.5rem 0' }}>
          <div className="progress-bar-header">
            <span className="progress-bar-label">{status === 'processing' ? 'Consultando APIs...' : (status === 'paused' ? 'Pausado' : 'Finalizando...')}</span>
            <span className="progress-bar-percentage">{percentage}%</span>
          </div>
          <div className="progress-container">
            <div className={`progress-bar ${status === 'cancelled' ? 'cancelled' : ''}`} style={{ width: `${percentage}%` }} />
          </div>
          {progress?.estimatedTimeRemaining && status === 'processing' && (
            <div className="progress-eta">
              ⏱ Estimado: {(() => {
                const s = progress.estimatedTimeRemaining;
                const h = Math.floor(s / 3600);
                const m = Math.floor((s % 3600) / 60);
                const secs = s % 60;
                return h > 0 ? `${h}h ${m}m ${secs}s` : `${m}m ${secs}s`;
              })()} restantes
            </div>
          )}
        </div>

        <div className="progress-controls">
          {status === 'processing' && (
            <><button className="btn btn-warning" onClick={handlePause}><Pause size={16} /> Pausar</button>
            <button className="btn btn-danger" onClick={handleCancelClick}><Square size={16} /> Cancelar</button></>
          )}
          {status === 'paused' && (
            <><button className="btn btn-primary" onClick={handleResume}><Play size={16} /> Retomar</button>
            <button className="btn btn-danger" onClick={handleCancelClick}><Square size={16} /> Cancelar</button></>
          )}
          {(status === 'cancelled' || status === 'completed') && (
            <div style={{ display: 'flex', gap: '1rem', width: '100%' }}>
              <button className="btn btn-secondary btn-full" onClick={onReset}><RefreshCcw size={16} /> Nova Consulta</button>
              <button className="btn btn-success btn-full" onClick={() => window.open(`${API_BASE}/download/${sessionId}`, '_blank')}>
                <Download size={16} /> Baixar Dados ({current})
              </button>
            </div>
          )}
        </div>

        {logs.length > 0 && (
          <div className="activity-log" style={{ marginTop: '1.5rem' }}>
            {logs.map((log, i) => (
              <div key={i} className="log-entry">
                <span className={`log-status ${log.status}`} />
                <span className="log-cnpj">{log.cnpj}</span>
                <span className="log-name">{log.nome}</span>
                <span className="log-api">via {log.api}</span>
              </div>
            ))}
          </div>
        )}

        <Modal 
          isOpen={isModalOpen}
          title="Cancelar Processamento?"
          message="O progresso atual será interrompido. Você poderá baixar o que já foi salvo no último checkpoint."
          onConfirm={handleConfirmCancel}
          onCancel={() => setIsModalOpen(false)}
        />

        <ErrorModal 
          isOpen={isErrorModalOpen}
          errors={errors}
          onClose={() => setIsErrorModalOpen(false)}
          onRetry={handleRetryErrors}
        />
      </div>
    </div>
  );
}

function ErrorModal({ isOpen, errors, onClose, onRetry }) {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay" style={{ zIndex: 1000 }}>
      <div className="modal-content fade-in" style={{ maxWidth: '600px', width: '90%' }}>
        <div className="modal-title">
          <AlertCircle className="text-danger" size={20} />
          Lista de Erros ({errors.length.toLocaleString()})
        </div>
        <div style={{ maxHeight: '300px', overflowY: 'auto', margin: '1rem 0', border: '1px solid var(--color-border)', borderRadius: '8px' }}>
          <table className="error-table">
            <thead>
              <tr>
                <th>CNPJ</th>
                <th>Motivo</th>
              </tr>
            </thead>
            <tbody>
              {errors.length === 0 ? (
                <tr>
                  <td colSpan="2" style={{ textAlign: 'center', padding: '2rem', opacity: 0.5 }}>Nenhum erro registrado.</td>
                </tr>
              ) : (
                errors.map((err, i) => (
                  <tr key={i}>
                    <td style={{ whiteSpace: 'nowrap', fontWeight: 'bold' }}>{err.cnpj}</td>
                    <td className="text-danger">{err.error || 'Erro desconhecido'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>Fechar</button>
          {errors.length > 0 && (
            <button className="btn btn-primary" onClick={onRetry}>
              <RefreshCcw size={16} /> Refazer Consulta (Final da Fila)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function DownloadSection({ sessionId, totalCnpjs, stats, onReset }) {
  return (
    <div className="section card fade-in">
      <div className="card-body download-card">
        <div className="download-icon-wrap"><CheckCircle2 size={42} /></div>
        <h2 className="download-title">Processamento Concluído!</h2>
        <p className="download-subtitle">Sua planilha já está pronta com os dados atualizados.</p>
        
        <div className="download-stats-mini">
          <div className="stat-chip">
            <Database size={14} />
            <span>Total: <strong>{totalCnpjs.toLocaleString()}</strong></span>
          </div>
          <div className="stat-chip success">
            <CheckCircle2 size={14} />
            <span>Sucessos: <strong>{stats.success.toLocaleString()}</strong></span>
          </div>
          <div className="stat-chip error">
            <AlertCircle size={14} />
            <span>Erros: <strong>{stats.errors.toLocaleString()}</strong></span>
          </div>
        </div>

        <div className="download-actions">
          <button className="btn btn-success btn-lg btn-full" onClick={() => window.open(`${API_BASE}/download/${sessionId}`, '_blank')}>
            <Download size={20} /> Baixar Planilha Final
          </button>
          <button className="btn btn-secondary btn-full" onClick={onReset}>
            <RefreshCcw size={16} /> Nova Consulta
          </button>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const [showHero, setShowHero] = useState(true);
  const [state, setState] = useState({ 
    stage: 'upload', 
    sessionId: null, 
    totalCnpjs: 0, 
    fields: [], 
    delay: 500, 
    batchSize: 10, 
    stats: null,
    fileName: ''
  });

  useEffect(() => { 
    document.documentElement.setAttribute('data-theme', theme); 
    localStorage.setItem('theme', theme); 
  }, [theme]);

  const handleFileUploaded = (sid, total, name) => setState({ ...state, stage: 'setup', sessionId: sid, totalCnpjs: total, fileName: name });
  const handleStart = (fields, delay, batchSize) => setState({ ...state, stage: 'processing', fields, delay, batchSize });
  const handleComplete = (stats) => setState({ ...state, stage: 'download', stats });
  const handleReset = () => setState({ stage: 'upload', sessionId: null, totalCnpjs: 0, fields: [], stats: null, fileName: '' });

  const handleAccess = () => {
    const heroEl = document.querySelector('.hero');
    if (heroEl) heroEl.classList.add('exit');
    setTimeout(() => setShowHero(false), 800);
  };

  const handleLogout = () => {
    handleReset();
    setShowHero(true);
  };

  return (
    <div className="app">
      {showHero ? (
        <Hero onAccess={handleAccess} />
      ) : (
        <>
          <Header 
            theme={theme} 
            onToggleTheme={() => setTheme(t => t === 'light' ? 'dark' : 'light')} 
            onLogout={handleLogout}
            showLogout={!showHero}
          />
          <main className="app-main">
            {(state.stage === 'upload' || state.stage === 'setup') && (
              <FileUpload 
                onFileUploaded={handleFileUploaded} 
                disabled={state.stage === 'setup'} 
                uploadedFileInfo={state.stage === 'setup' ? { name: state.fileName, total: state.totalCnpjs } : null}
              />
            )}
            
            {state.stage === 'setup' && (
              <FieldSelector 
                totalCnpjs={state.totalCnpjs} 
                onStart={handleStart} 
                onCancel={handleReset} 
              />
            )}

            {state.stage === 'processing' && (
              <ProgressPanel 
                sessionId={state.sessionId} 
                totalCnpjs={state.totalCnpjs} 
                selectedFields={state.fields} 
                delay={state.delay} 
                batchSize={state.batchSize} 
                onComplete={handleComplete} 
                onReset={handleReset} 
              />
            )}

            {state.stage === 'download' && (
              <DownloadSection 
                sessionId={state.sessionId} 
                totalCnpjs={state.totalCnpjs} 
                stats={state.stats} 
                onReset={handleReset} 
              />
            )}
          </main>
        </>
      )}
    </div>
  );
}

export default App;
