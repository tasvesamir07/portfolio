/**
 * Check if a feature is enabled via environment variables.
 * Format in env: FEATURE_FLAG_NAME=true
 */
const isFeatureEnabled = (flagName) => {
    if (!flagName) return false;
    const envVar = `FEATURE_${flagName.toUpperCase()}`;
    return process.env[envVar] === 'true';
};

module.exports = { isFeatureEnabled };
