/*
 * Create and export configuration variables
 *
 */

const environments = {
  staging: {
    port: 3000,
    envName: 'staging',
  },
  production: {
    port: 5000,
    envName: 'production',
  },
};

const currentEnvironment = !!process.env.NODE_ENV ? process.env.NODE_ENV.toLowerCase() : '';

const exportEnvironment = typeof(environments[currentEnvironment]) === 'object' ? environments[currentEnvironment] : environments.staging;

module.exports = exportEnvironment;
