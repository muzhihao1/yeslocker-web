#!/usr/bin/env node

/**
 * Railway启动脚本 - 简化版本
 * 确保所有路径都正确，并提供详细的启动日志
 */

const path = require('path');
const fs = require('fs');

console.log('🚀 YesLocker Railway 启动脚本');
console.log('==========================================');

// 检查当前工作目录
console.log('📁 当前工作目录:', process.cwd());
console.log('📁 __dirname:', __dirname);

// 检查重要文件是否存在
const serverPath = path.join(__dirname, 'server', 'index-railway.js');
const distPath = path.join(__dirname, 'dist');
const adminDistPath = path.join(__dirname, 'admin', 'dist');

console.log('\n📋 文件检查:');
console.log('- Server文件:', serverPath, fs.existsSync(serverPath) ? '✅' : '❌');
console.log('- 用户前端构建:', distPath, fs.existsSync(distPath) ? '✅' : '❌');
console.log('- 管理后台构建:', adminDistPath, fs.existsSync(adminDistPath) ? '✅' : '❌');

// 检查环境变量
console.log('\n🔧 环境变量:');
console.log('- NODE_ENV:', process.env.NODE_ENV);
console.log('- PORT:', process.env.PORT);
console.log('- DATABASE_URL:', process.env.DATABASE_URL ? '已设置' : '未设置');

if (!fs.existsSync(serverPath)) {
  console.error('❌ 服务器文件不存在:', serverPath);
  process.exit(1);
}

console.log('\n✅ 启动检查完成，开始启动服务器...');
console.log('==========================================\n');

// 启动实际的服务器
require('./server/index-railway.js');