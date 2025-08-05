#!/usr/bin/env node

/**
 * YesLocker 杆柜分配→用户查看流程测试
 * Terminal B: 测试管理员分配杆柜后，用户能正确查看已分配的杆柜信息
 */

const axios = require('axios');

// 配置
const BASE_URL = 'http://localhost:3001';
const TEST_CONFIG = {
  admin: {
    phone: '13800000001',
    password: 'admin123'
  },
  testUser: 'user_1',
  pendingApplicationId: 'app_1'
};

// 颜色输出
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(level, message) {
  const timestamp = new Date().toISOString();
  const colorMap = {
    INFO: colors.blue,
    SUCCESS: colors.green,
    WARNING: colors.yellow,
    ERROR: colors.red
  };
  
  console.log(`${colorMap[level]}[${level}]${colors.reset} ${timestamp} - ${message}`);
}

// 测试结果收集
const testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  details: []
};

function recordTest(testName, passed, details = '') {
  testResults.total++;
  if (passed) {
    testResults.passed++;
    log('SUCCESS', `✅ ${testName}`);
  } else {
    testResults.failed++;
    log('ERROR', `❌ ${testName} - ${details}`);
  }
  testResults.details.push({
    name: testName,
    passed,
    details,
    timestamp: new Date().toISOString()
  });
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 管理员登录获取token
async function adminLogin() {
  try {
    log('INFO', '开始管理员登录...');
    const response = await axios.post(`${BASE_URL}/api/admin-login`, {
      phone: TEST_CONFIG.admin.phone,
      password: TEST_CONFIG.admin.password
    });

    if (response.data.success) {
      const token = response.data.data.token;
      log('SUCCESS', `管理员登录成功，token: ${token.substring(0, 20)}...`);
      recordTest('管理员登录', true);
      return token;
    } else {
      throw new Error(response.data.message || '登录失败');
    }
  } catch (error) {
    log('ERROR', `管理员登录失败: ${error.message}`);
    recordTest('管理员登录', false, error.message);
    throw error;
  }
}

// 获取待审批申请列表
async function getPendingApplications(token) {
  try {
    log('INFO', '获取待审批申请列表...');
    const response = await axios.get(`${BASE_URL}/api/admin-approval?status=pending`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.data.success) {
      const applications = response.data.data; // data is directly the applications array
      log('INFO', `找到 ${applications.length} 个待审批申请`);
      
      // 查找我们的测试申请
      const testApplication = applications.find(app => app.id === TEST_CONFIG.pendingApplicationId);
      if (testApplication) {
        log('SUCCESS', `找到测试申请: ${testApplication.user_id} (${testApplication.id})`);
        recordTest('获取待审批申请', true);
        return testApplication;
      } else {
        throw new Error(`未找到测试申请 ID: ${TEST_CONFIG.pendingApplicationId}`);
      }
    } else {
      throw new Error(response.data.message || '获取申请列表失败');
    }
  } catch (error) {
    log('ERROR', `获取待审批申请失败: ${error.message}`);
    recordTest('获取待审批申请', false, error.message);
    throw error;
  }
}

// 管理员审批申请（分配杆柜）
async function approveApplication(token, applicationId) {
  try {
    log('INFO', `开始审批申请: ${applicationId}`);
    const response = await axios.post(`${BASE_URL}/api/admin-approval`, {
      application_id: applicationId,
      action: 'approve',
      // 让系统自动分配杆柜（不指定assigned_locker_id）
    }, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.data.success) {
      const assignedLockerId = response.data.data.assigned_locker_id;
      log('SUCCESS', `申请审批成功，分配杆柜: ${assignedLockerId}`);
      recordTest('管理员审批分配杆柜', true);
      return assignedLockerId;
    } else {
      throw new Error(response.data.message || '审批失败');
    }
  } catch (error) {
    log('ERROR', `审批申请失败: ${error.message}`);
    recordTest('管理员审批分配杆柜', false, error.message);
    throw error;
  }
}

// 验证申请状态已更新
async function verifyApplicationStatus(token, applicationId) {
  try {
    log('INFO', '验证申请状态是否已更新...');
    const response = await axios.get(`${BASE_URL}/api/admin-approval`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.data.success) {
      const applications = response.data.data; // data is directly the applications array
      const updatedApplication = applications.find(app => app.id === applicationId);
      
      if (updatedApplication) {
        if (updatedApplication.status === 'approved') {
          log('SUCCESS', `申请状态已更新为: ${updatedApplication.status}`);
          log('INFO', `分配的杆柜: ${updatedApplication.locker.number} (${updatedApplication.locker.id})`);
          recordTest('申请状态已更新', true);
          return updatedApplication;
        } else {
          throw new Error(`申请状态未正确更新，当前状态: ${updatedApplication.status}`);
        }
      } else {
        throw new Error('未找到更新后的申请记录');
      }
    } else {
      throw new Error(response.data.message || '获取申请状态失败');
    }
  } catch (error) {
    log('ERROR', `验证申请状态失败: ${error.message}`);
    recordTest('申请状态已更新', false, error.message);
    throw error;
  }
}

// 用户查看已分配的杆柜
async function getUserAssignedLocker(userId) {
  try {
    log('INFO', `用户查看已分配杆柜: ${userId}`);
    const response = await axios.get(`${BASE_URL}/users/${userId}/locker`);

    if (response.data.success) {
      const lockerData = response.data.data;
      
      if (lockerData) {
        log('SUCCESS', `用户已分配杆柜: ${lockerData.number} (${lockerData.id})`);
        log('INFO', `杆柜状态: ${lockerData.status}`);
        log('INFO', `所属门店: ${lockerData.store_name}`);
        recordTest('用户查看已分配杆柜', true);
        return lockerData;
      } else {
        throw new Error('用户暂无分配的杆柜');
      }
    } else {
      throw new Error(response.data.message || '获取用户杆柜失败');
    }
  } catch (error) {
    log('ERROR', `用户查看杆柜失败: ${error.message}`);
    recordTest('用户查看已分配杆柜', false, error.message);
    throw error;
  }
}

// 获取用户杆柜使用记录
async function getUserLockerRecords(userId) {
  try {
    log('INFO', `获取用户杆柜使用记录: ${userId}`);
    const response = await axios.get(`${BASE_URL}/users/${userId}/locker-records?limit=5`);

    if (response.data.success) {
      const records = response.data.data; // data is directly the records array
      log('SUCCESS', `找到 ${records.length} 条使用记录`);
      
      if (records.length > 0) {
        log('INFO', '最近的使用记录:');
        records.slice(0, 3).forEach(record => {
          log('INFO', `  - ${record.action_type} | ${record.locker_number} | ${record.created_at}`);
        });
      }
      
      recordTest('获取用户杆柜记录', true);
      return records;
    } else {
      throw new Error(response.data.message || '获取杆柜记录失败');
    }
  } catch (error) {
    log('ERROR', `获取杆柜记录失败: ${error.message}`);
    recordTest('获取杆柜记录', false, error.message);
    return [];
  }
}

// 数据一致性验证
function verifyDataConsistency(adminApplication, userLocker) {
  try {
    log('INFO', '验证管理端和用户端数据一致性...');
    
    const checks = [
      {
        name: '杆柜分配成功验证',
        condition: adminApplication.locker && adminApplication.locker.id && userLocker && userLocker.id,
        adminValue: adminApplication.locker ? adminApplication.locker.id : 'null',
        userValue: userLocker ? userLocker.id : 'null'
      },
      {
        name: '门店信息一致性',
        condition: adminApplication.store && userLocker && adminApplication.store.id === userLocker.store_id,
        adminValue: adminApplication.store ? adminApplication.store.id : 'null',
        userValue: userLocker ? userLocker.store_id : 'null'
      },
      {
        name: '审批状态验证',
        condition: adminApplication.status === 'approved' && userLocker && (userLocker.status === 'approved' || userLocker.status === 'pending'),
        adminValue: adminApplication.status,
        userValue: userLocker ? userLocker.status : 'null'
      }
    ];

    let allChecksPass = true;
    checks.forEach(check => {
      if (check.condition) {
        log('SUCCESS', `✅ ${check.name}: 通过`);
      } else {
        log('ERROR', `❌ ${check.name}: 不一致 (管理端: ${check.adminValue}, 用户端: ${check.userValue})`);
        allChecksPass = false;
      }
    });

    recordTest('数据一致性验证', allChecksPass);
    return allChecksPass;
  } catch (error) {
    log('ERROR', `数据一致性验证失败: ${error.message}`);
    recordTest('数据一致性验证', false, error.message);
    return false;
  }
}

// 生成测试报告
function generateTestReport() {
  const report = {
    testName: '杆柜分配→用户查看流程测试',
    timestamp: new Date().toISOString(),
    summary: {
      total: testResults.total,
      passed: testResults.passed,
      failed: testResults.failed,
      successRate: testResults.total > 0 ? ((testResults.passed / testResults.total) * 100).toFixed(2) + '%' : '0%'
    },
    details: testResults.details,
    environment: {
      baseUrl: BASE_URL,
      testUser: TEST_CONFIG.testUser,
      applicationId: TEST_CONFIG.pendingApplicationId
    }
  };

  // 控制台输出
  console.log('\n' + '='.repeat(60));
  log('INFO', '测试报告');
  console.log('='.repeat(60));
  log('INFO', `测试总数: ${report.summary.total}`);
  log('SUCCESS', `通过测试: ${report.summary.passed}`);
  log('ERROR', `失败测试: ${report.summary.failed}`);
  log('INFO', `成功率: ${report.summary.successRate}`);
  console.log('='.repeat(60));

  if (report.summary.failed > 0) {
    log('WARNING', '失败的测试项:');
    report.details.filter(test => !test.passed).forEach(test => {
      log('ERROR', `  - ${test.name}: ${test.details}`);
    });
  }

  // 写入报告文件
  const fs = require('fs');
  const reportPath = `./locker-assignment-flow-test-report-${Date.now()}.json`;
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  log('INFO', `详细报告已保存到: ${reportPath}`);

  return report;
}

// 主测试流程
async function runLockerAssignmentFlowTest() {
  try {
    log('INFO', '🚀 开始杆柜分配→用户查看流程测试');
    log('INFO', `测试环境: ${BASE_URL}`);
    log('INFO', `测试用户: ${TEST_CONFIG.testUser}`);
    log('INFO', `待审批申请: ${TEST_CONFIG.pendingApplicationId}`);
    console.log('-'.repeat(60));

    // 步骤1: 管理员登录
    const adminToken = await adminLogin();
    await sleep(500);

    // 步骤2: 获取待审批申请
    const pendingApplication = await getPendingApplications(adminToken);
    await sleep(500);

    // 步骤3: 管理员审批并分配杆柜
    const assignedLockerId = await approveApplication(adminToken, pendingApplication.id);
    await sleep(1000); // 等待数据更新

    // 步骤4: 验证申请状态已更新
    const updatedApplication = await verifyApplicationStatus(adminToken, pendingApplication.id);
    await sleep(500);

    // 步骤5: 用户查看已分配的杆柜
    const userLocker = await getUserAssignedLocker(TEST_CONFIG.testUser);
    await sleep(500);

    // 步骤6: 获取用户杆柜使用记录
    const userRecords = await getUserLockerRecords(TEST_CONFIG.testUser);
    await sleep(500);

    // 步骤7: 验证数据一致性
    const consistencyCheck = verifyDataConsistency(updatedApplication, userLocker);

    // 生成测试报告
    const report = generateTestReport();

    // 测试结果总结
    if (report.summary.failed === 0) {
      log('SUCCESS', '🎉 所有测试通过！杆柜分配→用户查看流程工作正常');
      process.exit(0);
    } else {
      log('ERROR', `😞 ${report.summary.failed} 个测试失败，请检查相关功能`);
      process.exit(1);
    }

  } catch (error) {
    log('ERROR', `测试流程异常终止: ${error.message}`);
    
    // 即使发生异常也要生成报告
    recordTest('测试流程完整性', false, error.message);
    generateTestReport();
    
    process.exit(1);
  }
}

// 执行测试
if (require.main === module) {
  runLockerAssignmentFlowTest().catch(error => {
    log('ERROR', `未处理的错误: ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  runLockerAssignmentFlowTest,
  testResults
};