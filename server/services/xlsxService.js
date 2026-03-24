const ExcelJS = require('exceljs');
const path = require('path');

/**
 * Mapeamento de chaves internas para nomes de cabeçalhos amigáveis.
 */
const FIELDS_MAP = {
  cnpj: 'CNPJ',
  tipo: 'MATRIZ/FILIAL',
  abertura: 'DATA ABERTURA',
  nome: 'RAZÃO SOCIAL',
  fantasia: 'NOME FANTASIA',
  natureza_juridica: 'NATUREZA JURÍDICA',
  logradouro_tipo: 'TIPO LOGRADOURO',
  logradouro: 'LOGRADOURO',
  numero: 'NÚMERO',
  complemento: 'COMPLEMENTO',
  cep: 'CEP',
  bairro: 'BAIRRO',
  municipio: 'MUNICÍPIO',
  uf: 'UF',
  email: 'E-MAIL',
  telefone: 'TELEFONE',
  situacao: 'SITUAÇÃO CADASTRAL',
  data_situacao: 'DATA DA SITUAÇÃO',
  motivo_situacao: 'MOTIVO DA SITUAÇÃO',
  cnae_principal_codigo: 'CNAE PRINCIPAL (CÓDIGO)',
  cnae_principal_descricao: 'CNAE PRINCIPAL (DESCRIÇÃO)',
  capital_social: 'CAPITAL SOCIAL',
  porte: 'PORTE',
  simples_optante: 'OPTANTE SIMPLES',
  mei_optante: 'OPTANTE MEI'
};

async function readCnpjsFromFile(filePath) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const cnpjs = [];
  const seen = new Set();

  workbook.eachSheet((worksheet) => {
    worksheet.eachRow((row, rowNumber) => {
      row.eachCell((cell) => {
        const value = String(cell.value || '').trim();
        const cleaned = value.replace(/\D/g, '');

        if (cleaned.length === 14) {
          if (!seen.has(cleaned)) {
            seen.add(cleaned);
            cnpjs.push(cleaned);
          }
        }
      });
    });
  });

  return cnpjs;
}

/**
 * Gera o arquivo Excel com colunas dinâmicas.
 * @param {Array} results - Lista de objetos com os dados dos CNPJs
 * @param {String} outputPath - Caminho de saída
 * @param {Array} selectedFields - Chaves dos campos que o usuário selecionou
 */
async function generateOutputFile(results, outputPath, selectedFields = []) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Atualização de Cadastro';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Cadastro Atualizado', {
    properties: { defaultColWidth: 20 }
  });

  // Se nenhum campo for passado, usa um conjunto padrão
  const fieldsToShow = selectedFields.length > 0 
    ? (selectedFields.includes('cnpj') ? selectedFields : ['cnpj', ...selectedFields])
    : ['cnpj', 'nome', 'logradouro', 'numero', 'cep', 'bairro', 'municipio', 'uf'];

  // Define as colunas dinamicamente
  worksheet.columns = fieldsToShow.map(field => ({
    header: FIELDS_MAP[field] || field.toUpperCase(),
    key: field,
    width: field === 'nome' ? 45 : (field === 'logradouro' ? 40 : 20)
  }));

  // Estilização do cabeçalho
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1A5276' }
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 28;

  // Adiciona os dados
  results.forEach((result, index) => {
    const rowData = {};
    fieldsToShow.forEach(field => {
      rowData[field] = result[field] || '';
    });

    const row = worksheet.addRow(rowData);

    if (result.status === 'error') {
      row.font = { color: { argb: 'FFCC0000' } };
    }

    if (index % 2 === 0) {
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF2F7FB' }
      };
    }
  });

  // Filtro automático e bordas
  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: fieldsToShow.length }
  };

  worksheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFD5D8DC' } },
        left: { style: 'thin', color: { argb: 'FFD5D8DC' } },
        bottom: { style: 'thin', color: { argb: 'FFD5D8DC' } },
        right: { style: 'thin', color: { argb: 'FFD5D8DC' } }
      };
    });
  });

  await workbook.xlsx.writeFile(outputPath);
  return outputPath;
}

module.exports = { readCnpjsFromFile, generateOutputFile };
