export function requireEnv(name) {
    const value = process.env[name];

    if (!value) {
        throw new Error(`${name} environment variable is required`);
    }

    return value;
}