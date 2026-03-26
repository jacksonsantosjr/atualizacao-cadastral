const axios = require('axios');
const https = require('https');

// HTTPS agent that accepts self-signed certs (corporate proxies)
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

/**
 * Normaliza os dados de diferentes APIs para um formato interno padrão.
 * Contém todos os 24 campos possíveis identificados.
 */
/**
 * Mapa de tradução de abreviações comuns para nomes completos e normalizados.
 */
const STREET_TYPE_MAP = {
  'R': 'RUA',
  'R.': 'RUA',
  'AV': 'AVENIDA',
  'AV.': 'AVENIDA',
  'ROD': 'RODOVIA',
  'ROD.': 'RODOVIA',
  'EST': 'ESTRADA',
  'ESTR': 'ESTRADA',
  'EST.': 'ESTRADA',
  'TRAV': 'TRAVESSA',
  'TR': 'TRAVESSA',
  'TR.': 'TRAVESSA',
  'PR': 'PRAÇA',
  'PR.': 'PRAÇA',
  'AL': 'ALAMEDA',
  'AL.': 'ALAMEDA',
  'CALCADA': 'CALÇADA',
  'CALC': 'CALÇADA',
  'SET': 'SETOR',
  'SET.': 'SETOR',
  'QD': 'QUADRA',
  'QD.': 'QUADRA',
  'LT': 'LOTE',
  'LT.': 'LOTE',
  'CJ': 'CONJUNTO',
  'CONJ': 'CONJUNTO',
  'CONJ.': 'CONJUNTO',
  'V': 'VILA',
  'V.': 'VILA',
  'VIL': 'VILA'
};

const COMMON_TYPES_LIST = [
  'RUA', 'AVENIDA', 'ALAMEDA', 'ESTRADA', 'TRAVESSA', 'RODOVIA', 'PRACA', 'BECO', 'VIELA', 'CALCADA', 
  'SETOR', 'QUADRA', 'LOTE', 'AREA', 'CHACARA', 'VIA', 'ESPLANADA', 'LADEIRA', 'CONJUNTO', 'CONDOMINIO', 
  'GALERIA', 'PATIO', 'ACESSO', 'VEREDA', 'NUCLEO', 'PARQUE', 'CAMINHO', 'VILA', 'VALE', 'DISTRITO'
];

const normalizeCommonFields = (data, apiId) => {
  const fields = {
    cnpj: '',
    tipo: '',
    abertura: '',
    nome: '',
    fantasia: '',
    natureza_juridica: '',
    logradouro_tipo: '',
    logradouro: '',
    numero: '',
    complemento: '',
    cep: '',
    bairro: '',
    municipio: '',
    uf: '',
    email: '',
    telefone: '',
    situacao: '',
    data_situacao: '',
    motivo_situacao: '',
    cnae_principal_codigo: '',
    cnae_principal_descricao: '',
    capital_social: '',
    porte: '',
    simples_optante: '',
    mei_optante: ''
  };

  if (apiId === 'opencnpj_org' || apiId === 'minhareceita' || apiId === 'brasilapi') {
    fields.cnpj = data.cnpj || '';
    fields.tipo = data.identificador_matriz_filial === 1 ? 'MATRIZ' : (data.descricao_identificador_matriz_filial || 'FILIAL');
    fields.abertura = data.data_inicio_atividade || '';
    fields.nome = data.razao_social || '';
    fields.fantasia = data.nome_fantasia || '';
    fields.natureza_juridica = data.natureza_juridica || '';
    fields.logradouro_tipo = data.descricao_tipo_de_logradouro || data.descricao_tipo_logradouro || data.tipo_logradouro || '';
    fields.logradouro = data.logradouro || '';
    fields.numero = data.numero || '';
    fields.complemento = data.complemento || '';
    fields.cep = data.cep || '';
    fields.bairro = data.bairro || '';
    fields.municipio = data.municipio || '';
    fields.uf = data.uf || '';
    fields.email = data.email || '';
    fields.telefone = data.ddd_telefone_1 ? `${data.ddd_telefone_1} ${data.telefone_1 || ''}`.trim() : (data.telefone || '');
    fields.situacao = data.descricao_situacao_cadastral || '';
    fields.data_situacao = data.data_situacao_cadastral || '';
    fields.motivo_situacao = data.descricao_motivo_situacao_cadastral || data.motivo_situacao_cadastral || '';
    fields.cnae_principal_codigo = data.cnae_fiscal || '';
    fields.cnae_principal_descricao = data.cnae_fiscal_descricao || '';
    fields.capital_social = data.capital_social || '';
    fields.porte = data.porte || '';
    fields.simples_optante = data.opcao_pelo_simples ? 'SIM' : 'NÃO';
    fields.mei_optante = data.opcao_pelo_mei ? 'SIM' : 'NÃO';
  } else if (apiId === 'opencnpj_com') {
    // OpenCNPJ.com (Kitana) usa CamelCase
    const d = data.data || data; // Pode vir aninhado em .data
    fields.cnpj = d.cnpj || '';
    fields.tipo = d.matriz === 'Sim' ? 'MATRIZ' : 'FILIAL';
    fields.abertura = d.dataInicioAtividades || '';
    fields.nome = d.razaoSocial || '';
    fields.fantasia = d.nomeFantasia || '';
    fields.natureza_juridica = d.naturezaJuridica || '';
    fields.logradouro = d.logradouro || '';
    fields.numero = d.numero || '';
    fields.complemento = d.complemento || '';
    fields.cep = d.cep || '';
    fields.bairro = d.bairro || '';
    fields.municipio = d.municipio || '';
    fields.uf = d.uf || '';
    fields.email = d.email || '';
    fields.telefone = d.telefone || '';
    fields.situacao = d.situacaoCadastral || '';
    fields.data_situacao = d.dataSituacaoCadastral || '';
    fields.motivo_situacao = d.motivoSituacaoCadastral || '';
    fields.cnae_principal_codigo = d.cnaes?.[0]?.cnae || '';
    fields.cnae_principal_descricao = d.cnaes?.[0]?.descricao || '';
    fields.capital_social = d.capitalSocial || '';
    fields.porte = d.porte || '';
    fields.simples_optante = d.opcaoSimples === 'S' ? 'SIM' : 'NÃO';
    fields.mei_optante = d.opcaoMei === 'S' ? 'SIM' : 'NÃO';
  } else if (apiId === 'receitaws') {
    fields.cnpj = data.cnpj || '';
    fields.tipo = data.tipo || '';
    fields.abertura = data.abertura || '';
    fields.nome = data.nome || '';
    fields.fantasia = data.fantasia || '';
    fields.natureza_juridica = data.natureza_juridica || '';
    fields.logradouro = data.logradouro || '';
    fields.numero = data.numero || '';
    fields.complemento = data.complemento || '';
    fields.cep = data.cep || '';
    fields.bairro = data.bairro || '';
    fields.municipio = data.municipio || '';
    fields.uf = data.uf || '';
    fields.email = data.email || '';
    fields.telefone = data.telefone || '';
    fields.situacao = data.situacao || '';
    fields.data_situacao = data.data_situacao || '';
    fields.motivo_situacao = data.motivo_situacao || '';
    fields.cnae_principal_codigo = data.atividade_principal?.[0]?.code || '';
    fields.cnae_principal_descricao = data.atividade_principal?.[0]?.text || '';
    fields.capital_social = data.capital_social || '';
    fields.porte = data.porte || '';
    fields.simples_optante = data.simples ? 'SIM' : 'NÃO';
    fields.mei_optante = 'N/A';
  } else if (apiId === 'cnpja') {
    const address = data.address || {};
    fields.cnpj = data.taxId || '';
    fields.tipo = data.type || '';
    fields.abertura = data.founded || '';
    fields.nome = data.company?.name || '';
    fields.fantasia = data.alias || '';
    fields.natureza_juridica = data.company?.nature || '';
    fields.logradouro_tipo = address.type || '';
    fields.logradouro = address.street || '';
    fields.numero = address.number || '';
    fields.complemento = address.details || '';
    fields.cep = address.zip || '';
    fields.bairro = address.district || '';
    fields.municipio = address.city || '';
    fields.uf = address.state || '';
    fields.email = data.email || '';
    fields.telefone = data.phones?.[0] ? `(${data.phones[0].area}) ${data.phones[0].number}` : '';
    fields.situacao = data.status?.text || '';
    fields.data_situacao = data.status?.date || '';
    fields.cnae_principal_codigo = data.mainActivity?.code || '';
    fields.cnae_principal_descricao = data.mainActivity?.text || '';
    fields.capital_social = data.company?.equity || '';
    fields.porte = data.company?.size || '';
  }

  // Pós-processamento Global de Logradouro (Unificação)
  if (fields.logradouro) {
    const parts = fields.logradouro.trim().split(/\s+/);
    if (parts.length > 1) {
      const firstWordRaw = parts[0];
      // Normaliza para comparação: sem acentos, maiúscula, sem ponto final
      const firstWordNorm = firstWordRaw.toUpperCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[.,]/g, "");

      // Verifica se a primeira palavra é um tipo conhecido ou abreviação reconhecida
      const fullType = STREET_TYPE_MAP[firstWordNorm] || 
                      STREET_TYPE_MAP[firstWordRaw.toUpperCase()] || // Tenta com o original tbm (ex: R.)
                      (COMMON_TYPES_LIST.includes(firstWordNorm) ? firstWordNorm : null);

      if (fullType) {
        // Se a API não mandou o tipo ou o mandou de forma genérica, atualizamos
        if (!fields.logradouro_tipo?.trim() || fields.logradouro_tipo === 'N/A' || fields.logradouro_tipo === 'OUTROS') {
          fields.logradouro_tipo = fullType;
          fields.logradouro = parts.slice(1).join(' '); // Remove o tipo do nome da rua
        }
      }
    }
  }

  return fields;
};

// ========================
// API Registry (6 APIs)
// ========================
const API_LIST = [
  {
    id: 'opencnpj_org',
    name: 'OpenCNPJ.org',
    buildUrl: (cnpj) => `https://api.opencnpj.org/${cnpj}`,
    rateLimit: 100,
    normalize: (data) => normalizeCommonFields(data, 'opencnpj_org')
  },
  {
    id: 'opencnpj_com',
    name: 'OpenCNPJ.com',
    buildUrl: (cnpj) => `https://kitana.opencnpj.com/cnpj/${cnpj}`,
    rateLimit: 100,
    normalize: (data) => normalizeCommonFields(data, 'opencnpj_com')
  },
  {
    id: 'minhareceita',
    name: 'MinhaReceita',
    buildUrl: (cnpj) => `https://minhareceita.org/${cnpj}`,
    rateLimit: 50,
    normalize: (data) => normalizeCommonFields(data, 'minhareceita')
  },
  {
    id: 'brasilapi',
    name: 'BrasilAPI',
    buildUrl: (cnpj) => `https://brasilapi.com.br/api/cnpj/v1/${cnpj}`,
    rateLimit: 30,
    normalize: (data) => normalizeCommonFields(data, 'brasilapi')
  },
  {
    id: 'receitaws',
    name: 'ReceitaWS',
    buildUrl: (cnpj) => `https://receitaws.com.br/v1/cnpj/${cnpj}`,
    rateLimit: 3,
    normalize: (data) => normalizeCommonFields(data, 'receitaws')
  },
  {
    id: 'cnpja',
    name: 'CNPJá',
    buildUrl: (cnpj) => `https://open.cnpja.com/office/${cnpj}`,
    rateLimit: 5,
    normalize: (data) => normalizeCommonFields(data, 'cnpja')
  }
];

// ========================
// Round-Robin + Cooldown
// ========================
let currentApiIndex = 0;
const cooldowns = new Map(); // apiId -> timestamp when cooldown expires
const COOLDOWN_DURATION = 60000; // 60 seconds

function getNextAvailableApi() {
  const now = Date.now();
  const totalApis = API_LIST.length;

  for (let attempt = 0; attempt < totalApis; attempt++) {
    const idx = (currentApiIndex + attempt) % totalApis;
    const api = API_LIST[idx];
    const cooldownUntil = cooldowns.get(api.id) || 0;

    if (now >= cooldownUntil) {
      currentApiIndex = (idx + 1) % totalApis;
      return api;
    }
  }

  let shortest = { api: API_LIST[0], remaining: Infinity };
  for (const api of API_LIST) {
    const remaining = (cooldowns.get(api.id) || 0) - now;
    if (remaining < shortest.remaining) {
      shortest = { api, remaining };
    }
  }
  return shortest.api;
}

function putApiInCooldown(apiId) {
  cooldowns.set(apiId, Date.now() + COOLDOWN_DURATION);
  console.log(`⏸️  [${apiId}] em cooldown por ${COOLDOWN_DURATION / 1000}s`);
}

function getActiveCooldownCount() {
  const now = Date.now();
  let count = 0;
  for (const [, until] of cooldowns) {
    if (now < until) count++;
  }
  return count;
}

// ========================
// CNPJ Utilities
// ========================
function cleanCnpj(cnpj) {
  return String(cnpj).replace(/\D/g, '').padStart(14, '0');
}

function formatCnpj(cnpj) {
  const clean = cleanCnpj(cnpj);
  return clean.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}

// ========================
// Query with Retry
// ========================
async function queryWithRetry(url, retries = 2, delayMs = 1000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await axios.get(url, {
        timeout: 15000,
        httpsAgent,
        headers: { 'Accept': 'application/json' }
      });
      return response.data;
    } catch (err) {
      const status = err.response?.status;
      if (status === 404) return null;
      if (status === 403 || status === 429) throw err;
      if (attempt === retries) throw err;
      await new Promise(r => setTimeout(r, delayMs * attempt));
    }
  }
}

// ========================
// Main Query Function
// ========================
async function queryCnpj(rawCnpj) {
  const cnpj = cleanCnpj(rawCnpj);
  const formattedCnpj = formatCnpj(cnpj);
  const totalApis = API_LIST.length;

  for (let attempt = 0; attempt < totalApis; attempt++) {
    const api = getNextAvailableApi();

    try {
      const url = api.buildUrl(cnpj);
      const data = await queryWithRetry(url);

      // Se a API retornar 'success: false' no corpo ou dados vazios, desconsideramos o sucesso 200
      if (data && data.success !== false) {
        const normalized = api.normalize(data);
        
        // Limpamos caracteres não imprimíveis (zero-width spaces, etc.) que podem burlar o .trim()
        const cleanName = (normalized.nome || '').replace(/[^\x20-\x7EÀ-ÿ]/g, '').trim();

        // Só aceitamos como sucesso se a Razão Social estiver preenchida e for válida
        if (cleanName !== '') {
          normalized.nome = cleanName; // Garante que o nome salvo também esteja limpo
          normalized.cnpj = formattedCnpj;
          normalized.status = 'success';
          normalized.api = api.name;
          return normalized;
        } else {
          console.warn(`⚠️  [${api.name}] ${formattedCnpj}: Dados ausentes ou inválidos. Tentando próxima API...`);
        }
      }
    } catch (err) {
      const status = err.response?.status;
      console.warn(`❌ [${api.name}] ${cnpj}: ${status || err.message}`);

      if (status === 403 || status === 429 || status >= 500) {
        putApiInCooldown(api.id);
      }
      continue;
    }
  }

  return {
    cnpj: formattedCnpj,
    status: 'error',
    api: 'none',
    error: 'Todas as APIs falharam para este CNPJ'
  };
}

module.exports = { queryCnpj, cleanCnpj, formatCnpj, getActiveCooldownCount };
