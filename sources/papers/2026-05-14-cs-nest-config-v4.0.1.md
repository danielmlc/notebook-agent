---
title: "@cs/nest-config · 源码整理 v4.0.1"
type: source
aliases: ["@cs/nest-config 源码", "nest-config 源码"]
tags: [nestjs, mwp, code-docs, config, nacos, yaml]
status: stable
version: "4.0.1"
created: 2026-05-14
updated: 2026-05-14
source_type: paper
source_url: "file:///C:/work/project/mwp-packages-project/apps/code-docs/output/nest-config.md"
source_author: danielmlc
source_date: 2026-05-14
---

# @cs/nest-config · 源码整理

## 元信息

- 类型：工作类代码文档（@cs 平台包）
- 归属项目：MWP Packages Project
- 版本：4.0.1
- 作者：danielmlc
- 摄入日期：2026-05-14
- 摄入方式：文件路径模式

## 正文 / 摘录

> 此处存放原始资料正文。**只追加、不修改。**

### @cs/nest-config代码库源码整理

#### 代码目录
```
@cs/nest-config/
├── src/
├── config/
│   ├── config.default.ts
│   ├── config.env.ts
│   ├── config.schema.interface.ts
│   └── constants.ts
├── config.module.ts
├── config.reslove.ts
├── config.service.ts
├── config.utlis.ts
├── index.ts
├── nacos.config.ts
└── nacos.constants.ts
└── package.json
```

#### 代码文件

> 代码路径  `package.json`

```json
{
  "name": "@cs/nest-config",
  "version": "4.0.1",
  "description": "配置管理",
  "author": "danielmlc <danielmlc@126.com>",
  "homepage": "",
  "license": "ISC",
  "main": "lib/index.js",
  "directories": {
    "lib": "lib"
  },
  "files": [
    "lib"
  ],
  "scripts": {
    "prebuild": "rimraf lib",
    "build": "tsc -p ./tsconfig.json",
    "watch": "tsc -p ./tsconfig.json --watch",
    "publish": "pnpm publish --no-git-checks",
    "pre-publish:beta": "pnpm version prerelease --preid=beta",
    "publish:beta": "pnpm run pre-publish:beta && pnpm publish --no-git-checks --tag beta"
  },
  "dependencies": {
    "axios": "^0.27.2",
    "js-yaml": "^4.1.0",
    "lodash": "^4.17.21",
    "nacos": "^2.6.0"
  },
  "devDependencies": {
    "@types/js-yaml": "^4.0.5"
  },
  "peerDependencies": {
    "@cs/nest-common": "workspace:^"
  },
  "peerDependenciesMeta": {
    "@cs/nest-common": {
      "optional": false
    }
  }
}
```


> 代码路径  `src\config.module.ts`

```typescript
import { DynamicModule, Provider } from '@nestjs/common';
import { ConfigService } from './config.service';
import { CONFIG_OPTIONS } from './config/constants';
import {
  ConfigOptions,
  ConfigAsyncOptions,
} from './config/config.schema.interface';
import { getRemoteConfig } from './config.utlis';

function createConfigServiceProvider(): Provider {
  return {
    provide: ConfigService,
    useFactory: (configData: any) => new ConfigService(configData),
    inject: [CONFIG_OPTIONS],
  };
}

export class ConfigModule {
  static forRoot(options: ConfigOptions, isGlobal = true): DynamicModule {
    return {
      module: ConfigModule,
      global: isGlobal,
      providers: [
        {
          provide: CONFIG_OPTIONS,
          useFactory: async () => getRemoteConfig(options, options.configFrom ?? 'gitea'),
        },
        createConfigServiceProvider(),
      ],
      exports: [ConfigService, CONFIG_OPTIONS],
    };
  }

  static forRootAsync(
    options: ConfigAsyncOptions,
    isGlobal = true,
  ): DynamicModule {
    return {
      module: ConfigModule,
      global: isGlobal,
      imports: options.imports,
      providers: [
        {
          provide: CONFIG_OPTIONS,
          useFactory: options.useFactory,
          inject: options.inject,
        },
        createConfigServiceProvider(),
      ],
      exports: [ConfigService, CONFIG_OPTIONS],
    };
  }
}

```


> 代码路径  `src\config.reslove.ts`

```typescript
import { load } from 'js-yaml';
import { readFileSync, existsSync } from 'fs';
import { defaultsDeep } from 'lodash';
import { resolve } from 'path';
import { Logger } from '@nestjs/common';
import {
  ConfigSchema,
  YamlConfigSchema,
  CoverConfig,
  ConfigOptions,
} from './config/config.schema.interface';
import { defaultConfig } from './config/config.default';
import { defaultEnvConfig } from './config/config.env';

const logger = new Logger('ConfigInitialize');

export const resloveConfig = (
  options: ConfigOptions,
  remoteConfig: any,
  replaceVariablesFn?: (config: any, variables: Record<string, any>) => any,
): ConfigSchema => {
  try {
    const { onlyLocal, configFilePath } = options;
    let currentConfig: ConfigSchema;
    const localConfig: YamlConfigSchema = readLocalFile(configFilePath);
    let profilesActive = '' as string;
    const localDevEnvs = ['dev', 'beta', 'dev-mc'];
    // 检测给运行环境给默认值
    if (!process.env.CS_SERVICEENV) {
      process.env.CS_SERVICEENV = 'dev';
    }
    // 加载本地文件
    if (localConfig) {
      profilesActive = localConfig.application['profiles.active'] || '';
    }
    // 合并配置
    if (onlyLocal) {
      // 只读本地配置，支持多 profile 合并（优先级从左到右递增）
      const envArr = profilesActive.split(',').map((s) => s.trim()).filter(Boolean);
      let envConfig = {};
      envArr.forEach((item) => {
        envConfig = defaultsDeep(
          localConfig[`profiles.${item}`] || {},
          envConfig,
        );
      });
      currentConfig = defaultsDeep(
        localConfig.application,
        envConfig,
        defaultConfig, // 系统包默认配置
      );
    } else {
      const coverConfig = remoteConfig['applicationCover'];
      const appConfig = remoteConfig['application'].application;
      const serverConfig: YamlConfigSchema = remoteConfig.serviceConfig || {};
      // 获取公共敏感配置
      const commonSecrets = remoteConfig['commonSecrets'] || {};

      if (localDevEnvs.includes(process.env.CS_SERVICEENV) && localConfig) {
        // 本地开发环境下
        const envArr = profilesActive.split(',');
        let envConfig = {};
        envArr.forEach((item) => {
          if (localDevEnvs.includes(item)) {
            envConfig = defaultsDeep(envConfig, serverConfig.application);
          } else {
            envConfig = defaultsDeep(
              localConfig[`profiles.${item}`],
              envConfig,
            );
          }
        });
        // 合并最终结果
        currentConfig = defaultsDeep(
          localConfig.application || {}, // 服务配置
          envConfig,
          appConfig, // 服务默认配置
          defaultConfig, // 系统包默认配置
        );
      } else {
        // 合并配置
        currentConfig = defaultsDeep(
          serverConfig.application, // 服务配置
          appConfig, // 服务默认配置
          defaultConfig, // 系统包默认配置
        );
      }
      // 处理覆盖配置的情况？？
      currentConfig = coverConfigFn(currentConfig, coverConfig);
      // logger.log(currentConfig);

      // 变量替换：将 ${variable} 替换为实际值
      if (replaceVariablesFn && Object.keys(commonSecrets).length > 0) {
        // logger.log('检测到公共敏感配置，开始变量替换...');
        currentConfig = replaceVariablesFn(currentConfig, commonSecrets);
        // logger.log('变量替换完成!');
      }
    }
    convertType(currentConfig);
    // 转化配置注入到系统变量
    read2Env(currentConfig);
    logger.log('配置加载成功!');
    return currentConfig;
  } catch (e) {
    logger.error('Parse configuration exception:' + e);
    throw new Error(e);
  }
};

const coverConfigFn = (
  config: ConfigSchema,
  coverConfig: CoverConfig,
): ConfigSchema => {
  for (const key in config) {
    if (key === 'mysql') {
      for (const ikey in config[key]) {
        config[key][ikey] = defaultsDeep(
          {},
          coverConfig[key],
          config[key][ikey],
        );
      }
    }
    if (key.startsWith('profiles.')) {
      delete config[key];
    }
  }
  return config;
};

const readLocalFile = (filePath: string): YamlConfigSchema => {
  filePath = resolve(process.cwd(), filePath);
  if (existsSync(filePath)) {
    return load(readFileSync(filePath, 'utf8')) as YamlConfigSchema;
  }
};

const convertType = (config: any): void => {
  for (const key in config) {
    if (!Object.prototype.hasOwnProperty.call(config, key)) continue;
    const val = config[key];

    // 递归处理嵌套对象（排除数组和 null）
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      convertType(val);
      continue;
    }

    // 将字符串形式的布尔值转为 boolean
    if (val === 'true') {
      config[key] = true;
      continue;
    }
    if (val === 'false') {
      config[key] = false;
      continue;
    }

    // 将字符串形式的数字转为 number（排除空字符串）
    if (typeof val === 'string' && val.trim() !== '' && !isNaN(Number(val))) {
      config[key] = Number(val);
    }
  }
};

const read2Env = (config: ConfigSchema): void => {
  for (const key in defaultEnvConfig) {
    if (!Object.prototype.hasOwnProperty.call(defaultEnvConfig, key)) {
      continue;
    }

    const value = defaultEnvConfig[key];
    if (typeof value === 'object') {
      for (const ikey in value) {
        const objectConfig = config[key] || value;
        process.env[`CS_${key.toUpperCase()}_${ikey.toUpperCase()}`] =
          objectConfig[ikey];
      }
    } else {
      process.env[`CS_${key.toUpperCase()}`] = config[key] || value;
    }
  }
};

```


> 代码路径  `src\config.service.ts`

```typescript
import { Inject, Injectable, Optional } from '@nestjs/common';
import { get as _get } from 'lodash';
import { CONFIG_OPTIONS } from './config/constants';
import { ConfigSchema } from './config/config.schema.interface';

@Injectable()
export class ConfigService {
  constructor(
    @Optional() @Inject(CONFIG_OPTIONS)
    private config: ConfigSchema,
  ) { }

  /**
   * 获取指定键的配置值，支持嵌套路径（如 'mysql.default.host'）
   */
  get (key: string): any {
    return _get(this.config, key);
  }

  isConfig (key: string): boolean {
    return !!this.config[key];
  }

  getAll (): ConfigSchema {
    return this.config;
  }
}

```


> 代码路径  `src\config.utlis.ts`

```typescript
/* eslint-disable prefer-spread */
import { resolve } from 'path';
import { readFileSync, existsSync } from 'fs';
import { load } from 'js-yaml';
import * as os from 'os';
import axios from 'axios';
import { Logger, HttpException, HttpStatus } from '@nestjs/common';
import { NacosConfig } from './nacos.config';
import { resloveConfig } from './config.reslove';
import {
  ConfigSchema,
  ConfigOptions,
  ConfigFrom,
  GiteaOptions,
} from './config/config.schema.interface';
import {
  NACOS_NAME,
  NACOS_NAMESPACE,
  NACOS_PASSWORD,
  NACOS_ADMIN_NAMESPACE_SUFFIX,
} from './nacos.constants';

const logger = new Logger('ConfigInitialize');

type ConfigFromStrategy = (configOption?: ConfigOptions) => Promise<any>;

/**
 * 变量替换工具函数
 * 将配置中的 ${variable.path} 替换为实际值
 * @param config 需要替换的配置对象
 * @param variables 变量上下文对象
 * @returns 替换后的配置对象
 */
export function replaceVariables (
  config: any,
  variables: Record<string, any>,
): any {
  if (!config || !variables) {
    return config;
  }

  // 处理基本类型（字符串）
  if (typeof config === 'string') {
    return replaceStringVariables(config, variables);
  }

  // 处理数组
  if (Array.isArray(config)) {
    return config.map((item) => replaceVariables(item, variables));
  }

  // 处理对象
  if (typeof config === 'object' && config !== null) {
    const result: Record<string, any> = {};
    for (const key in config) {
      if (Object.prototype.hasOwnProperty.call(config, key)) {
        result[key] = replaceVariables(config[key], variables);
      }
    }
    return result;
  }

  return config;
}

/**
 * 替换字符串中的变量引用
 * 支持 ${variable.path} 语法
 */
function replaceStringVariables (
  str: string,
  variables: Record<string, any>,
): any {
  // 匹配 ${variable.path} 格式的变量
  const variablePattern = /\$\{([a-zA-Z0-9_.]+)\}/g;

  // 如果整个字符串就是一个变量引用，直接返回值（保持原始类型）
  const fullMatch = str.match(/^\$\{([a-zA-Z0-9_.]+)\}$/);
  if (fullMatch) {
    const value = getNestedValue(variables, fullMatch[1]);
    if (value !== undefined) {
      return value;
    }
    logger.warn(`变量 ${fullMatch[1]} 未定义，保持原值`);
    return str;
  }

  // 替换字符串中的多个变量引用
  return str.replace(variablePattern, (match, variablePath) => {
    const value = getNestedValue(variables, variablePath);
    if (value !== undefined) {
      return String(value);
    }
    logger.warn(`变量 ${variablePath} 未定义，保持原值 ${match}`);
    return match;
  });
}

/**
 * 从对象中获取嵌套属性值
 * 支持路径语法，如 "mysql.host" 或 "mysql"
 */
function getNestedValue (obj: Record<string, any>, path: string): any {
  const keys = path.split('.');
  let value = obj;

  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key];
    } else {
      return undefined;
    }
  }

  return value;
}

/**
 * 读取本机全局 bootstrap 配置 ~/.cs/config.json
 * 明文 KV，Nacos 和 Gitea 共用
 */
export function readLocalBootstrap (): Record<string, string> {
  const bootstrapPath = resolve(os.homedir(), '.cs', 'config.json');
  if (!existsSync(bootstrapPath)) {
    return {};
  }
  try {
    const raw = JSON.parse(readFileSync(bootstrapPath, 'utf8')) as Record<
      string,
      string
    >;
    if (!raw || typeof raw !== 'object') return {};
    return raw;
  } catch {
    logger.warn('读取 ~/.cs/config.json 失败，跳过本机 bootstrap 配置');
    return {};
  }
}

/**
 * 合并多来源 Gitea 连接配置
 * 优先级：options.gitea > ~/.cs/config.yaml > 环境变量 > 内置默认值
 */
export function resolveGiteaOptions (
  gitea?: GiteaOptions,
): Required<GiteaOptions> {
  const bootstrap = readLocalBootstrap();

  const serverUrl =
    gitea?.serverUrl ??
    bootstrap['CS_GITEA_SERVER_URL'] ??
    process.env.CS_GITEA_SERVER_URL;

  const token =
    gitea?.token ?? bootstrap['CS_GITEA_TOKEN'] ?? process.env.CS_GITEA_TOKEN;

  const owner =
    gitea?.owner ?? bootstrap['CS_GITEA_OWNER'] ?? process.env.CS_GITEA_OWNER;

  const adminRepo =
    gitea?.adminRepo ??
    bootstrap['CS_GITEA_ADMIN_REPO'] ??
    process.env.CS_GITEA_ADMIN_REPO ??
    'admin-config';

  const branch =
    gitea?.branch ??
    bootstrap['CS_GITEA_BRANCH'] ??
    process.env.CS_GITEA_BRANCH ??
    'master';

  const missing = ['serverUrl', 'token', 'owner'].filter(
    (k) => !{ serverUrl, token, owner }[k],
  );
  if (missing.length > 0) {
    throw new Error(
      `Gitea 连接配置缺少必填项：${missing.join(', ')}。` +
      `请在 ~/.cs/config.json 或环境变量中配置对应的 CS_GITEA_* 值。`,
    );
  }

  return { serverUrl, token, owner, adminRepo, branch };
}

/**
 * 调用 Gitea File API 获取单个文件内容并解析为 YAML 对象
 * 文件不存在（404）时返回 {}
 */
async function fetchGiteaFile (
  serverUrl: string,
  token: string,
  owner: string,
  repo: string,
  filePath: string,
  branch: string,
): Promise<any> {
  const url = `${serverUrl}/api/v1/repos/${owner}/${repo}/contents/${filePath}`;
  try {
    const response = await axios.get(url, {
      params: { ref: branch },
      headers: { Authorization: `token ${token}` },
    });
    const content = Buffer.from(response.data.content, 'base64').toString(
      'utf8',
    );
    return load(content) ?? {};
  } catch (error) {
    if (error.response?.status === 404) {
      console.warn(`[Gitea] 404 ${repo}/${filePath} 文件不存在，跳过`);
      return {};
    }
    throw error;
  }
}

export async function getRemoteConfig (
  configOption: ConfigOptions,
  strategyType: ConfigFrom = 'gitea',
): Promise<ConfigSchema | undefined> {
  // bootstrap 中的 CS_SERVICEENV 注入到环境变量，供后续所有逻辑感知
  if (!process.env.CS_SERVICEENV) {
    const bootstrap = readLocalBootstrap();
    if (bootstrap['CS_SERVICEENV']) {
      process.env.CS_SERVICEENV = bootstrap['CS_SERVICEENV'];
    }
  }

  let remoteConfig: any;

  if (strategyType === 'gitea') {
    remoteConfig = await fromGiteaStrategy(configOption);
  } else if (strategyType === 'nacos') {
    remoteConfig = await fromNacosStrategy(configOption);
  } else {
    logger.log('不支持当前类型的配置方式！');
    return;
  }

  if (!remoteConfig) {
    logger.error('远程配置获取为null,请检查配置是否正常！');
    return;
  }

  if (!configOption.configFilePath) {
    configOption.configFilePath = './dist/config.yaml';
  }

  return resloveConfig(configOption, remoteConfig, replaceVariables);
}

let counter = 0;
/**
 * 从服务器地址字符串中轮询选择一个IP地址
 * @param serverAddr
 * @returns 选中的IP地址字符串
 */
function selectServerAddress (serverAddr: string): string {
  if (!serverAddr) {
    throw new Error('serverAddr cannot be empty');
  }

  const ipList = serverAddr
    .split(',')
    .map((ip) => ip.trim())
    .filter((ip) => ip);

  if (ipList.length === 0) {
    throw new Error('No valid IP addresses found');
  }

  const selectedIP = ipList[counter % ipList.length];
  counter = (counter + 1) % ipList.length;

  return selectedIP;
}

const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

const isRetryableError = (error: any): boolean => {
  // 检查网络相关错误代码
  if (
    error.code === 'ECONNREFUSED' ||
    error.code === 'ENOTFOUND' ||
    error.code === 'ETIMEDOUT' ||
    error.code === 'ECONNRESET'
  ) {
    return true;
  }

  // 检查HTTP响应状态码
  if (error.response && error.response.status >= 500) {
    return true;
  }

  // 检查超时错误类型
  if (
    error.name === 'ResponseTimeoutError' ||
    error.message?.includes('no response') ||
    error.message?.includes('timeout')
  ) {
    return true;
  }

  return false;
};

const withRetry = async <T> (
  operation: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000,
): Promise<T> => {
  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries || !isRetryableError(error)) {
        throw error;
      }

      const delay = baseDelay * Math.pow(2, attempt);
      logger.warn(
        `Nacos配置获取失败，进行第${attempt + 1}次重试 (${attempt + 1}/${maxRetries}): ${error.message}`,
      );
      await sleep(delay);
    }
  }

  throw lastError;
};

const customLogger = () => {
  const logger = new Logger('NACOS Logger');
  return {
    info: (...args: any[]) => logger.verbose.apply(logger, args),
    error: (...args: any[]) => logger.error.apply(logger, args),
    warn: (...args: any[]) => logger.warn.apply(logger, args),
    debug: (...args: any[]) => logger.debug.apply(logger, args),
    verbose: (...args: any[]) => logger.verbose.apply(logger, args),
  };
};

const fromNacosStrategy: ConfigFromStrategy = async (
  configOption?: ConfigOptions,
): Promise<any> => {
  try {
    let config = null;
    const packagePath = resolve(process.cwd(), './package.json');
    const serviceName = JSON.parse(readFileSync(packagePath).toString()).name;

    // 读取本机 bootstrap 配置，优先级：bootstrap > 环境变量 > 默认值
    const bootstrap = readLocalBootstrap();
    const nacosName =
      bootstrap['CS_NACOSNAME'] || process.env.CS_NACOSNAME || NACOS_NAME;
    const nacosPassword =
      bootstrap['CS_NACOSPASSWORD'] ||
      process.env.CS_NACOSPASSWORD ||
      NACOS_PASSWORD;
    const namespace = process.env.CS_SERVICEENV || NACOS_NAMESPACE;
    const adminNamespace =
      configOption?.adminNamespace ||
      bootstrap['CS_ADMINNAMESPACE'] ||
      process.env.CS_ADMINNAMESPACE ||
      namespace + NACOS_ADMIN_NAMESPACE_SUFFIX;
    const serverAddr =
      bootstrap['CS_NACOSSERVERIP'] || process.env.CS_NACOSSERVERIP;

    // 同步环境变量
    process.env.CS_NACOSNAME = nacosName;
    process.env.CS_NACOSPASSWORD = nacosPassword;

    // logger.log(`主命名空间: ${namespace}, 管理命名空间: ${adminNamespace}`);

    if (serviceName) {
      const selectedServer = selectServerAddress(serverAddr);

      // 创建主命名空间的客户端（获取服务配置）
      const mainNamespaceClient = new NacosConfig({
        logger: customLogger(),
        serverAddr: selectedServer,
        namespace: namespace,
        username: nacosName,
        password: nacosPassword,
        requestTimeout: 6000,
      });

      // 创建管理命名空间的客户端（获取敏感配置）
      const adminNamespaceClient = new NacosConfig({
        logger: customLogger(),
        serverAddr: selectedServer,
        namespace: adminNamespace,
        username: nacosName,
        password: nacosPassword,
        requestTimeout: 6000,
      });

      // 使用重试机制包裹配置获取操作
      // 由于每次getNacosConfig都会创建新的客户端实例，重试机制现在工作得更好
      config = await withRetry(async () => {
        // 从主命名空间获取服务配置
        const serviceConfig = await mainNamespaceClient.getNacosConfig(
          serviceName,
          'DEFAULT_GROUP',
        );

        // 从管理命名空间获取敏感配置
        const application = await adminNamespaceClient.getNacosConfig(
          '.application',
          'DEFAULT_GROUP',
        );

        const applicationCover = await adminNamespaceClient.getNacosConfig(
          '.application-cover',
          'DEFAULT_GROUP',
        );

        // 获取公共敏感配置（集中管理密码、密钥等）
        const commonSecrets = await adminNamespaceClient.getNacosConfig(
          '.common-secrets',
          'DEFAULT_GROUP',
        );

        return {
          application: load(application),
          applicationCover: load(applicationCover),
          serviceConfig: load(serviceConfig),
          commonSecrets: load(commonSecrets),
        };
      });
    } else {
      throw new HttpException(
        '未获取到serviceName',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    return config;
  } catch (error) {
    logger.error(`获取配置异常: ${error.message}`);
    throw error;
  }
};

const fromGiteaStrategy: ConfigFromStrategy = async (
  configOption?: ConfigOptions,
): Promise<any> => {
  const { serverUrl, token, owner, adminRepo, branch } = resolveGiteaOptions(
    configOption?.gitea,
  );

  const packagePath = resolve(process.cwd(), './package.json');
  const serviceName = JSON.parse(readFileSync(packagePath).toString()).name;
  const env = process.env.CS_SERVICEENV || 'dev';
  const serviceRepo = `${env}-config`;

  const [serviceConfig, application, applicationCover, commonSecrets] =
    await Promise.all([
      fetchGiteaFile(
        serverUrl,
        token,
        owner,
        serviceRepo,
        `${serviceName}.yaml`,
        branch,
      ),
      fetchGiteaFile(
        serverUrl,
        token,
        owner,
        adminRepo,
        `${env}/.application.yaml`,
        branch,
      ),
      fetchGiteaFile(
        serverUrl,
        token,
        owner,
        adminRepo,
        `${env}/.application-cover.yaml`,
        branch,
      ),
      fetchGiteaFile(
        serverUrl,
        token,
        owner,
        adminRepo,
        `${env}/.common-secrets.yaml`,
        branch,
      ),
    ]);

  return { application, applicationCover, serviceConfig, commonSecrets };
};

export const getMac = (): string => {
  const interfaces = os.networkInterfaces();
  for (const dev in interfaces) {
    const iface = interfaces[dev];
    if (!iface) continue;

    for (const alias of iface) {
      if (
        alias.family === 'IPv4' &&
        alias.mac &&
        alias.mac !== '00:00:00:00:00:00'
      ) {
        return alias.mac;
      }
    }
  }
  return '00:00:00:00:00:00';
};

```


> 代码路径  `src\index.ts`

```typescript
export * from './config.module';
export * from './config.service';
export * from './config/config.schema.interface';
export * from './config.utlis';
export * from './nacos.constants';
export * from './config.reslove';

```


> 代码路径  `src\nacos.config.ts`

```typescript
import { NacosConfigClient } from 'nacos';
import { Logger, LoggerService } from '@nestjs/common';

export interface NacosOptions {
  logger?: any;
  serverAddr: string;
  namespace: string;
  username: string;
  password: string;
  requestTimeout: number;
}

export class NacosConfig {
  private logger: LoggerService;
  private nacosOptions: NacosOptions;

  constructor(nacosOptions: NacosOptions) {
    this.logger = new Logger('ConfigInitialize');
    this.nacosOptions = nacosOptions;
  }

  private createClient (): NacosConfigClient {
    return new NacosConfigClient(this.nacosOptions);
  }

  async getNacosConfig (
    dataId: string,
    groupId: string,
    options?: any,
  ): Promise<any> {
    if (!dataId || !groupId) {
      this.logger.warn('获取nacos配置参数信息缺失！');
      return null;
    }

    // 每次获取配置时都创建新的客户端实例，避免SDK内部缓存或状态共享
    const client = this.createClient();

    const result = await client.getConfig(dataId, groupId, options);

    // 立即关闭客户端
    await client.close();
    return result;
  }
}

```


> 代码路径  `src\nacos.constants.ts`

```typescript
// NACOS账号
export const NACOS_NAME = 'nacos';
// NACOS密码
export const NACOS_PASSWORD = 'nacos';
// NACOS默认环境
export const NACOS_NAMESPACE = 'dev';
// NACOS管理命名空间后缀
export const NACOS_ADMIN_NAMESPACE_SUFFIX = '-admin';

```


> 代码路径  `src\config\config.default.ts`

```typescript
export const defaultConfig = {};

```


> 代码路径  `src\config\config.env.ts`

```typescript
import { EnvConfig } from './config.schema.interface';
import { CommonUtil } from '@cs/nest-common';

export const defaultEnvConfig: EnvConfig = {
  host: CommonUtil.getIPAdress(),
  port: 8080,
  name: 'nest-app-server',
  serverPath: '',
  env: 'dev',
  docs: {
    name: '',
    describe: '',
    version: 0,
  },
};

```


> 代码路径  `src\config\config.schema.interface.ts`

```typescript
import { ModuleMetadata } from '@nestjs/common';

export type ConfigFrom = 'gitea' | 'nacos';

export interface GiteaOptions {
  /** Gitea 服务器地址，如 'https://gitea.example.com' */
  serverUrl?: string;
  /** Gitea Access Token */
  token?: string;
  /** 仓库所有者/组织名 */
  owner?: string;
  /** 管理配置仓库名，默认 'admin-config' */
  adminRepo?: string;
  /** 分支名，默认 'master' */
  branch?: string;
}

export interface ConfigOptions {
  configFilePath?: string;
  configFrom?: ConfigFrom;
  onlyLocal?: boolean;
  /**
   * 管理员命名空间，用于存放敏感配置文件
   * 如 .application-cover、.application、.common-secrets
   * 默认为主命名空间 + '-admin' 后缀
   * 示例：如果主命名空间是 'dev'，管理命名空间默认为 'dev-admin'
   */
  adminNamespace?: string;
  /** Gitea 配置，configFrom 为 'gitea' 时使用，所有字段可从 ~/.cs/config.yaml 中读取 */
  gitea?: GiteaOptions;
}

export interface ConfigAsyncOptions
  extends Pick<ModuleMetadata, 'imports'> {
  useFactory?: (...args: any[]) => ConfigSchema | Promise<ConfigSchema>;
  inject?: any[];
}

export interface ConfigSchema {
  name: string;
  port: number;
  serverPath: string;
  env?: string;
  docs?: Document;
  'profiles.active'?: string;
  [key: string]: any;
}

export interface YamlConfigSchema {
  application: ConfigSchema;
}

export interface Document {
  name: string;
  describe: string;
  version: number;
}

export interface Mysql {
  type: string;
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  synchronize: boolean;
  timeout: number;
  logging: boolean;
}

export interface EnvConfig {
  host: string;
  port: number;
  name: string;
  serverPath: string;
  env: string;
  docs: Document;
}

export interface CoverConfig {
  env: string;
  mysql: Mysql;
}

```


> 代码路径  `src\config\constants.ts`

```typescript
export const CONFIG_OPTIONS = 'CONFIG_OPTIONS';

```


#### 代码说明

# @cs/nest-config
 一个功能强大且灵活的 NestJS 配置管理模块，支持本地配置文件、远程配置中心（Nacos/Gitea）、环境变量配置以及配置的动态合并与覆盖。  

## 特性
+ ✨ 支持多种配置源：本地配置文件 (YAML/JSON)、Nacos 远程配置、Gitea
+ 🔥 完全类型安全的配置访问
+ 🚀 支持模块化和全局配置
+ 📦 深度集成 NestJS 依赖注入系统
+ 🛡️ 内置配置验证和错误处理
+ 🔄 支持异步配置初始化
+ 🔐 支持配置变量替换，敏感信息集中管理

## 安装
```bash
npm install @cs/nest-config
# 或
yarn add @cs/nest-config
# 或
pnpm add @cs/nest-config
```

## 快速开始


> configModule在装饰器`CSModule`中默认全局注入到服务中。使用时直接引入`configService`直接使用即可。不需要单独注册 该模块
>

### 基础用法
```typescript
import { ConfigModule, ConfigService } from '@cs/nest-config';
import { Module } from '@nestjs/common';

@Module({
  imports: [
    ConfigModule.forRoot({
      configFilePath: './config.yaml', // 本地配置文件路径
      onlyLocal: true, // 仅使用本地配置
    }),
  ],
})
export class AppModule {}

// 注入并使用配置服务
@Injectable()
export class AppService {
  constructor(private readonly configService: ConfigService) {}

  getDatabaseConfig() {
    const dbConfig = this.configService.get('mysql');
    return dbConfig;
  }

  checkConfig() {
    if (this.configService.isConfig('redis')) {
      // 检查配置存在
    }
  }

  getAllConfig() {
    // 获取所有配置
    const all = this.configService.getAll()
  }
}
```

### 使用 Nacos 远程配置
```typescript
import { ConfigModule } from '@cs/nest-config';

@Module({
  imports: [
    ConfigModule.forRoot({
      configFrom: 'nacos',
      configFilePath: './config.yaml', // 本地配置作为备选
    }),
  ],
})
export class AppModule {}
```

### 异步配置初始化
```typescript
@Module({
  imports: [
    ConfigModule.forRootAsync({
      imports: [SomeModule],
      useFactory: async (someService: SomeService) => {
        const config = await someService.getConfig();
        return config;
      },
      inject: [SomeService],
    }),
  ],
})
export class AppModule {}
```

### 配置文件示例
```yaml
application:
  name: my-app
  port: 3000
  serverPath: /api
  env: dev
  docs:
    name: API Documentation
    describe: My App API
    version: 1
  logger:
    level: debug
    errorLogName: error.log
```

## API 参考
### ConfigModule
#### `forRoot(options: ConfigOptions, isGlobal = true)`
同步初始化配置模块。

参数：

+ `options`: 配置选项
    - `configFilePath`: 本地配置文件路径
    - `configFrom`: 配置源（`'gitea'` | `'nacos'`），默认 `'gitea'`
    - `onlyLocal`: 是否仅使用本地配置，默认 `false`
    - `adminNamespace`: Nacos 管理命名空间（可选，默认主命名空间 + `-admin`）
    - `gitea`: Gitea 连接配置（可选，优先级高于 `~/.cs/config.json`）
      - `serverUrl`: Gitea 服务器地址
      - `token`: Access Token
      - `owner`: 仓库所有者/组织名
      - `adminRepo`: 管理配置仓库名，默认 `admin-config`
      - `branch`: 分支名，默认 `master`
+ `isGlobal`: 是否为全局模块（默认 true）

#### `forRootAsync(options: ConfigAsyncOptions, isGlobal = true)`
异步初始化配置模块。

参数：

+ `options`: 异步配置选项
    - `imports`: 导入的模块
    - `useFactory`: 配置工厂函数
    - `inject`: 注入的依赖
+ `isGlobal`: 是否为全局模块（默认 true）

### ConfigService
#### `get(key: string): any`
获取指定键的配置值。

```typescript
const port = configService.get('port');
const mysqlConfig = configService.get('mysql.default');
```

#### `isConfig(key: string): boolean`
检查指定键的配置是否存在。

```typescript
if (configService.isConfig('redis')) {
  // Redis 配置存在
}
```

#### `getAll(): ConfigSchema`
获取所有配置。

```typescript
const allConfig = configService.getAll();
```



## 本机 Bootstrap 配置（推荐）

配置中心的连接信息（服务器地址、Token 等）统一维护在本机 `~/.cs/config.json`，**所有项目共用，不进代码仓库**。

### 文件位置

| 操作系统 | 路径 |
|---------|------|
| macOS / Linux | `~/.cs/config.json` |
| Windows | `C:\Users\{用户名}\.cs\config.json` |

### 文件格式

```json
{
  "CS_SERVICEENV": "dev",

  "CS_GITEA_SERVER_URL": "https://gitea.example.com",
  "CS_GITEA_TOKEN": "your_personal_access_token",
  "CS_GITEA_OWNER": "your-org",

  "CS_NACOSSERVERIP": "192.168.1.100:8848",
  "CS_NACOSNAME": "nacos",
  "CS_NACOSPASSWORD": "nacos"
}
```

### 配置项说明

**通用**

| Key | 说明 | 是否必填 |
|-----|------|---------|
| `CS_SERVICEENV` | 当前环境（dev/test/pre/prod） | 必填 |

**Gitea 配置中心**

| Key | 说明 | 是否必填 |
|-----|------|---------|
| `CS_GITEA_SERVER_URL` | Gitea 服务器地址 | 必填 |
| `CS_GITEA_TOKEN` | Gitea Personal Access Token | 必填 |
| `CS_GITEA_OWNER` | 仓库所有者/组织名 | 必填 |
| `CS_GITEA_ADMIN_REPO` | 管理配置仓库名，默认 `admin-config` | 可选 |
| `CS_GITEA_BRANCH` | 分支名，默认 `master` | 可选 |

**Nacos 配置中心**

| Key | 说明 | 是否必填 |
|-----|------|---------|
| `CS_NACOSSERVERIP` | Nacos 地址，支持逗号分隔多地址 | 必填 |
| `CS_NACOSNAME` | Nacos 用户名 | 必填 |
| `CS_NACOSPASSWORD` | Nacos 密码 | 必填 |
| `CS_ADMINNAMESPACE` | 管理命名空间，默认主命名空间 + `-admin` | 可选 |

### 配置读取优先级

```
代码传入 options > ~/.cs/config.json > 环境变量 > 内置默认值
```

> `CS_SERVICEENV` 遵循「环境变量优先」原则：若进程启动时已通过环境变量注入（如 CI/CD），bootstrap 文件中的值不会覆盖它。

---

## 使用场景

### 1. 仅本地配置
适用于开发环境或不需要远程配置的场景：

```typescript
ConfigModule.forRoot({
  configFilePath: './config.yaml',
  onlyLocal: true
})
```

### 2. Gitea 配置中心（默认）

在 `~/.cs/config.json` 中配置好连接信息后，代码里只需指定 `configFrom`：

```typescript
ConfigModule.forRoot({
  configFrom: 'gitea',
  configFilePath: './config.yaml',
})
```

**Gitea 仓库结构约定：**

```
admin-config/               # 固定仓库名，存放所有环境公共配置
  dev/
    .application.yaml        # 公共默认配置
    .application-cover.yaml  # 覆盖配置
    .common-secrets.yaml     # 敏感变量
  test/
    ...

dev-config/                 # {env}-config 命名，存放服务配置
  {serviceName}.yaml
```

### 3. Nacos 配置中心
适用于微服务架构，使用 Nacos 作为配置中心：

```typescript
ConfigModule.forRoot({
  configFrom: 'nacos',
  configFilePath: './config.yaml',
})
```

### 3.1. Nacos 多命名空间配置（敏感配置隔离）
适用于需要将敏感配置与普通配置分开管理的场景：

**配置文件分布：**
- **主命名空间**（如 `dev`）：存放服务配置（`service-name.yaml`）
- **管理命名空间**（如 `dev-admin`）：存放敏感配置（`.application`、`.application-cover`、`.common-secrets`）

```typescript
// 默认管理命名空间（主命名空间 + '-admin'）
ConfigModule.forRoot({
  configFrom: 'nacos',
  onlyLocal: false,
});

// 显式指定管理命名空间
ConfigModule.forRoot({
  configFrom: 'nacos',
  onlyLocal: false,
  adminNamespace: 'dev-admin',
});
```

**权限控制优势：**
- 普通开发者：只能访问 `dev` 命名空间的服务配置
- 管理员：可以访问 `dev-admin` 命名空间的敏感配置
- 实现了配置的细粒度权限管理

### 3. 配置变量替换（敏感信息集中管理）
适用于需要集中管理密码、密钥等敏感信息的场景：

**在 Nacos 中创建 `.common-secrets` 配置文件：**
```yaml
# .common-secrets.yaml
databases:
  my_database:
    password: "db_password_123"
  test_db:
    password: "test_password_456"
redis:
  password: "redis_password_789"
```

**在服务配置中使用变量引用：**
```yaml
# service-name.yaml
mysql:
  primary:
    host: "192.168.1.100"
    port: 3306
    username: "root"
    password: "${databases.my_database.password}"  # 变量引用
    database: "my_database"
  replica:
    host: "192.168.1.101"
    port: 3306
    username: "root"
    password: "${databases.test_db.password}"  # 变量引用
    database: "test_db"
redis:
  host: "192.168.1.102"
  password: "${redis.password}"  # 变量引用
```

配置拉取时会自动将 `${variable.path}` 替换为实际值，实现敏感信息集中管理，一处修改全局生效。


## 配置合并策略
配置模块使用 lodash 的 `defaultsDeep` 进行深度合并，优先级如下（从高到低）：

1. **本地应用配置** (`application` 部分)
2. **环境特定配置** (`profiles.{env}` 部分)（优先级从左到右依次升高）
3. **远程应用配置** (从配置中心获取)
4. **系统默认配置** (内置默认值)

### 本地开发环境合并规则
在本地开发环境（`dev`、`beta`、`dev-mc`）下：

```plain
yaml

# 最终配置 = 本地应用配置 + 环境配置 + 远程配置 + 默认配置
```

### 生产环境合并规则
在生产环境下：

```plain
yaml

# 最终配置 = 远程服务配置 + 远程应用配置 + 默认配置
```

## 注意事项
```yaml
  # 应用环境变量(本地开发环境多套配置) 优先级从左到右依次升高，注意 本地环境application下的配置优先级最高
  profiles.active: 'dev,local'

 
#当本地有多套配置时采用profiles.[配置标识]进行分组， 由profiles.active配置加载顺序(本地开发环境配置)
profiles.local: 
   logger:
    level: 'info' # 日志级别 info, error, warn, debug, verbose
    timestamp: true # 是否开启时间戳
    disableConsoleAtProd: false # 是否在生产环境禁用控制台日志
    maxFileSize: '2m' # 单个日志文件最大大小

```



## 配置模板


### 本地开发配置模板


```yaml
application:  
  name: 'node-database-service'  
  port: 3023  # 部署环境中不需要配置
  serverPath: 'ormServer'
  profiles.active: 'local1,local'  # 应用环境变量(本地开发环境多套配置) 优先级从左到右依次升高，但本地文件配置都要优先级高于远程环境配置，注意 本地环境application下的配置优先级最高发环境中应用的那套配置（本地环境下可以有多套配置）
profiles.local: # local配置
  logger: 
    level: 'debug'
  docs: 
    name: 'orm方法测试服务'
    describe: 'orm方法测试服务'
    version: 1.4
  exceptionFilter:
    stack:
      response: true
      logger: true
profiles.local1: # local1配置
  logger: 
    level: 'debug'
  docs: 
    name: 'orm方法测试服务'
    describe: 'orm方法测试服务'
    version: 1.4
  exceptionFilter:
    stack:
      response: true
      logger: true

```

### 部署环境中配置模板
```yaml
application:
  name: 'node-database-service'
  serverPath: 'ormServer'
  logger:
    level: 'debug'
  docs:
    name: 'orm方法测试服务'
    describe: 'orm方法测试服务'
    version: 1.4
  exceptionFilter:
    stack:
      response: true
      logger: true
```

### 配置变量替换模板

**Nacos 公共敏感配置（`.common-secrets.yaml`）：**
```yaml
# 数据库密码配置 - 按数据库名称组织
databases:
  dev_tnt_mb:
    password: "dev_password_here"
  test:
    password: "test_password_here"
# Redis 配置
redis:
  password: "redis_password_here"
```

**服务配置使用变量引用：**
```yaml
application:
  mysql:
    record:
      host: ${databases.common.host}
      port: ${databases.common.port}
      username: '${databases.common.username}'
      password: '${databases.common.password}'  # 引用 .common-secrets 中的配置
      database: 'dev_tnt_mb'
    test:
      host: ${databases.common.host}
      port: ${databases.common.port}
      username: '${databases.common.username}'
      password: '${databases.common.password}'  # 引用 .common-secrets 中的配置
      database: 'test'
  redis:
    host: ${redis.host}
    port: ${redis.port}
    password: '${redis.password}'  # 引用 .common-secrets 中的配置
```



