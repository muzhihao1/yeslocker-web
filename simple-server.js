const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

console.log('Simple server starting...');
console.log('PORT:', PORT);

app.get('/', (req, res) => {
  res.json({ message: 'Simple server works!', port: PORT });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', port: PORT });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on 0.0.0.0:${PORT}`);
});