const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Bản ESM (.mjs) của @anthropic-ai/sdk có import vòng, Metro nạp lỗi
// "Cannot access ... before initialization". Ép dùng bản CommonJS của gói này.
const upstream = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const resolve = upstream ?? context.resolveRequest;
  if (moduleName === '@anthropic-ai/sdk' || moduleName.startsWith('@anthropic-ai/sdk/')) {
    return resolve(
      { ...context, isESMImport: false, unstable_conditionNames: ['require', 'default'] },
      moduleName,
      platform,
    );
  }
  return resolve(context, moduleName, platform);
};

module.exports = config;
