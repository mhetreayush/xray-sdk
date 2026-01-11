import express from 'express';
import swaggerUi from 'swagger-ui-express';
import cors from 'cors';
import openApiSpec from '../index.json';

const app = express();
const PORT = process.env.PORT || 3003;

// Enable CORS
app.use(cors());

// Serve Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));

// Root redirect to Swagger UI
app.get('/', (req, res) => {
  res.redirect('/api-docs');
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Swagger UI running on http://localhost:${PORT}/api-docs`);
});
