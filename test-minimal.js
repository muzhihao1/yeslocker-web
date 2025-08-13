#!/usr/bin/env node

/**
 * 最简化测试服务器 - 用于排查Railway部署问题
 * 不依赖数据库，只测试基本的Express服务器功能
 */

const express = require('express');

const app = express();
const port = process.env.PORT || 3000;

console.log('🔬 启动最简化测试服务器...');
console.log('- 端口:', port);
console.log('- 环境:', process.env.NODE_ENV);
console.log('- 当前时间:', new Date().toISOString());

// 基本中间件
app.use(express.json());

// 健康检查端点
app.get('/api/health', (req, res) => {
  console.log('📍 健康检查请求 -', new Date().toISOString());
  res.json({
    status: 'ok',
    message: '最简化服务器运行正常',
    timestamp: new Date().toISOString(),
    port: port,
    env: process.env.NODE_ENV || 'development'
  });
});

// 根路径
app.get('/', (req, res) => {
  console.log('📍 根路径请求 -', new Date().toISOString());
  res.json({
    message: 'YesLocker 测试服务器',
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

// 测试admin-approval端点（无数据库版本）
app.get('/api/admin-approval', (req, res) => {
  console.log('📍 admin-approval测试请求 -', new Date().toISOString());
  res.json({
    success: true,
    message: '测试响应 - 无数据库连接',
    data: [],
    pagination: {
      page: 1,
      pageSize: 20,
      total: 0
    }
  });
});

// 启动服务器
app.listen(port, '0.0.0.0', () => {
  console.log('\n✅ 最简化测试服务器启动成功！');
  console.log('==========================================');
  console.log(`📍 监听地址: 0.0.0.0:${port}`);
  console.log(`🌍 环境: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🕐 启动时间: ${new Date().toISOString()}`);
  console.log('==========================================');
});

// 错误处理
process.on('uncaughtException', (error) => {
  console.error('💥 未捕获的异常:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 未处理的Promise拒绝:', reason);
  process.exit(1);
});