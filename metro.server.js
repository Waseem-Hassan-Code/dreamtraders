const Metro = require('metro');
const { loadConfig } = require('metro-config');

(async () => {
  const config = await loadConfig();
  const server = await Metro.runServer(config, {
    host: '0.0.0.0',
    port: 8081,
  });
  ``;

  console.log('Metro server is running on http://localhost:8081');
  console.log('Server object:', !!server);
})().catch(error => {
  console.error('Failed to start Metro:', error);
  process.exit(1);
});
