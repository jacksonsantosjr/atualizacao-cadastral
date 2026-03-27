const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { readCnpjsFromFile, generateOutputFile } = require('./services/xlsxService');
const { createBatchProcessor } = require('./services/batchProcessor');

const app = express();
const PORT = process.env.PORT || 7860;

app.use(cors());
app.use(express.json());

const uploadsDir = path.join(__dirname, '..', 'uploads');
const outputDir = path.join(__dirname, '..', 'output');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

const upload = multer({
  dest: uploadsDir,
  limits: { fileSize: 50 * 1024 * 1024 }
});

const sessions = new Map();
const sseClients = new Map();

// Servir arquivos estáticos do Frontend (React)
const clientDistPath = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
}

app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });

    const cnpjs = await readCnpjsFromFile(req.file.path);
    if (cnpjs.length === 0) {
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Nenhum CNPJ encontrado na planilha' });
    }

    const sessionId = uuidv4();
    sessions.set(sessionId, {
      cnpjs,
      status: 'ready',
      totalCnpjs: cnpjs.length,
      filePath: req.file.path,
      selectedFields: [],
      results: []
    });

    res.json({ sessionId, totalCnpjs: cnpjs.length });
  } catch (err) {
    console.error('Erro no upload:', err);
    res.status(500).json({ error: 'Erro ao processar arquivo' });
  }
});

app.post('/api/start/:sessionId', (req, res) => {
  const sessionId = req.params.sessionId;
  const session = sessions.get(sessionId);
  if (!session) return res.status(404).json({ error: 'Sessão não encontrada' });

  // EVITA RECRIAR O PROCESSADOR SE JÁ EXISTIR (Evita processos zumbis que duplicam o log)
  if (session.processor) {
    session.processor.resume();
    session.status = 'processing';
    return res.json({ message: 'Retomado' });
  }

  const { selectedFields = [], delay = 500, batchSize = 10 } = req.body;
  session.selectedFields = selectedFields;

  const processor = createBatchProcessor(session.cnpjs, {
    delay,
    batchSize,
    onProgress: (progress) => {
      const client = sseClients.get(sessionId);
      if (client) {
        try {
          client.write(`data: ${JSON.stringify(progress)}\n\n`);
        } catch (err) {
          console.error('Erro SSE:', err);
        }
      }
    },
    onCheckpoint: async (results) => {
      try {
        const checkpointPath = path.join(outputDir, `checkpoint_${sessionId}.xlsx`);
        await generateOutputFile(results, checkpointPath, selectedFields);
        console.log(`💾 Checkpoint salvo: ${checkpointPath}`);
      } catch (err) {
        console.error('Erro no checkpoint:', err);
      }
    },
    onComplete: async (results) => {
      try {
        const finalPath = path.join(outputDir, `${sessionId}.xlsx`);
        await generateOutputFile(results, finalPath, selectedFields);
        session.status = 'completed';
        session.outputPath = finalPath;
        
        // Remove checkpoint se o final foi gerado com sucesso
        const checkpointPath = path.join(outputDir, `checkpoint_${sessionId}.xlsx`);
        if (fs.existsSync(checkpointPath)) fs.unlinkSync(checkpointPath);

        const client = sseClients.get(sessionId);
        if (client) client.write(`data: ${JSON.stringify({ type: 'complete', stats: { success: results.filter(r => r.status === 'success').length, errors: results.filter(r => r.status === 'error').length } })}\n\n`);
      } catch (err) {
        console.error('Erro ao finalizar:', err);
      }

      if (session.filePath && fs.existsSync(session.filePath)) fs.unlinkSync(session.filePath);
    }
  });

  session.processor = processor;
  session.status = 'processing';
  processor.start();

  res.json({ message: 'Iniciado' });
});

app.post('/api/pause/:sessionId', (req, res) => {
  const session = sessions.get(req.params.sessionId);
  if (session && session.processor) {
    session.processor.pause();
    session.status = 'paused';
    res.json({ message: 'Pausado' });
  } else res.status(404).json({ error: 'Sessão não encontrada' });
});

app.post('/api/resume/:sessionId', (req, res) => {
  const session = sessions.get(req.params.sessionId);
  if (session && session.processor) {
    session.processor.resume();
    session.status = 'processing';
    res.json({ message: 'Retomado' });
  } else res.status(404).json({ error: 'Sessão não encontrada' });
});

app.post('/api/retry/:sessionId', (req, res) => {
  const session = sessions.get(req.params.sessionId);
  if (session && session.processor) {
    const { cnpjs } = req.body;
    if (!Array.isArray(cnpjs)) return res.status(400).json({ error: 'Lista de CNPJs inválida' });
    
    session.processor.addCnpjs(cnpjs);
    session.totalCnpjs += cnpjs.length;
    
    // Se o processador já terminou, reinicia o loop
    session.processor.start();
    
    res.json({ message: 'Novos CNPJs adicionados à fila' });
  } else res.status(404).json({ error: 'Sessão não encontrada' });
});

app.post('/api/cancel/:sessionId', (req, res) => {
  const session = sessions.get(req.params.sessionId);
  if (session && session.processor) {
    session.processor.cancel();
    session.status = 'cancelled';
    res.json({ message: 'Cancelado' });
  } else res.status(404).json({ error: 'Sessão não encontrada' });
});

app.get('/api/progress/:sessionId', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  sseClients.set(req.params.sessionId, res);
  req.on('close', () => sseClients.delete(req.params.sessionId));
});

app.get('/api/download/:sessionId', (req, res) => {
  const session = sessions.get(req.params.sessionId);
  if (!session) return res.status(404).send('Sessão não encontrada');
  
  // Tenta baixar o final, se não tiver, tenta o checkpoint
  let fileToDownload = session.outputPath;
  if (!fileToDownload || !fs.existsSync(fileToDownload)) {
    fileToDownload = path.join(outputDir, `checkpoint_${req.params.sessionId}.xlsx`);
  }

  if (fs.existsSync(fileToDownload)) {
    res.download(fileToDownload, 'atualizacao_cnpj.xlsx');
  } else {
    res.status(404).send('Arquivo não disponível');
  }
});

// Catch-all para rotas do React (SPA)
app.get('*', (req, res) => {
  const clientDistPath = path.join(__dirname, '..', 'client', 'dist');
  const indexPath = path.join(clientDistPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.send('🚀 Servidor Ativo! (Aguardando build do Frontend)');
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor Ativo`);
  console.log(`📡 Porta: ${PORT}`);
  console.log(`🏠 Host: 0.0.0.0`);
});
