import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Port is fixed: the backend's CORS policy (Development) is checked against http://localhost:5173.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, strictPort: true },
});
