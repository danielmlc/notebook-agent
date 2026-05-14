import eslintConfig from '@cs/js-eslint-config-library';

export default eslintConfig({
  ignores: ['dist'],
  formatters: {
    css: false,
    html: false,
  },
  typescript: true,
  vue: false,
  // 自定义验证规则
  rules: {
    'no-console': 'off' /* 允许使用console.log */,
  },
});
