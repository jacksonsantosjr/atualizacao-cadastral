const { queryCnpj, getActiveCooldownCount } = require('./cnpjService');

function createBatchProcessor(cnpjs, options = {}) {
  // Configurações padrão se não definidas
  if (!options.delay) options.delay = 500;
  if (!options.batchSize) options.batchSize = 10;
  if (!options.checkpointInterval) options.checkpointInterval = 50;
  
  const {
    onProgress = () => {},
    onComplete = () => {},
    onCheckpoint = () => {}
  } = options;

  let isPaused = false;
  let isCancelled = false;
  let isProcessing = false;
  let currentIndex = 0;
  const results = [];
  let successCount = 0;
  let errorCount = 0;
  let startTime = null;

  function estimateTimeRemaining() {
    if (!startTime || currentIndex === 0) return null;
    const elapsed = Date.now() - startTime;
    const avgTimePerItem = elapsed / currentIndex;
    const remaining = (cnpjs.length - currentIndex) * avgTimePerItem;
    return Math.round(remaining / 1000);
  }

  function getAdaptiveDelay() {
    const cooldownCount = getActiveCooldownCount();
    const baseDelay = options.delay;
    if (cooldownCount === 0) return baseDelay;
    return baseDelay + (cooldownCount * 500);
  }

  async function processBatch(batch, startIdx) {
    const batchResults = [];

    for (let i = 0; i < batch.length; i++) {
      if (isCancelled) return batchResults;

      while (isPaused) {
        await new Promise(r => setTimeout(r, 500));
        if (isCancelled) return batchResults;
      }

      const cnpj = batch[i];
      const result = await queryCnpj(cnpj);
      batchResults.push(result);
      results.push(result);

      if (result.status === 'success') {
        successCount++;
      } else {
        errorCount++;
      }

      currentIndex = startIdx + i + 1;

      if (!isCancelled) {
        onProgress({
          type: 'progress',
          current: currentIndex,
          total: cnpjs.length,
          success: successCount,
          errors: errorCount,
          percentage: Math.round((currentIndex / cnpjs.length) * 100),
          estimatedTimeRemaining: estimateTimeRemaining(),
          lastResult: {
            cnpj: result.cnpj,
            nome: result.nome || result.razaoSocial || '',
            status: result.status,
            api: result.api
          }
        });
      }

      // Lógica de Checkpoint
      if (!isCancelled && currentIndex % options.checkpointInterval === 0) {
        onCheckpoint(results);
      }

      if (i < batch.length - 1 && !isCancelled) {
        const currentDelay = getAdaptiveDelay();
        await new Promise(r => setTimeout(r, currentDelay));
      }
    }

    return batchResults;
  }

  async function start() {
    if (isProcessing) return;
    isProcessing = true;
    try {
      if (!startTime) startTime = Date.now();
      isPaused = false;
      isCancelled = false;

      // Loop dinâmico para suportar novos itens adicionados à fila
      while (currentIndex < cnpjs.length) {
        if (isCancelled) break;

        const batch = cnpjs.slice(currentIndex, currentIndex + options.batchSize);
        await processBatch(batch, currentIndex);

        if (currentIndex < cnpjs.length && !isCancelled) {
          const currentDelay = getAdaptiveDelay();
          await new Promise(r => setTimeout(r, currentDelay));
        }
      }
      
      if (!isCancelled) {
        onComplete(results);
      }
    } finally {
      isProcessing = false;
    }
  }

  function setOptions(newOptions) {
    if (newOptions.delay) options.delay = newOptions.delay;
    if (newOptions.batchSize) options.batchSize = newOptions.batchSize;
  }

  function pause() { isPaused = true; }
  function resume() { isPaused = false; }
  function cancel() { isCancelled = true; isPaused = false; }
  function getResults() { return results; }

  function addCnpjs(newCnpjs) {
    // Adiciona ao final da lista original
    cnpjs.push(...newCnpjs);
  }

  return { start, pause, resume, cancel, getResults, setOptions, addCnpjs };
}

module.exports = { createBatchProcessor };
