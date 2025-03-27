const http = require('http');
const { createProxyMiddleware } = require('http-proxy-middleware');

const server = http.createServer((req, res) => {
  // 设置CORS头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if(req.url.startsWith('/proxy')) {
  createProxyMiddleware({
    target: 'https://api.zuidapi.com',
    changeOrigin: true,
    pathRewrite: {
      '^/proxy': ''
    },
    onProxyRes: function(proxyRes) {
      proxyRes.headers['Access-Control-Allow-Origin'] = '*';
      proxyRes.headers['Access-Control-Allow-Methods'] = 'GET';
      proxyRes.headers['Access-Control-Allow-Headers'] = 'Content-Type';
    }
  })(req, res);
} else {
  res.writeHead(404, {'Content-Type': 'text/plain'});
  res.end('Not Found');
}
});

server.listen(3000, () => {
  console.log('Proxy server running on port 3000');
});