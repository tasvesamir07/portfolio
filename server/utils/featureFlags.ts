export const isFeatureEnabled = (flagName: string): boolean => {
    if (!flagName) return false;
    const envVar = `FEATURE_${flagName.toUpperCase()}`;
    return process.env[envVar] === 'true';
};
