import 'dotenv/config';
import { app } from './app';

const PORT = parseInt(process.env.PORT || '4000', 10);

const server = app.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(`🚀 KASBARENG API running on port ${PORT}`);
  console.log(`🔗 Healthcheck: http://localhost:${PORT}/api/v1/health`);
  console.log(`=========================================`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
});