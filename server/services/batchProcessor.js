const { queryCnpj, getActiveCooldownCount } = require('./cnpjService');

function createBatchProcessor(cnpjs, options = {}) {
  const {
    delay = 500,
    batchSize = 10,
    checkpointInterval = 50, // Salva a cada 50 itens
    onProgress = () => {},
    onComplete = () => {},
    onCheckpoint = () => {}
  } = options;

  let isPaused = false;
  let isCancelled = false;
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
    if (cooldownCount === 0) return delay;
    return delay + (cooldownCount * 500);
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

      // Lógica de Checkpoint
      if (currentIndex % checkpointInterval === 0) {
        onCheckpoint(results);
      }

      if (i < batch.length - 1) {
        const currentDelay = getAdaptiveDelay();
        await new Promise(r => setTimeout(r, currentDelay));
      }
    }

    return batchResults;
  }

  async function start() {
    startTime = Date.now();
    currentIndex = 0;
    isPaused = false;
    isCancelled = false;

    for (let i = 0; i < cnpjs.length; i += batchSize) {
      if (isCancelled) break;

      const batch = cnpjs.slice(i, i + batchSize);
      await processBatch(batch, i);

      if (i + batchSize < cnpjs.length && !isCancelled) {
        const currentDelay = getAdaptiveDelay();
        await new Promise(r => setTimeout(r, currentDelay));
      }
    }

    onComplete(results);
  }

  function pause() { isPaused = true; }
  function resume() { isPaused = false; }
  function cancel() { isCancelled = true; isPaused = false; }
  function getResults() { return results; }

  return { start, pause, resume, cancel, getResults };
}

module.exports = { createBatchProcessor };
