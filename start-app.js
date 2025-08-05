const handler = require('serve-handler');
const http = require('http');

const server = http.createServer((request, response) => {
  // Serve the built files from dist directory
  return handler(request, response, {
    public: 'dist/build/h5',
    rewrites: [
      { source: '**', destination: '/index.html' }
    ],
    headers: [
      {
        source: '**',
        headers: [{
          key: 'Cache-Control',
          value: 'max-age=3600'
        }]
      }
    ]
  });
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`🚀 YesLocker User App running at http://localhost:${port}`);
});