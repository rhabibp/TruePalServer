import React, { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { Button, Spinner } from '../components/shared';

export function HealthCheck() {
    const [healthStatus, setHealthStatus] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const checkHealth = async () => {
        setLoading(true);
        try {
            const response = await fetch('/health/database');
            const data = await response.json();
            setHealthStatus(data);
        } catch (error) {
            setHealthStatus({ error: 'Failed to check health' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        checkHealth();
    }, []);

    if (loading && !healthStatus) return <Spinner />;

    return (
        <div className="p-4 md:p-6">
            <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
                <h1 className="text-xl md:text-2xl font-bold text-gray-900">System Health Check</h1>
                <Button onClick={checkHealth} disabled={loading}>
                    <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    {loading ? 'Checking...' : 'Refresh'}
                </Button>
            </div>

            {healthStatus && (
                <div className="bg-white shadow rounded-lg overflow-hidden">
                    {healthStatus.error ? (
                        <div className="p-6">
                            <div className="flex items-center space-x-3">
                                <XCircle className="h-8 w-8 text-red-500" />
                                <div>
                                    <h2 className="text-lg font-semibold text-red-900">System Error</h2>
                                    <p className="text-red-600">{healthStatus.error}</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div>
                            {/* Overall Status */}
                            <div className="p-6 border-b border-gray-200">
                                <div className="flex items-center space-x-3">
                                    {healthStatus.constraints_valid ? (
                                        <CheckCircle className="h-8 w-8 text-green-500" />
                                    ) : (
                                        <XCircle className="h-8 w-8 text-red-500" />
                                    )}
                                    <div>
                                        <h2 className="text-lg font-semibold text-gray-900">Database Health</h2>
                                        <p className={`text-sm ${healthStatus.constraints_valid ? 'text-green-600' : 'text-red-600'}`}>
                                            Database Constraints: {healthStatus.constraints_valid ? 'Valid' : 'Invalid'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Issues Section */}
                            {healthStatus.issues && healthStatus.issues.length > 0 && (
                                <div className="p-6 border-b border-gray-200 bg-red-50">
                                    <div className="flex items-start space-x-3">
                                        <AlertTriangle className="h-6 w-6 text-red-500 flex-shrink-0 mt-0.5" />
                                        <div className="flex-1">
                                            <h3 className="text-base font-semibold text-red-900 mb-3">Issues Detected</h3>
                                            <ul className="space-y-2">
                                                {healthStatus.issues.map((issue: string, index: number) => (
                                                    <li key={index} className="flex items-start space-x-2">
                                                        <XCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                                                        <span className="text-red-700 text-sm">{issue}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Successes Section */}
                            {healthStatus.successes && healthStatus.successes.length > 0 && (
                                <div className="p-6 bg-green-50">
                                    <div className="flex items-start space-x-3">
                                        <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0 mt-0.5" />
                                        <div className="flex-1">
                                            <h3 className="text-base font-semibold text-green-900 mb-3">System Status</h3>
                                            <ul className="space-y-2">
                                                {healthStatus.successes.map((success: string, index: number) => (
                                                    <li key={index} className="flex items-start space-x-2">
                                                        <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                                                        <span className="text-green-700 text-sm">{success}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* No Issues */}
                            {(!healthStatus.issues || healthStatus.issues.length === 0) && 
                             (!healthStatus.successes || healthStatus.successes.length === 0) && (
                                <div className="p-6 text-center">
                                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                                    <h3 className="text-lg font-semibold text-gray-900">All Systems Operational</h3>
                                    <p className="text-gray-600 mt-1">No issues detected with the system.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {!healthStatus && !loading && (
                <div className="bg-white shadow rounded-lg p-6 text-center">
                    <p className="text-gray-600">Click "Refresh" to check system health status.</p>
                </div>
            )}
        </div>
    );
}

export default HealthCheck;