#!/usr/bin/env node

/**
 * YesLocker Comprehensive Edge Case and Failure Testing Runner
 * 
 * Master test runner that orchestrates all edge case, boundary, and failure
 * testing suites to provide comprehensive production readiness validation.
 */

const EdgeCaseTestFramework = require('./edge-case-testing-framework');
const DatabaseEdgeCaseTests = require('./database-edge-cases');
const SecurityBoundaryTests = require('./security-boundary-tests');
const FailureSimulationSuite = require('./failure-simulation-suite');
const fs = require('fs').promises;
const path = require('path');

class ComprehensiveEdgeCaseRunner {
    constructor() {
        this.results = {
            suites: {},
            overall: {
                total_tests: 0,
                passed: 0,
                failed: 0,
                warnings: 0,
                critical_issues: 0,
                start_time: Date.now(),
                end_time: null
            },
            production_readiness: {
                score: 0,
                status: 'UNKNOWN',
                blockers: [],
                recommendations: []
            }
        };
    }

    log(level, message, details = null) {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] [${level}] ${message}`);
        
        if (details) {
            console.log(JSON.stringify(details, null, 2));
        }
    }

    /**
     * Run all test suites in sequence
     */
    async runAllTestSuites() {
        console.log('🚀 YesLocker Comprehensive Edge Case and Failure Testing');
        console.log('=' .repeat(80));
        console.log('Running comprehensive production readiness validation...\n');

        const suites = [
            {
                name: 'edge-case-framework',
                description: 'General Edge Cases and Input Validation',
                runner: EdgeCaseTestFramework,
                priority: 'HIGH'
            },
            {
                name: 'database-edge-cases',
                description: 'Database Constraints and Boundary Testing',
                runner: DatabaseEdgeCaseTests,
                priority: 'HIGH'
            },
            {
                name: 'security-boundary-tests',
                description: 'Security Vulnerabilities and Attack Vectors',
                runner: SecurityBoundaryTests,
                priority: 'CRITICAL'
            },
            {
                name: 'failure-simulation-suite',
                description: 'System Resilience and Failure Recovery',
                runner: FailureSimulationSuite,
                priority: 'HIGH'
            }
        ];

        for (const suite of suites) {
            try {
                console.log(`\n🔍 Running ${suite.description}...`);
                console.log(`Priority: ${suite.priority}`);
                console.log('-'.repeat(60));

                const testRunner = new suite.runner();
                const suiteReport = await testRunner.runAllTests();

                this.results.suites[suite.name] = {
                    ...suiteReport,
                    priority: suite.priority,
                    description: suite.description,
                    status: this.determineSuiteStatus(suiteReport, suite.priority)
                };

                // Aggregate overall results
                this.aggregateResults(suiteReport, suite.priority);

                console.log(`✅ ${suite.description} completed`);
                
            } catch (error) {
                console.error(`❌ ${suite.description} failed:`, error.message);
                
                this.results.suites[suite.name] = {
                    error: error.message,
                    priority: suite.priority,
                    description: suite.description,
                    status: 'FAILED'
                };

                this.results.overall.failed += 10; // Penalty for suite failure
                this.results.overall.critical_issues += suite.priority === 'CRITICAL' ? 5 : 1;
            }
        }

        this.results.overall.end_time = Date.now();
        
        return this.generateComprehensiveReport();
    }

    /**
     * Determine suite status based on results and priority
     */
    determineSuiteStatus(report, priority) {
        if (report.error) return 'FAILED';
        
        // For security tests
        if (report.summary && report.summary.critical > 0) {
            return 'CRITICAL_ISSUES';
        }
        
        if (report.summary && report.summary.high > 0 && priority === 'CRITICAL') {
            return 'HIGH_RISK';
        }

        // For other test suites
        if (report.summary) {
            const failureRate = report.summary.failed / report.summary.total_tests;
            
            if (failureRate > 0.2) return 'HIGH_FAILURES';
            if (failureRate > 0.1) return 'MODERATE_FAILURES';
            if (failureRate > 0) return 'SOME_FAILURES';
            
            return 'PASSED';
        }

        return 'UNKNOWN';
    }

    /**
     * Aggregate results from individual test suites
     */
    aggregateResults(report, priority) {
        if (report.summary) {
            this.results.overall.total_tests += report.summary.total_tests || 0;
            this.results.overall.passed += report.summary.passed || 0;
            this.results.overall.failed += report.summary.failed || 0;
            this.results.overall.warnings += report.summary.warnings || 0;

            // Security-specific aggregation
            if (report.summary.critical) {
                this.results.overall.critical_issues += report.summary.critical;
            }
            
            if (report.summary.high && priority === 'CRITICAL') {
                this.results.overall.critical_issues += report.summary.high;
            }
        }
    }

    /**
     * Calculate production readiness score
     */
    calculateProductionReadinessScore() {
        const { total_tests, passed, failed, critical_issues } = this.results.overall;
        
        if (total_tests === 0) return 0;

        // Base score from test results
        let baseScore = (passed / total_tests) * 100;
        
        // Critical security issues are blockers
        if (critical_issues > 0) {
            baseScore = Math.min(baseScore, 30); // Cap at 30% if critical issues exist
        }
        
        // Penalties for different types of failures
        const failureRate = failed / total_tests;
        
        if (failureRate > 0.3) {
            baseScore *= 0.5; // Severe penalty for high failure rate
        } else if (failureRate > 0.2) {
            baseScore *= 0.7; // Moderate penalty
        } else if (failureRate > 0.1) {
            baseScore *= 0.85; // Minor penalty
        }

        return Math.max(0, Math.min(100, Math.round(baseScore)));
    }

    /**
     * Determine production readiness status
     */
    determineProductionReadiness() {
        const score = this.calculateProductionReadinessScore();
        const { critical_issues, failed, total_tests } = this.results.overall;
        
        // Critical blockers
        if (critical_issues > 0) {
            return {
                status: 'NOT_READY',
                level: 'BLOCKED',
                message: 'Critical security or system issues must be resolved before production deployment'
            };
        }
        
        // High failure rate
        if (failed / total_tests > 0.2) {
            return {
                status: 'NOT_READY',
                level: 'HIGH_RISK',
                message: 'High failure rate indicates system instability'
            };
        }
        
        // Scoring-based assessment
        if (score >= 90) {
            return {
                status: 'READY',
                level: 'EXCELLENT',
                message: 'System demonstrates excellent production readiness'
            };
        } else if (score >= 80) {
            return {
                status: 'READY',
                level: 'GOOD',
                message: 'System is ready for production with minor improvements recommended'
            };
        } else if (score >= 70) {
            return {
                status: 'CONDITIONAL',
                level: 'NEEDS_IMPROVEMENT',
                message: 'System may be ready for production with careful monitoring and improvements'
            };
        } else if (score >= 50) {
            return {
                status: 'NOT_READY',
                level: 'SIGNIFICANT_ISSUES',
                message: 'Significant issues must be addressed before production deployment'
            };
        } else {
            return {
                status: 'NOT_READY',
                level: 'MAJOR_OVERHAUL',
                message: 'Major system improvements required before production consideration'
            };
        }
    }

    /**
     * Generate production readiness recommendations
     */
    generateRecommendations() {
        const recommendations = [];
        const blockers = [];

        // Analyze each suite for specific recommendations
        for (const [suiteName, suiteResults] of Object.entries(this.results.suites)) {
            if (suiteResults.status === 'CRITICAL_ISSUES') {
                blockers.push(`${suiteResults.description}: Critical security vulnerabilities detected`);
                recommendations.push(`URGENT: Address critical issues in ${suiteResults.description}`);
            }
            
            if (suiteResults.status === 'HIGH_RISK') {
                blockers.push(`${suiteResults.description}: High-risk issues detected`);
                recommendations.push(`HIGH PRIORITY: Resolve high-risk issues in ${suiteResults.description}`);
            }
            
            if (suiteResults.status === 'HIGH_FAILURES') {
                recommendations.push(`Investigate high failure rate in ${suiteResults.description}`);
            }
            
            if (suiteResults.status === 'FAILED') {
                blockers.push(`${suiteResults.description}: Test suite failed to complete`);
                recommendations.push(`Fix test suite execution issues in ${suiteResults.description}`);
            }
        }

        // General recommendations based on overall results
        if (this.results.overall.critical_issues > 0) {
            recommendations.unshift('CRITICAL: Conduct emergency security review');
            recommendations.push('Consider external security audit');
        }
        
        if (this.results.overall.failed > this.results.overall.passed / 2) {
            recommendations.push('Comprehensive system stability review required');
            recommendations.push('Implement additional error handling and resilience mechanisms');
        }
        
        // Best practices recommendations
        recommendations.push('Implement continuous edge case testing in CI/CD pipeline');
        recommendations.push('Regular chaos engineering exercises');
        recommendations.push('Establish comprehensive monitoring and alerting');
        recommendations.push('Create detailed incident response procedures');
        recommendations.push('Regular security audits and penetration testing');

        return { blockers, recommendations };
    }

    /**
     * Generate comprehensive final report
     */
    async generateComprehensiveReport() {
        const score = this.calculateProductionReadinessScore();
        const readiness = this.determineProductionReadiness();
        const { blockers, recommendations } = this.generateRecommendations();
        
        this.results.production_readiness = {
            score,
            status: readiness.status,
            level: readiness.level,
            message: readiness.message,
            blockers,
            recommendations
        };

        const report = {
            metadata: {
                test_run_id: `edge-case-test-${Date.now()}`,
                timestamp: new Date().toISOString(),
                duration_ms: this.results.overall.end_time - this.results.overall.start_time,
                duration_human: this.formatDuration(this.results.overall.end_time - this.results.overall.start_time),
                version: '1.0.0'
            },
            executive_summary: {
                production_readiness_score: score,
                readiness_status: readiness.status,
                readiness_level: readiness.level,
                message: readiness.message,
                total_tests_executed: this.results.overall.total_tests,
                critical_issues: this.results.overall.critical_issues,
                deployment_recommendation: this.getDeploymentRecommendation(readiness.status)
            },
            detailed_results: {
                overall_statistics: this.results.overall,
                suite_results: this.results.suites,
                production_readiness: this.results.production_readiness
            },
            risk_assessment: this.generateRiskAssessment(),
            next_steps: this.generateNextSteps(readiness.status)
        };

        // Save comprehensive report
        const reportPath = path.join(__dirname, `comprehensive-edge-case-report-${Date.now()}.json`);
        await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

        // Save executive summary
        const summaryPath = path.join(__dirname, `production-readiness-summary-${Date.now()}.md`);
        await this.generateExecutiveSummary(report, summaryPath);

        this.printFinalReport(report, reportPath, summaryPath);
        
        return report;
    }

    /**
     * Generate risk assessment matrix
     */
    generateRiskAssessment() {
        const risks = [];
        
        if (this.results.overall.critical_issues > 0) {
            risks.push({
                category: 'Security',
                level: 'CRITICAL',
                impact: 'HIGH',
                probability: 'HIGH',
                description: 'Critical security vulnerabilities detected',
                mitigation: 'Immediate security review and fixes required'
            });
        }
        
        if (this.results.overall.failed > this.results.overall.total_tests * 0.2) {
            risks.push({
                category: 'System Stability',
                level: 'HIGH',
                impact: 'HIGH',
                probability: 'MEDIUM',
                description: 'High edge case failure rate indicates system instability',
                mitigation: 'Comprehensive system review and hardening required'
            });
        }
        
        if (this.results.suites['failure-simulation-suite']?.status === 'HIGH_FAILURES') {
            risks.push({
                category: 'Resilience',
                level: 'MEDIUM',
                impact: 'MEDIUM',
                probability: 'MEDIUM',
                description: 'System shows poor resilience under failure conditions',
                mitigation: 'Implement circuit breakers and failover mechanisms'
            });
        }

        return risks;
    }

    /**
     * Generate next steps based on readiness status
     */
    generateNextSteps(status) {
        const steps = [];
        
        switch (status) {
            case 'NOT_READY':
                steps.push('STOP: Do not deploy to production');
                steps.push('Address all critical and high-priority issues');
                steps.push('Re-run comprehensive testing after fixes');
                steps.push('Consider external security audit');
                break;
                
            case 'CONDITIONAL':
                steps.push('Deploy only to staging environment initially');
                steps.push('Implement enhanced monitoring and alerting');
                steps.push('Prepare rapid rollback procedures');
                steps.push('Address identified issues in next sprint');
                break;
                
            case 'READY':
                steps.push('Proceed with production deployment');
                steps.push('Implement comprehensive monitoring');
                steps.push('Schedule regular testing and security audits');
                steps.push('Address minor recommendations post-deployment');
                break;
        }
        
        return steps;
    }

    /**
     * Get deployment recommendation
     */
    getDeploymentRecommendation(status) {
        switch (status) {
            case 'READY': return 'APPROVED FOR PRODUCTION DEPLOYMENT';
            case 'CONDITIONAL': return 'CONDITIONAL APPROVAL - STAGING FIRST';
            case 'NOT_READY': return 'DEPLOYMENT BLOCKED - CRITICAL ISSUES';
            default: return 'UNKNOWN STATUS - MANUAL REVIEW REQUIRED';
        }
    }

    /**
     * Generate executive summary document
     */
    async generateExecutiveSummary(report, summaryPath) {
        const summary = `# YesLocker Production Readiness Assessment

## Executive Summary

**Assessment Date:** ${report.metadata.timestamp}
**Test Duration:** ${report.metadata.duration_human}
**Production Readiness Score:** ${report.executive_summary.production_readiness_score}/100

### Deployment Recommendation
**${report.executive_summary.deployment_recommendation}**

${report.executive_summary.message}

## Key Metrics

- **Total Tests Executed:** ${report.executive_summary.total_tests_executed}
- **Critical Issues Found:** ${report.executive_summary.critical_issues}
- **Overall Success Rate:** ${((report.detailed_results.overall_statistics.passed / report.detailed_results.overall_statistics.total_tests) * 100).toFixed(1)}%

## Test Suite Results

${Object.entries(report.detailed_results.suite_results).map(([name, results]) => `
### ${results.description}
- **Status:** ${results.status}
- **Priority:** ${results.priority}
${results.summary ? `- **Tests:** ${results.summary.passed || 0} passed, ${results.summary.failed || 0} failed` : ''}
${results.error ? `- **Error:** ${results.error}` : ''}
`).join('')}

## Critical Issues

${report.detailed_results.production_readiness.blockers.length > 0 ? 
  report.detailed_results.production_readiness.blockers.map(blocker => `- ❌ ${blocker}`).join('\n') :
  '✅ No critical blocking issues detected'
}

## High Priority Recommendations

${report.detailed_results.production_readiness.recommendations.slice(0, 5).map(rec => `- ${rec}`).join('\n')}

## Risk Assessment

${report.risk_assessment.map(risk => `
### ${risk.category} Risk (${risk.level})
- **Impact:** ${risk.impact}
- **Probability:** ${risk.probability}
- **Description:** ${risk.description}
- **Mitigation:** ${risk.mitigation}
`).join('')}

## Next Steps

${report.next_steps.map((step, index) => `${index + 1}. ${step}`).join('\n')}

---

**Report Generated By:** YesLocker Comprehensive Edge Case Testing Framework
**Report ID:** ${report.metadata.test_run_id}
`;

        await fs.writeFile(summaryPath, summary);
    }

    /**
     * Print final report to console
     */
    printFinalReport(report, reportPath, summaryPath) {
        console.log('\n' + '='.repeat(80));
        console.log('🎯 YESLOCKER PRODUCTION READINESS ASSESSMENT COMPLETE');
        console.log('='.repeat(80));
        
        const readiness = report.executive_summary;
        console.log(`📊 Production Readiness Score: ${readiness.production_readiness_score}/100`);
        console.log(`🚀 Deployment Status: ${readiness.readiness_status} (${readiness.readiness_level})`);
        console.log(`📝 Recommendation: ${readiness.deployment_recommendation}`);
        console.log(`⏱️  Test Duration: ${report.metadata.duration_human}`);
        console.log(`🧪 Total Tests: ${readiness.total_tests_executed}`);
        console.log(`⚠️  Critical Issues: ${readiness.critical_issues}`);
        
        console.log('\n📋 SUITE RESULTS:');
        for (const [name, results] of Object.entries(report.detailed_results.suite_results)) {
            const statusIcon = this.getStatusIcon(results.status);
            console.log(`  ${statusIcon} ${results.description}: ${results.status}`);
        }
        
        if (report.detailed_results.production_readiness.blockers.length > 0) {
            console.log('\n🚫 CRITICAL BLOCKERS:');
            for (const blocker of report.detailed_results.production_readiness.blockers) {
                console.log(`  ❌ ${blocker}`);
            }
        }
        
        console.log('\n📁 REPORTS GENERATED:');
        console.log(`  📄 Detailed Report: ${reportPath}`);
        console.log(`  📋 Executive Summary: ${summaryPath}`);
        
        console.log('\n💡 TOP RECOMMENDATIONS:');
        for (const rec of report.detailed_results.production_readiness.recommendations.slice(0, 3)) {
            console.log(`  • ${rec}`);
        }
        
        console.log('\n' + '='.repeat(80));
        
        // Final status message
        if (readiness.readiness_status === 'READY') {
            console.log('✅ SYSTEM IS READY FOR PRODUCTION DEPLOYMENT');
        } else if (readiness.readiness_status === 'CONDITIONAL') {
            console.log('⚠️  CONDITIONAL APPROVAL - PROCEED WITH CAUTION');
        } else {
            console.log('❌ DEPLOYMENT BLOCKED - CRITICAL ISSUES MUST BE RESOLVED');
        }
        
        console.log('='.repeat(80));
    }

    getStatusIcon(status) {
        switch (status) {
            case 'PASSED': return '✅';
            case 'CRITICAL_ISSUES': return '🚨';
            case 'HIGH_RISK': return '⚠️';
            case 'HIGH_FAILURES': return '❌';
            case 'MODERATE_FAILURES': return '⚠️';
            case 'SOME_FAILURES': return '⚠️';
            case 'FAILED': return '💥';
            default: return '❓';
        }
    }

    formatDuration(ms) {
        const minutes = Math.floor(ms / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        return `${minutes}m ${seconds}s`;
    }
}

// Run comprehensive tests if called directly
if (require.main === module) {
    const runner = new ComprehensiveEdgeCaseRunner();
    
    runner.runAllTestSuites()
        .then(report => {
            // Exit with appropriate code
            if (report.executive_summary.readiness_status === 'NOT_READY') {
                process.exit(1);
            } else if (report.executive_summary.readiness_status === 'CONDITIONAL') {
                process.exit(2);
            } else {
                process.exit(0);
            }
        })
        .catch(error => {
            console.error('💥 Comprehensive testing failed:', error);
            process.exit(1);
        });
}

module.exports = ComprehensiveEdgeCaseRunner;