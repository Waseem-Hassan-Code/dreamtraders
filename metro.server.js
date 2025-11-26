const Metro = require('metro');
const { loadConfig } = require('metro-config');

(async () => {
  const config = await loadConfig();
  const server = await Metro.runServer(config, {
    host: '0.0.0.0',
    port: 8081,
  });
  ``;
})().catch(error => {
  console.error('Failed to start Metro:', error);
  process.exit(1);
});
