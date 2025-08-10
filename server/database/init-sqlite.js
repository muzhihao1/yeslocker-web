const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

// SQLite数据库路径
const DB_PATH = path.join(__dirname, 'yeslocker.db');

// SQL文件路径
const SCHEMA_PATH = path.join(__dirname, 'schema-sqlite.sql');
const SEED_PATH = path.join(__dirname, 'seed-sqlite.sql');

/**
 * 初始化SQLite数据库
 */
async function initDatabase() {
    return new Promise((resolve, reject) => {
        console.log('🗄️  正在初始化SQLite数据库...');
        
        // 如果数据库文件已存在，先删除
        if (fs.existsSync(DB_PATH)) {
            fs.unlinkSync(DB_PATH);
            console.log('🗑️  已删除旧的数据库文件');
        }
        
        // 创建新的数据库连接
        const db = new sqlite3.Database(DB_PATH, (err) => {
            if (err) {
                console.error('❌ 创建数据库失败:', err.message);
                return reject(err);
            }
            console.log('✅ SQLite数据库创建成功:', DB_PATH);
        });

        // 执行schema文件
        const schemaSQL = fs.readFileSync(SCHEMA_PATH, 'utf8');
        db.exec(schemaSQL, (err) => {
            if (err) {
                console.error('❌ 执行schema失败:', err.message);
                db.close();
                return reject(err);
            }
            console.log('✅ 数据库表结构创建成功');

            // 执行seed文件
            const seedSQL = fs.readFileSync(SEED_PATH, 'utf8');
            db.exec(seedSQL, (err) => {
                if (err) {
                    console.error('❌ 执行seed数据失败:', err.message);
                    db.close();
                    return reject(err);
                }
                console.log('✅ 测试数据插入成功');

                // 验证数据是否插入成功
                db.all("SELECT COUNT(*) as count FROM stores", [], (err, rows) => {
                    if (err) {
                        console.error('❌ 验证数据失败:', err.message);
                        db.close();
                        return reject(err);
                    }
                    
                    console.log(`📊 数据库初始化完成! 门店数量: ${rows[0].count}`);
                    
                    // 显示统计信息
                    const tables = ['stores', 'users', 'admins', 'lockers', 'applications', 'locker_records', 'reminders'];
                    let completed = 0;
                    const stats = {};
                    
                    tables.forEach(table => {
                        db.all(`SELECT COUNT(*) as count FROM ${table}`, [], (err, rows) => {
                            if (!err) {
                                stats[table] = rows[0].count;
                            }
                            completed++;
                            
                            if (completed === tables.length) {
                                console.log('📈 数据库统计:');
                                Object.entries(stats).forEach(([table, count]) => {
                                    console.log(`   - ${table}: ${count} 条记录`);
                                });
                                
                                db.close((err) => {
                                    if (err) {
                                        console.error('❌ 关闭数据库连接失败:', err.message);
                                        return reject(err);
                                    }
                                    console.log('✅ 数据库初始化完成，连接已关闭');
                                    resolve(DB_PATH);
                                });
                            }
                        });
                    });
                });
            });
        });
    });
}

/**
 * 重置数据库（仅重新执行seed数据）
 */
async function resetDatabase() {
    return new Promise((resolve, reject) => {
        console.log('🔄 正在重置数据库数据...');
        
        if (!fs.existsSync(DB_PATH)) {
            console.log('⚠️  数据库文件不存在，将执行完整初始化');
            return initDatabase().then(resolve).catch(reject);
        }
        
        const db = new sqlite3.Database(DB_PATH, (err) => {
            if (err) {
                console.error('❌ 连接数据库失败:', err.message);
                return reject(err);
            }
        });

        // 执行seed文件
        const seedSQL = fs.readFileSync(SEED_PATH, 'utf8');
        db.exec(seedSQL, (err) => {
            if (err) {
                console.error('❌ 重置数据失败:', err.message);
                db.close();
                return reject(err);
            }
            console.log('✅ 数据重置成功');
            
            db.close((err) => {
                if (err) {
                    console.error('❌ 关闭数据库连接失败:', err.message);
                    return reject(err);
                }
                console.log('✅ 数据库重置完成');
                resolve(DB_PATH);
            });
        });
    });
}

/**
 * 检查数据库是否存在
 */
function checkDatabase() {
    const exists = fs.existsSync(DB_PATH);
    console.log(`📋 数据库状态: ${exists ? '存在' : '不存在'} (${DB_PATH})`);
    return exists;
}

// 如果直接运行此文件，执行初始化
if (require.main === module) {
    const command = process.argv[2];
    
    if (command === 'reset') {
        resetDatabase().catch(console.error);
    } else if (command === 'check') {
        checkDatabase();
    } else {
        initDatabase().catch(console.error);
    }
}

module.exports = {
    initDatabase,
    resetDatabase,
    checkDatabase,
    DB_PATH
};