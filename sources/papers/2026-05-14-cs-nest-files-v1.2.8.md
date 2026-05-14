---
title: "@cs/nest-files · 源码整理 v1.2.8"
type: source
aliases: ["@cs/nest-files 源码", "nest-files 源码"]
tags: [nestjs, mwp, code-docs, files, storage, oss, minio, cos]
status: stable
version: "1.2.8"
created: 2026-05-14
updated: 2026-05-14
source_type: paper
source_url: "file:///C:/work/project/mwp-packages-project/apps/code-docs/output/nest-files.md"
source_author: danielmlc
source_date: 2026-05-14
---

# @cs/nest-files · 源码整理

## 元信息

- 类型：工作类代码文档（@cs 平台包）
- 归属项目：MWP Packages Project
- 版本：1.2.8
- 作者：danielmlc
- 摄入日期：2026-05-14
- 摄入方式：文件路径模式

## 正文 / 摘录

> 此处存放原始资料正文。**只追加、不修改。**

### @cs/nest-files代码库源码整理

#### 代码目录
```
@cs/nest-files/
├── src/
├── constants/
│   └── index.ts
├── interfaces/
│   ├── file-storage-options.interface.ts
│   ├── file-storage.interface.ts
│   └── index.ts
├── providers/
│   ├── abstract-storage.provider.ts
│   ├── ali-oss.provider.ts
│   ├── minio.provider.ts
│   └── tencent-cos.provider.ts
├── file-storage.adapter.ts
├── file-storage.factory.ts
├── file-storage.module.ts
├── file-storage.service.ts
└── index.ts
└── package.json
```

#### 代码文件

> 代码路径  `package.json`

```json
{
  "name": "@cs/nest-files",
  "version": "1.2.8",
  "description": "",
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
    "test": "ts-node test/demo.ts",
    "test:dev": "ts-node -r tsconfig-paths/register test/demo.ts",
    "publish": "pnpm publish --no-git-checks",
    "pre-publish:beta": "pnpm version prerelease --preid=beta",
    "publish:beta": "pnpm run pre-publish:beta && pnpm publish --no-git-checks --tag beta"
  },
  "dependencies": {
    "ali-oss": "^6.22.0",
    "cos-nodejs-sdk-v5": "^2.14.5",
    "dayjs": "^1.11.13",
    "minio": "^8.0.5"
  },
  "devDependencies": {
    "@nestjs/schematics": "^10.2.3",
    "@types/ali-oss": "^6.16.11",
    "@types/minio": "^7.1.1",
    "@types/node": "^20.17.6",
    "rimraf": "^6.0.1",
    "ts-node": "^10.9.2",
    "typescript": "^5.3.3"
  }
}
```


> 代码路径  `src\file-storage.adapter.ts`

```typescript
import { FileStorageFactory } from './file-storage.factory';
import {
  FileStorageOptions,
  FileInfo,
  FormSignatureDto,
  GetFileDto,
  HeaderOptions,
  SignatureOptions,
  UploadSignatureResponse,
  UploadDto,
  IFileStorage,
} from './interfaces';
import { Readable } from 'stream';

/**
 * 文件存储适配器
 *
 * 提供统一的文件存储接口，自动根据配置选择合适的存储提供者（AliOss/MinIO）
 * 适合在独立 TypeScript 文件中使用
 *
 * @example
 * ```typescript
 * const adapter = new FileStorageAdapter({
 *   provider: StorageProvider.ALI_OSS,
 *   region: 'oss-cn-hangzhou',
 *   bucket: 'my-bucket',
 *   accessKeyId: 'xxx',
 *   accessKeySecret: 'xxx',
 * });
 *
 * await adapter.upload({
 *   path: '/path/to/file.jpg',
 *   fileInfo: { filename: 'file.jpg', product: 'my-app' }
 * });
 * ```
 */
export class FileStorageAdapter implements IFileStorage {
  private readonly provider: IFileStorage;

  /**
   * 创建文件存储适配器实例
   * @param options 存储配置选项（AliOss 或 MinIO）
   */
  constructor(options: FileStorageOptions) {
    const factory = new FileStorageFactory();
    this.provider = factory.create(options);
  }

  /**
   * 上传文件（从本地路径）
   * @param dto 上传参数
   * @param options 可选的头部参数
   * @returns 上传结果
   */
  async upload(dto: UploadDto, options?: HeaderOptions): Promise<any> {
    return this.provider.upload(dto, options);
  }

  /**
   * 使用流方式上传文件
   * @param dto 上传参数
   * @param options 可选的头部参数
   * @returns 上传结果
   */
  async uploadByStream(dto: UploadDto, options?: HeaderOptions): Promise<any> {
    return this.provider.uploadByStream(dto, options);
  }

  /**
   * 直接上传流数据
   * @param stream 可读流
   * @param fileInfo 文件信息，用于生成存储路径
   * @param size 文件大小（可选）
   * @param options 可选的头部参数
   * @returns 上传结果
   */
  async uploadStreamDirect(
    stream: Readable,
    fileInfo: FormSignatureDto,
    size?: number,
    options?: HeaderOptions,
  ): Promise<any> {
    return this.provider.uploadStreamDirect(stream, fileInfo, size, options);
  }

  /**
   * 下载文件到本地
   * @param dto 下载参数
   * @returns 下载结果
   */
  async getFile(dto: GetFileDto): Promise<any> {
    return this.provider.getFile(dto);
  }

  /**
   * 使用流方式下载文件
   * @param dto 下载参数
   * @returns 下载结果
   */
  async getFileByStream(dto: GetFileDto): Promise<any> {
    return this.provider.getFileByStream(dto);
  }

  /**
   * 生成签名访问 URL
   * @param key 文件在存储中的路径/key
   * @param options 签名选项
   * @returns 签名后的 URL
   */
  async signatureUrl(key: string, options?: SignatureOptions): Promise<string>;
  async signatureUrl(
    keys: string[],
    options?: SignatureOptions,
  ): Promise<Record<string, string>>;
  async signatureUrl(
    key: string | string[],
    options?: SignatureOptions,
  ): Promise<string | Record<string, string>> {
    return this.provider.signatureUrl(key as any, options);
  }

  /**
   * 生成表单上传签名（用于前端直传）
   * @param formDto 表单参数
   * @returns 签名响应
   */
  async generateUploadSignature(
    formDto: FormSignatureDto,
  ): Promise<UploadSignatureResponse> {
    return this.provider.generateUploadSignature(formDto);
  }

  /**
   * 删除文件，支持单个或批量删除
   * @param key 文件路径/key 或路径数组
   * @returns 删除结果
   */
  async deleteFile(key: string): Promise<any>;
  async deleteFile(keys: string[]): Promise<any>;
  async deleteFile(key: string | string[]): Promise<any> {
    return this.provider.deleteFile(key as any);
  }

  /**
   * 检查文件是否存在，支持单个或批量检查
   * 底层通过 HEAD 请求实现，不产生文件下载流量
   * @param key 文件路径/key 或路径数组
   * @returns 单个时返回 boolean，批量时返回 `{ key: boolean }` 映射
   */
  async fileExists(key: string): Promise<boolean>;
  async fileExists(keys: string[]): Promise<Record<string, boolean>>;
  async fileExists(
    key: string | string[],
  ): Promise<boolean | Record<string, boolean>> {
    return this.provider.fileExists(key as any);
  }

  async getFileInfo(key: string): Promise<FileInfo | null> {
    return this.provider.getFileInfo(key);
  }

  /**
   * 获取原生客户端实例（用于高级操作）
   * @returns 原生客户端（OSS Client 或 MinIO Client）
   */
  getClient(): any {
    return this.provider.getClient();
  }
}

```


> 代码路径  `src\file-storage.factory.ts`

```typescript
import { Injectable } from '@nestjs/common';
import {
  FileStorageOptions,
  StorageProvider,
  IFileStorage,
} from './interfaces';
import { AliOssProvider } from './providers/ali-oss.provider';
import { MinioProvider } from './providers/minio.provider';
import { TencentCosProvider } from './providers/tencent-cos.provider';

@Injectable()
export class FileStorageFactory {
  create(options: FileStorageOptions): IFileStorage {
    const provider = options.provider;
    switch (provider) {
      case StorageProvider.ALI_OSS:
        return new AliOssProvider(options);
      case StorageProvider.MINIO:
        return new MinioProvider(options);
      case StorageProvider.TENCENT_COS:
        return new TencentCosProvider(options);
      default:
        // 使用提前存储的provider值
        throw new Error(`不支持的存储提供者: ${provider}`);
    }
  }
}

```


> 代码路径  `src\file-storage.module.ts`

```typescript
import { DynamicModule, Module } from '@nestjs/common';
import { FILE_STORAGE_OPTIONS } from './constants';
import { FileStorageOptions, FileStorageAsyncOptions } from './interfaces';
import { FileStorageService } from './file-storage.service';
import { FileStorageFactory } from './file-storage.factory';

@Module({})
export class FileStorageModule {
  static forRoot(options: FileStorageOptions, isGlobal = true): DynamicModule {
    return {
      global: isGlobal,
      module: FileStorageModule,
      providers: [
        FileStorageFactory,
        FileStorageService,
        {
          provide: FILE_STORAGE_OPTIONS,
          useValue: options,
        },
      ],
      exports: [FileStorageService, FILE_STORAGE_OPTIONS],
    };
  }

  static forRootAsync(
    options: FileStorageAsyncOptions,
    isGlobal = true,
  ): DynamicModule {
    return {
      global: isGlobal,
      module: FileStorageModule,
      imports: options.imports,
      providers: [
        FileStorageFactory,
        FileStorageService,
        {
          provide: FILE_STORAGE_OPTIONS,
          useFactory: options.useFactory,
          inject: options.inject,
        },
      ],
      exports: [FileStorageService, FILE_STORAGE_OPTIONS],
    };
  }
}

```


> 代码路径  `src\file-storage.service.ts`

```typescript
import { Injectable, Inject } from '@nestjs/common';
import { Readable } from 'stream';
import { FILE_STORAGE_OPTIONS } from './constants';
import {
  FileStorageOptions,
  FileInfo,
  FormSignatureDto,
  GetFileDto,
  HeaderOptions,
  SignatureOptions,
  UploadSignatureResponse,
  UploadDto,
} from './interfaces';
import { FileStorageFactory } from './file-storage.factory';
import { IFileStorage } from './interfaces';

@Injectable()
export class FileStorageService implements IFileStorage {
  private readonly provider: IFileStorage;

  constructor(
    @Inject(FILE_STORAGE_OPTIONS) private options: FileStorageOptions,
    private readonly factory: FileStorageFactory,
  ) {
    this.provider = this.factory.create(options);
  }

  getClient(): any {
    return this.provider.getClient();
  }

  upload(dto: UploadDto, options?: HeaderOptions): Promise<any> {
    return this.provider.upload(dto, options);
  }

  uploadByStream(dto: UploadDto, options?: HeaderOptions): Promise<any> {
    return this.provider.uploadByStream(dto, options);
  }

  uploadStreamDirect(
    stream: Readable,
    fileInfo: FormSignatureDto,
    size?: number,
    options?: HeaderOptions,
  ): Promise<any> {
    return this.provider.uploadStreamDirect(stream, fileInfo, size, options);
  }

  getFile(dto: GetFileDto): Promise<any> {
    return this.provider.getFile(dto);
  }

  getFileByStream(dto: GetFileDto): Promise<any> {
    return this.provider.getFileByStream(dto);
  }

  signatureUrl(key: string, options?: SignatureOptions): Promise<string>;
  signatureUrl(
    keys: string[],
    options?: SignatureOptions,
  ): Promise<Record<string, string>>;
  signatureUrl(
    key: string | string[],
    options?: SignatureOptions,
  ): Promise<string | Record<string, string>> {
    return this.provider.signatureUrl(key as any, options);
  }

  generateUploadSignature(
    formDto: FormSignatureDto,
  ): Promise<UploadSignatureResponse> {
    return this.provider.generateUploadSignature(formDto);
  }

  deleteFile(key: string): Promise<any>;
  deleteFile(keys: string[]): Promise<any>;
  deleteFile(key: string | string[]): Promise<any> {
    return this.provider.deleteFile(key as any);
  }

  fileExists(key: string): Promise<boolean>;
  fileExists(keys: string[]): Promise<Record<string, boolean>>;
  fileExists(
    key: string | string[],
  ): Promise<boolean | Record<string, boolean>> {
    return this.provider.fileExists(key as any);
  }

  getFileInfo(key: string): Promise<FileInfo | null> {
    return this.provider.getFileInfo(key);
  }
}

```


> 代码路径  `src\index.ts`

```typescript
export * from './file-storage.module';
export * from './file-storage.service';
export * from './file-storage.adapter';
export * from './interfaces';
export * from './providers/ali-oss.provider';
export * from './providers/minio.provider';
export * from './providers/tencent-cos.provider';

```


> 代码路径  `src\constants\index.ts`

```typescript
export const FILE_STORAGE_OPTIONS = Symbol('FILE_STORAGE_OPTIONS');

```


> 代码路径  `src\interfaces\file-storage-options.interface.ts`

```typescript
import { ModuleMetadata } from '@nestjs/common';

export enum StorageProvider {
  ALI_OSS = 'ali-oss',
  MINIO = 'minio',
  TENCENT_COS = 'tencent-cos',
}

export interface CommonStorageOptions {
  provider: StorageProvider;
  region?: string;
  bucket: string;
  secure?: boolean;
}

export interface AliOssOptions extends CommonStorageOptions {
  provider: StorageProvider.ALI_OSS;
  accessKeyId: string;
  accessKeySecret: string;
}

export interface MinioOptions extends CommonStorageOptions {
  provider: StorageProvider.MINIO;
  endPoint: string;
  port?: number;
  accessKey: string;
  secretKey: string;
}

export interface TencentCosOptions extends CommonStorageOptions {
  provider: StorageProvider.TENCENT_COS;
  region: string;
  secretId: string;
  secretKey: string;
}

export type FileStorageOptions =
  | AliOssOptions
  | MinioOptions
  | TencentCosOptions;

export interface FileStorageAsyncOptions
  extends Pick<ModuleMetadata, 'imports'> {
  useFactory?: (
    ...args: any[]
  ) => FileStorageOptions | Promise<FileStorageOptions>;
  inject?: any[];
}

```


> 代码路径  `src\interfaces\file-storage.interface.ts`

```typescript
export interface UploadDto {
  path: string;
  fileInfo: FormSignatureDto;
}

export interface GetFileDto {
  key: string;
  savePath: string;
}

export interface FormSignatureDto {
  fileSize?: number;
  autoGenerate?: boolean;
  isPublic?: boolean;
  isTemp?: boolean;
  product: string;
  filename: string;
  prefix?: string;
  tenantId?: string;
  acl?: ACL;
}

export type ACL = 'default' | 'private' | 'public-read' | 'public-read-write';

/**
 * 统一的上传凭证返回格式
 */
export interface UploadSignatureResponse {
  /** 使用的存储类型 */
  type: string;
  /** 原始的文件 key，用于查找对应的待上传文件 */
  key: string;
  /** POST 提交的地址 */
  postUrl: string;
  /** 客户端需要保存的 key，用于后续下载 */
  savedKey: string;
  /** 存储桶名称 */
  bucketName: string;
  /** form 表单信息，客户端只需补充 file 字段即可 */
  formData: Record<string, string>;
}

/**
 * 旧版上传凭证格式，用于兼容已有接口
 */
export interface LegacyUploadSignatureResponse extends UploadSignatureResponse {
  accessId: string;
  bucketName: string;
  endpoint: string;
  policy: string;
  expires: number;
  signature: string;
  uploadKey: string;
  metadata: Record<string, any>;
}

/**
 * 将 UploadSignatureResponse 转换为包含旧版字段的兼容格式
 */
export function toLegacySignatureResponse(
  response: UploadSignatureResponse,
): LegacyUploadSignatureResponse {
  const { type, formData, postUrl, key } = response;

  let accessId = '';
  let signature = '';
  let metadata: Record<string, any> = {};

  if (type === 'ali-oss') {
    accessId = formData['OSSAccessKeyId'] || '';
    signature = formData['Signature'] || '';
  } else if (type === 'minio') {
    accessId = formData['x-amz-credential'] || '';
    signature = formData['x-amz-signature'] || '';
    metadata = {
      'x-amz-algorithm': formData['x-amz-algorithm'],
      'x-amz-credential': formData['x-amz-credential'],
      'x-amz-date': formData['x-amz-date'],
      'x-amz-acl': formData['x-amz-acl'],
      'x-amz-meta-acl': formData['x-amz-meta-acl'],
    };
  } else if (type === 'tencent-cos') {
    accessId = formData['q-ak'] || '';
    signature = formData['q-signature'] || '';
    metadata = {
      'q-sign-algorithm': formData['q-sign-algorithm'],
      'q-ak': formData['q-ak'],
      'q-key-time': formData['q-key-time'],
      'q-sign-time': formData['q-sign-time'],
    };
  }

  return {
    ...response,
    accessId,
    bucketName: response.bucketName,
    endpoint: postUrl,
    policy: formData['policy'] || '',
    expires: Math.floor(Date.now() / 1000) + 86400,
    signature,
    uploadKey: key,
    metadata,
  };
}

export interface FileInfo {
  key: string;
  size: number;
  contentType: string;
  lastModified: Date;
  etag: string;
}

export interface HeaderOptions {
  'Cache-Control'?: string;
  'Content-Disposition'?: string;
  'Content-Encoding'?: string;
  'Content-Type'?: string;
  [key: string]: any;
}

// 为ali-oss特定的选项创建扩展接口
export interface AliOssUploadOptions {
  headers?: HeaderOptions;
  timeout?: number;
  mime?: string;
  meta?: Record<string, string>;
  [key: string]: any;
}

export interface SignatureOptions {
  expires?: number;
  method?: string;
  isPublic?: boolean;
  [key: string]: any;
}

import { Readable } from 'stream';

export interface IFileStorage {
  upload(dto: UploadDto, options?: HeaderOptions): Promise<any>;
  uploadByStream(dto: UploadDto, options?: HeaderOptions): Promise<any>;
  uploadStreamDirect(
    stream: Readable,
    fileInfo: FormSignatureDto,
    size?: number,
    options?: HeaderOptions,
  ): Promise<any>;
  getFile(dto: GetFileDto): Promise<any>;
  getFileByStream(dto: GetFileDto): Promise<any>;
  signatureUrl(key: string, options?: SignatureOptions): Promise<string>;
  signatureUrl(
    keys: string[],
    options?: SignatureOptions,
  ): Promise<Record<string, string>>;
  signatureUrl(
    key: string | string[],
    options?: SignatureOptions,
  ): Promise<string | Record<string, string>>;
  generateUploadSignature(
    formDto: FormSignatureDto,
  ): Promise<UploadSignatureResponse>;
  deleteFile(key: string): Promise<any>;
  deleteFile(keys: string[]): Promise<any>;
  deleteFile(key: string | string[]): Promise<any>;
  fileExists(key: string): Promise<boolean>;
  fileExists(keys: string[]): Promise<Record<string, boolean>>;
  fileExists(
    key: string | string[],
  ): Promise<boolean | Record<string, boolean>>;
  getFileInfo(key: string): Promise<FileInfo | null>;
  getClient(): any;
}

```


> 代码路径  `src\interfaces\index.ts`

```typescript
export * from './file-storage-options.interface';
export * from './file-storage.interface';

```


> 代码路径  `src\providers\abstract-storage.provider.ts`

```typescript
import { HttpException } from '@nestjs/common';
import * as fs from 'fs';
import { normalize } from 'path';
import { Readable } from 'stream';
import {
  FileStorageOptions,
  FileInfo,
  GetFileDto,
  HeaderOptions,
  IFileStorage,
  SignatureOptions,
  FormSignatureDto,
  UploadSignatureResponse,
  UploadDto,
  AliOssUploadOptions,
} from '../interfaces';

export abstract class AbstractStorageProvider implements IFileStorage {
  protected defaultHeaders: HeaderOptions = {
    'Cache-Control': 'no-cache',
    'Content-Encoding': 'UTF-8',
  };

  protected defaultSignatureOptions: SignatureOptions = {
    expires: 1800,
    method: 'GET',
  };

  constructor(protected readonly options: FileStorageOptions) { }

  abstract getClient(): any;
  abstract upload(dto: UploadDto, options?: HeaderOptions): Promise<any>;
  abstract uploadByStream(
    dto: UploadDto,
    options?: HeaderOptions | AliOssUploadOptions,
  ): Promise<any>;
  async uploadStreamDirect(
    stream: Readable,
    fileInfo: FormSignatureDto,
    size?: number,
    options?: HeaderOptions,
  ): Promise<any> {
    const key = this.getObjectKey(fileInfo);
    return this.uploadStreamDirectInternal(stream, key, size, options);
  }

  protected abstract uploadStreamDirectInternal(
    stream: Readable,
    key: string,
    size?: number,
    options?: HeaderOptions,
  ): Promise<any>;
  abstract getFile(dto: GetFileDto): Promise<any>;
  abstract getFileByStream(dto: GetFileDto): Promise<any>;
  async signatureUrl(key: string, options?: SignatureOptions): Promise<string>;
  async signatureUrl(
    keys: string[],
    options?: SignatureOptions,
  ): Promise<Record<string, string>>;
  async signatureUrl(
    key: string | string[],
    options?: SignatureOptions,
  ): Promise<string | Record<string, string>> {
    if (Array.isArray(key)) {
      const entries = await Promise.all(
        key.map(
          async (k) => [k, await this.signatureUrlSingle(k, options)] as const,
        ),
      );
      return Object.fromEntries(entries);
    }
    return this.signatureUrlSingle(key, options);
  }

  protected abstract signatureUrlSingle(
    key: string,
    options?: SignatureOptions,
  ): Promise<string>;
  abstract generateUploadSignature(
    formDto: FormSignatureDto,
  ): Promise<UploadSignatureResponse>;
  async deleteFile(key: string): Promise<any>;
  async deleteFile(keys: string[]): Promise<any>;
  async deleteFile(key: string | string[]): Promise<any> {
    if (Array.isArray(key)) {
      return this.deleteFileMulti(key);
    }
    return this.deleteFileSingle(key);
  }

  protected abstract deleteFileSingle(key: string): Promise<any>;
  protected abstract deleteFileMulti(keys: string[]): Promise<any>;

  async fileExists(key: string): Promise<boolean>;
  async fileExists(keys: string[]): Promise<Record<string, boolean>>;
  async fileExists(
    key: string | string[],
  ): Promise<boolean | Record<string, boolean>> {
    if (Array.isArray(key)) {
      const entries = await Promise.all(
        key.map(async (k) => [k, await this.fileExistsSingle(k)] as const),
      );
      return Object.fromEntries(entries);
    }
    return this.fileExistsSingle(key);
  }

  protected abstract fileExistsSingle(key: string): Promise<boolean>;

  async getFileInfo(key: string): Promise<FileInfo | null> {
    return this.getFileInfoSingle(key);
  }

  protected abstract getFileInfoSingle(key: string): Promise<FileInfo | null>;

  protected validateFile(filePath: string): void {
    if (!fs.existsSync(normalize(filePath))) {
      throw new HttpException('文件不存在', 404);
    }
  }

  protected generateRandomFilename(originalName: string): string {
    const len = 32;
    const chars = 'ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz2345678';
    let pwd = '';
    for (let i = 0; i < len; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const pos = originalName.lastIndexOf('.');
    let suffix = '';
    if (pos !== -1) {
      suffix = originalName.substring(pos);
    }
    return pwd + suffix;
  }

  protected getObjectKey(formDto: FormSignatureDto): string {
    // 如果 acl 为 public-read 或 public-read-write，自动设置 isPublic
    if (formDto.acl === 'public-read' || formDto.acl === 'public-read-write') {
      formDto.isPublic = true;
    }

    let key = formDto.filename;

    if (formDto.autoGenerate) {
      key = this.generateRandomFilename(formDto.filename);
    }

    if (formDto.prefix) {
      key = `${formDto.prefix}/${key}`;
    }

    if (formDto.product) {
      key = `${formDto.product}/${key}`;
    }

    if (formDto.isTemp) {
      key = `temp/${key}`;
    }

    if (formDto.isPublic) {
      key = `public/${key}`;
    } else {
      key = `common/${key}`;
    }

    if (formDto.tenantId) {
      key = `${formDto.tenantId}/${key}`;
    }

    return key;
  }
}

```


> 代码路径  `src\providers\ali-oss.provider.ts`

```typescript
import { HttpException } from '@nestjs/common';
import OSS from 'ali-oss';
import * as fs from 'fs';

import { normalize } from 'path';
import { Readable } from 'stream';
import {
  AliOssOptions,
  FileInfo,
  FormSignatureDto,
  GetFileDto,
  HeaderOptions,
  SignatureOptions,
  UploadSignatureResponse,
  UploadDto,
} from '../interfaces';
import { AbstractStorageProvider } from './abstract-storage.provider';

export class AliOssProvider extends AbstractStorageProvider {
  private client: OSS;

  constructor(protected readonly options: AliOssOptions) {
    super(options);
    this.initClient();
  }

  private initClient(): void {
    const { region, bucket, accessKeyId, accessKeySecret, secure } =
      this.options;
    this.client = new OSS({
      region,
      bucket,
      accessKeyId,
      accessKeySecret,
      secure: secure === undefined ? true : secure,
    });
  }

  getClient(): OSS {
    return this.client;
  }

  async upload(dto: UploadDto, options?: HeaderOptions): Promise<any> {
    try {
      const headers = { ...this.defaultHeaders, ...options };

      // 如果 fileInfo 中有 acl，设置文件访问权限
      if (dto.fileInfo.acl) {
        headers['x-oss-object-acl'] = dto.fileInfo.acl;
      }

      const _fileName = this.getObjectKey(dto.fileInfo);
      const result = await this.client.put(_fileName, normalize(dto.path), {
        headers,
        // 添加必要的参数以满足类型要求
        timeout: 60000,
        mime: options?.['Content-Type'],
      } as OSS.PutObjectOptions);
      return result;
    } catch (error) {
      throw new HttpException(error, 500);
    }
  }

  async uploadByStream(dto: UploadDto, options?: HeaderOptions): Promise<any> {
    try {
      const filePath = normalize(dto.path);
      this.validateFile(filePath);

      const stream = fs.createReadStream(filePath);
      const headers = { ...this.defaultHeaders, ...options };

      // 如果 fileInfo 中有 acl，设置文件访问权限
      if (dto.fileInfo.acl) {
        headers['x-oss-object-acl'] = dto.fileInfo.acl;
      }

      // 使用类型断言确保兼容OSS.PutStreamOptions
      const putOptions = {
        headers,
        timeout: 60000,
        mime: options?.['Content-Type'],
        meta: {},
      } as OSS.PutStreamOptions;
      const _fileName = this.getObjectKey(dto.fileInfo);
      const result = await this.client.putStream(_fileName, stream, putOptions);
      return result;
    } catch (error) {
      throw new HttpException(error, 500);
    }
  }

  async getFile(dto: GetFileDto): Promise<any> {
    try {
      const result = await this.client.get(dto.key, normalize(dto.savePath));
      return result;
    } catch (error) {
      throw new HttpException(error, 500);
    }
  }

  async getFileByStream(dto: GetFileDto): Promise<any> {
    try {
      const result = await this.client.getStream(dto.key);
      const writeStream = fs.createWriteStream(normalize(dto.savePath));
      return result.stream.pipe(writeStream);
    } catch (error) {
      throw new HttpException(error, 500);
    }
  }

  protected async signatureUrlSingle(
    key: string,
    options?: SignatureOptions,
  ): Promise<string> {
    try {
      // 如果 isPublic 为 true，返回永久公开链接
      if (options?.isPublic === true) {
        const protocol = this.options.secure !== false ? 'https:' : 'http:';
        return `${protocol}//${this.options.bucket}.${this.options.region}.aliyuncs.com/${key}`;
      }

      // 将默认选项与用户提供的选项合并
      const mergedOptions = { ...this.defaultSignatureOptions, ...options };

      // 处理HTTP方法，确保它是HTTPMethods类型
      let method: OSS.HTTPMethods | undefined;
      if (mergedOptions.method) {
        method = mergedOptions.method.toUpperCase() as OSS.HTTPMethods;
      }

      // 构建符合OSS.SignatureUrlOptions的对象
      const signOptions: OSS.SignatureUrlOptions = {
        expires: mergedOptions.expires,
        method,
        // 添加其他可能的选项
        process: mergedOptions.process,
        response: mergedOptions.response,
      };

      const result = await this.client.signatureUrl(key, signOptions);
      return result;
    } catch (error) {
      throw new HttpException(error, 500);
    }
  }

  async generateUploadSignature(
    formDto: FormSignatureDto,
  ): Promise<UploadSignatureResponse> {
    const date = new Date();
    date.setDate(date.getDate() + 1);

    const policy = {
      expiration: date.toISOString(),
      conditions: [
        ['content-length-range', 0, formDto.fileSize || 1024 * 1024 * 1024],
      ],
    };

    const formData = await this.client.calculatePostSignature(policy);
    const protocol = this.options.secure !== false ? 'https:' : 'http:';
    const host = `${protocol}//${this.options.bucket}.${this.options.region}.aliyuncs.com`;
    const savedKey = this.getObjectKey(formDto);
    return {
      type: 'ali-oss',
      key: formDto.filename,
      postUrl: host,
      savedKey,
      bucketName: this.options.bucket,
      formData: {
        OSSAccessKeyId: formData.OSSAccessKeyId,
        policy: formData.policy,
        Signature: formData.Signature,
        key: savedKey,
        success_action_status: '200',
      },
    };
  }

  protected async deleteFileSingle(key: string): Promise<any> {
    try {
      const result = await this.client.delete(key);
      return result;
    } catch (error) {
      throw new HttpException(error, 500);
    }
  }

  protected async fileExistsSingle(key: string): Promise<boolean> {
    try {
      await this.client.head(key);
      return true;
    } catch (error) {
      if (
        error?.code === 'NoSuchKey' ||
        error?.status === 404 ||
        error?.statusCode === 404
      ) {
        return false;
      }
      throw new HttpException(error, 500);
    }
  }

  protected async getFileInfoSingle(key: string): Promise<FileInfo | null> {
    try {
      const result = await this.client.head(key);
      const headers = result.res?.headers as Record<string, string>;
      return {
        key,
        size: parseInt(headers['content-length'] ?? '0', 10),
        contentType: headers['content-type'] ?? '',
        lastModified: new Date(headers['last-modified'] ?? 0),
        etag: (headers['etag'] ?? '').replace(/"/g, ''),
      };
    } catch (error) {
      if (
        error?.code === 'NoSuchKey' ||
        error?.status === 404 ||
        error?.statusCode === 404
      ) {
        return null;
      }
      throw new HttpException(error, 500);
    }
  }

  protected async uploadStreamDirectInternal(
    stream: Readable,
    key: string,
    size?: number,
    options?: HeaderOptions,
  ): Promise<any> {
    try {
      const headers = { ...this.defaultHeaders, ...options };
      const putOptions = {
        headers,
        timeout: 60000,
        mime: options?.['Content-Type'],
        meta: {},
      } as OSS.PutStreamOptions;

      await this.client.putStream(key, stream, putOptions);

      // 调用 head 确认文件已落盘，获取服务端实际记录的尺寸
      const headResult = await this.client.head(key);
      const serverSize = Number(headResult.res.headers['content-length']);
      const etag = ((headResult.res.headers['etag'] as string) || '').replace(
        /"/g,
        '',
      );

      if (size !== undefined && serverSize !== size) {
        throw new Error(
          `上传后 size 校验失败：本地 ${size} bytes，服务端 ${serverSize} bytes`,
        );
      }

      return {
        name: key,
        url: await this.signatureUrl(key),
        etag,
        size: serverSize,
      };
    } catch (error) {
      throw new HttpException(error, 500);
    }
  }

  protected async deleteFileMulti(keys: string[]): Promise<any> {
    try {
      const result = await this.client.deleteMulti(keys);
      return result;
    } catch (error) {
      throw new HttpException(error, 500);
    }
  }
}

```


> 代码路径  `src\providers\minio.provider.ts`

```typescript
// providers/minio.provider.ts
import { HttpException } from '@nestjs/common';
import * as Minio from 'minio';
import * as fs from 'fs';
import { normalize } from 'path';
import { Readable } from 'stream';
import {
  FileInfo,
  FormSignatureDto,
  GetFileDto,
  HeaderOptions,
  MinioOptions,
  SignatureOptions,
  UploadSignatureResponse,
  UploadDto,
} from '../interfaces';
import { AbstractStorageProvider } from './abstract-storage.provider';

export class MinioProvider extends AbstractStorageProvider {
  private client: Minio.Client;

  constructor(protected readonly options: MinioOptions) {
    super(options);
    this.initClient();
  }

  private initClient(): void {
    const { endPoint, port, accessKey, secretKey, secure } = this.options;
    this.client = new Minio.Client({
      endPoint,
      port: port || 9000,
      useSSL: secure !== false,
      accessKey,
      secretKey,
    });
  }

  getClient(): Minio.Client {
    return this.client;
  }

  private toHttpException(error: any, context?: string): HttpException {
    const message =
      error?.message ||
      error?.code ||
      (typeof error === 'string' ? error : null) ||
      (context ? `MinIO error in ${context}` : 'MinIO internal error');
    return new HttpException(message, 500);
  }

  async upload(dto: UploadDto, options?: HeaderOptions): Promise<any> {
    try {
      const metadata = { ...this.defaultHeaders, ...options };

      // 如果 fileInfo 中有 acl，设置文件访问权限
      if (dto.fileInfo.acl) {
        // MinIO 使用 x-amz-acl 或 x-amz-grant-read 来设置权限
        // 这里简化处理，将 public-read 等转换为 MinIO 策略
        if (
          dto.fileInfo.acl === 'public-read' ||
          dto.fileInfo.acl === 'public-read-write'
        ) {
          metadata['x-amz-acl'] = 'public-read';
        }
      }

      const _fileName = this.getObjectKey(dto.fileInfo);
      const result = await this.client.fPutObject(
        this.options.bucket,
        _fileName,
        normalize(dto.path),
        metadata,
      );
      return {
        name: _fileName,
        url: await this.signatureUrl(_fileName),
        ...result,
      };
    } catch (error) {
      throw this.toHttpException(error, 'upload');
    }
  }

  async uploadByStream(dto: UploadDto, options?: HeaderOptions): Promise<any> {
    try {
      const filePath = normalize(dto.path);
      this.validateFile(filePath);

      const fileStream = fs.createReadStream(filePath);
      const fileStats = fs.statSync(filePath);
      const metadata = { ...this.defaultHeaders, ...options };

      // 如果 fileInfo 中有 acl，设置文件访问权限
      if (dto.fileInfo.acl) {
        if (
          dto.fileInfo.acl === 'public-read' ||
          dto.fileInfo.acl === 'public-read-write'
        ) {
          metadata['x-amz-acl'] = 'public-read';
        }
      }

      const _fileName = this.getObjectKey(dto.fileInfo);
      await this.client.putObject(
        this.options.bucket,
        _fileName,
        fileStream,
        fileStats.size,
        metadata,
      );
      return {
        name: _fileName,
        url: await this.signatureUrl(_fileName),
        etag: null, // MinIO doesn't return etag directly like OSS
      };
    } catch (error) {
      throw this.toHttpException(error, 'uploadByStream');
    }
  }

  async getFile(dto: GetFileDto): Promise<any> {
    try {
      await this.client.fGetObject(
        this.options.bucket,
        dto.key,
        normalize(dto.savePath),
      );
      return {
        res: {
          status: 200,
          statusCode: 200,
        },
        content: null, // MinIO doesn't return file content directly
      };
    } catch (error) {
      throw this.toHttpException(error, 'getFile');
    }
  }

  async getFileByStream(dto: GetFileDto): Promise<any> {
    try {
      const fileStream = await this.client.getObject(
        this.options.bucket,
        dto.key,
      );
      const writeStream = fs.createWriteStream(normalize(dto.savePath));

      return new Promise((resolve, reject) => {
        fileStream.pipe(writeStream);

        writeStream.on('finish', () => {
          resolve({
            res: {
              status: 200,
              statusCode: 200,
            },
          });
        });

        writeStream.on('error', (err) => {
          reject(this.toHttpException(err, 'getFileByStream'));
        });
      });
    } catch (error) {
      throw this.toHttpException(error, 'getFileByStream');
    }
  }

  protected async signatureUrlSingle(
    key: string,
    options?: SignatureOptions,
  ): Promise<string> {
    try {
      // 如果 isPublic 为 true，返回永久公开链接
      if (options?.isPublic === true) {
        const protocol = this.options.secure !== false ? 'https' : 'http';
        const port = this.options.port || 9000;
        return `${protocol}://${this.options.endPoint}:${port}/${this.options.bucket}/${key}`;
      }

      const signOptions = { ...this.defaultSignatureOptions, ...options };
      const expires = Number(signOptions.expires) || 1800;
      const url = await this.client.presignedGetObject(
        this.options.bucket,
        key,
        expires,
      );

      return url;
    } catch (error) {
      throw this.toHttpException(error, 'signatureUrl');
    }
  }

  async generateUploadSignature(
    formDto: FormSignatureDto,
  ): Promise<UploadSignatureResponse> {
    const savedKey = this.getObjectKey(formDto);
    const expires = 24 * 60 * 60; // 1 day in seconds
    let aclToApply = formDto.acl;
    if (aclToApply === 'default' || !aclToApply) {
      aclToApply = 'private';
    }
    try {
      const postPolicy = new Minio.PostPolicy();
      postPolicy.setBucket(this.options.bucket);
      postPolicy.setKey(savedKey);
      postPolicy.setExpires(new Date(Date.now() + expires * 1000));

      postPolicy.setContentLengthRange(
        0,
        formDto.fileSize || 1024 * 1024 * 1024,
      );

      // 允许前端传任意 Content-Type（starts-with '' 表示任意值均可）
      postPolicy.policy.conditions.push(['starts-with', '$Content-Type', '']);

      // 允许前端传任意 Content-Disposition（如带 filename 的附件描述）
      postPolicy.policy.conditions.push([
        'starts-with',
        '$Content-Disposition',
        '',
      ]);

      if (aclToApply !== 'private') {
        postPolicy.policy.conditions.push(['eq', '$x-amz-acl', aclToApply]);
        postPolicy.policy.conditions.push([
          'eq',
          '$x-amz-meta-acl',
          aclToApply,
        ]);
      }

      const { postURL, formData } =
        await this.client.presignedPostPolicy(postPolicy);

      // 构建 formData：包含所有提交表单需要的字段
      const unifiedFormData: Record<string, string> = {
        key: savedKey,
        bucket: this.options.bucket,
        policy: formData.policy,
        'x-amz-algorithm': formData['x-amz-algorithm'],
        'x-amz-credential': formData['x-amz-credential'],
        'x-amz-date': formData['x-amz-date'],
        'x-amz-signature': formData['x-amz-signature'],
      };
      if (aclToApply !== 'private') {
        unifiedFormData['x-amz-acl'] = aclToApply;
        unifiedFormData['x-amz-meta-acl'] = aclToApply;
      }

      return {
        type: 'minio',
        key: formDto.filename,
        postUrl: postURL,
        savedKey,
        bucketName: this.options.bucket,
        formData: unifiedFormData,
      };
    } catch (error) {
      throw this.toHttpException(error, 'generateUploadSignature');
    }
  }

  protected async deleteFileSingle(key: string): Promise<any> {
    try {
      await this.client.removeObject(this.options.bucket, key);
      return { res: { status: 204 } };
    } catch (error) {
      throw this.toHttpException(error, 'deleteFile');
    }
  }

  protected async uploadStreamDirectInternal(
    stream: Readable,
    key: string,
    size?: number,
    options?: HeaderOptions,
  ): Promise<any> {
    try {
      const metadata = { ...this.defaultHeaders, ...options };
      // 确定上传源和实际大小：已知 size 则直接用流，否则先将流收集为 Buffer
      let source: Readable | Buffer;
      let actualSize: number;

      if (size !== undefined) {
        source = stream;
        actualSize = size;
      } else {
        const chunks: Buffer[] = [];
        await new Promise<void>((resolve, reject) => {
          stream.on('data', (chunk) => {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          });
          stream.on('end', () => resolve());
          stream.on('error', reject);
        });
        source = Buffer.concat(chunks);
        actualSize = source.length;
      }

      const uploadResult = await this.client.putObject(
        this.options.bucket,
        key,
        source,
        actualSize,
        metadata,
      );

      // 调用 statObject 确认文件已落盘，并获取服务端实际记录的尺寸
      const stat = await this.client.statObject(this.options.bucket, key);
      if (stat.size !== actualSize) {
        throw new Error(
          `上传后 size 校验失败：本地 ${actualSize} bytes，服务端 ${stat.size} bytes`,
        );
      }

      return {
        name: key,
        url: await this.signatureUrl(key),
        etag: uploadResult.etag,
        size: stat.size,
      };
    } catch (error) {
      throw this.toHttpException(error, 'uploadStreamDirect');
    }
  }

  protected async fileExistsSingle(key: string): Promise<boolean> {
    try {
      await this.client.statObject(this.options.bucket, key);
      return true;
    } catch (error) {
      if (
        error?.code === 'NotFound' ||
        error?.code === 'NoSuchKey' ||
        error?.status === 404
      ) {
        return false;
      }
      throw this.toHttpException(error, 'fileExists');
    }
  }

  protected async getFileInfoSingle(key: string): Promise<FileInfo | null> {
    try {
      const stat = await this.client.statObject(this.options.bucket, key);
      return {
        key,
        size: stat.size,
        contentType: stat.metaData?.['content-type'] ?? '',
        lastModified: stat.lastModified,
        etag: stat.etag.replace(/"/g, ''),
      };
    } catch (error) {
      if (
        error?.code === 'NotFound' ||
        error?.code === 'NoSuchKey' ||
        error?.status === 404
      ) {
        return null;
      }
      throw this.toHttpException(error, 'getFileInfo');
    }
  }

  protected async deleteFileMulti(keys: string[]): Promise<any> {
    try {
      await this.client.removeObjects(this.options.bucket, keys);
      return {
        res: { status: 204 },
        deleted: keys,
      };
    } catch (error) {
      throw this.toHttpException(error, 'deleteFiles');
    }
  }
}

```


> 代码路径  `src\providers\tencent-cos.provider.ts`

```typescript
import { HttpException } from '@nestjs/common';
import COS from 'cos-nodejs-sdk-v5';
import * as fs from 'fs';
import * as crypto from 'crypto';
import dayjs from 'dayjs';
import { normalize } from 'path';
import { Readable } from 'stream';
import {
  TencentCosOptions,
  FileInfo,
  FormSignatureDto,
  GetFileDto,
  HeaderOptions,
  SignatureOptions,
  UploadSignatureResponse,
  UploadDto,
} from '../interfaces';
import { AbstractStorageProvider } from './abstract-storage.provider';

export class TencentCosProvider extends AbstractStorageProvider {
  private client: COS;

  constructor(protected readonly options: TencentCosOptions) {
    super(options);
    this.initClient();
  }

  private initClient(): void {
    const { secretId, secretKey } = this.options;
    this.client = new COS({
      SecretId: secretId,
      SecretKey: secretKey,
    });
  }

  getClient(): COS {
    return this.client;
  }

  async upload(dto: UploadDto, options?: HeaderOptions): Promise<any> {
    try {
      const filePath = normalize(dto.path);
      this.validateFile(filePath);

      const key = this.getObjectKey(dto.fileInfo);
      const fileContent = fs.readFileSync(filePath);

      // 构建上传参数
      const putObjectParams: any = {
        Bucket: this.options.bucket,
        Region: this.options.region,
        Key: key,
        Body: fileContent,
        Headers: { ...this.defaultHeaders, ...options },
      };

      // 如果 fileInfo 中有 acl，设置文件访问权限
      if (dto.fileInfo.acl) {
        putObjectParams.ACL = dto.fileInfo.acl;
      }

      return new Promise((resolve, reject) => {
        this.client.putObject(putObjectParams, (err, data) => {
          if (err) {
            reject(new HttpException(err.message || err, 500));
          } else {
            resolve({ ...data, name: key, url: data.Location });
          }
        });
      });
    } catch (error) {
      throw new HttpException(error, 500);
    }
  }

  async uploadByStream(dto: UploadDto, options?: HeaderOptions): Promise<any> {
    try {
      const filePath = normalize(dto.path);
      this.validateFile(filePath);

      const key = this.getObjectKey(dto.fileInfo);
      const fileStream = fs.createReadStream(filePath);

      // 构建上传参数
      const putObjectParams: any = {
        Bucket: this.options.bucket,
        Region: this.options.region,
        Key: key,
        Body: fileStream,
        Headers: { ...this.defaultHeaders, ...options },
      };

      // 如果 fileInfo 中有 acl，设置文件访问权限
      if (dto.fileInfo.acl) {
        putObjectParams.ACL = dto.fileInfo.acl;
      }

      return new Promise((resolve, reject) => {
        this.client.putObject(putObjectParams, (err, data) => {
          if (err) {
            reject(new HttpException(err.message || err, 500));
          } else {
            resolve({ ...data, name: key, url: data.Location });
          }
        });
      });
    } catch (error) {
      throw new HttpException(error, 500);
    }
  }

  protected async uploadStreamDirectInternal(
    stream: Readable,
    key: string,
    size?: number,
    options?: HeaderOptions,
  ): Promise<any> {
    try {
      await new Promise<void>((resolve, reject) => {
        this.client.putObject(
          {
            Bucket: this.options.bucket,
            Region: this.options.region,
            Key: key,
            Body: stream,
            ContentLength: size,
            Headers: { ...this.defaultHeaders, ...options },
          },
          (err) => {
            if (err) {
              reject(new HttpException(err.message || err, 500));
            } else {
              resolve();
            }
          },
        );
      });

      // 调用 headObject 确认文件已落盘，获取服务端实际记录的尺寸
      const headData = await new Promise<any>((resolve, reject) => {
        this.client.headObject(
          {
            Bucket: this.options.bucket,
            Region: this.options.region,
            Key: key,
          },
          (err, data) => {
            if (err) {
              reject(new HttpException(err.message || err, 500));
            } else {
              resolve(data);
            }
          },
        );
      });

      const serverSize = Number(headData.headers['content-length']);
      const etag = (headData.headers['etag'] || '').replace(/"/g, '');

      if (size !== undefined && serverSize !== size) {
        throw new Error(
          `上传后 size 校验失败：本地 ${size} bytes，服务端 ${serverSize} bytes`,
        );
      }

      return {
        name: key,
        url: await this.signatureUrl(key),
        etag,
        size: serverSize,
      };
    } catch (error) {
      throw new HttpException(error, 500);
    }
  }

  async getFile(dto: GetFileDto): Promise<any> {
    try {
      return new Promise((resolve, reject) => {
        this.client.getObject(
          {
            Bucket: this.options.bucket,
            Region: this.options.region,
            Key: dto.key,
            Output: fs.createWriteStream(normalize(dto.savePath)),
          },
          (err, data) => {
            if (err) {
              reject(new HttpException(err.message || err, 500));
            } else {
              resolve({ res: { status: 200, statusCode: 200 }, ...data });
            }
          },
        );
      });
    } catch (error) {
      throw new HttpException(error, 500);
    }
  }

  async getFileByStream(dto: GetFileDto): Promise<any> {
    try {
      return new Promise((resolve, reject) => {
        this.client.getObject(
          {
            Bucket: this.options.bucket,
            Region: this.options.region,
            Key: dto.key,
          },
          (err, data) => {
            if (err) {
              reject(new HttpException(err.message || err, 500));
            } else {
              const writeStream = fs.createWriteStream(normalize(dto.savePath));
              writeStream.write(data.Body);
              writeStream.end();
              writeStream.on('finish', () => {
                resolve({ res: { status: 200, statusCode: 200 } });
              });
              writeStream.on('error', (writeErr) => {
                reject(new HttpException(writeErr.message, 500));
              });
            }
          },
        );
      });
    } catch (error) {
      throw new HttpException(error, 500);
    }
  }

  protected async signatureUrlSingle(
    key: string,
    options?: SignatureOptions,
  ): Promise<string> {
    try {
      // 如果 isPublic 为 true，返回永久公开链接
      if (options?.isPublic === true) {
        const protocol = this.options.secure !== false ? 'https' : 'http';
        return `${protocol}://${this.options.bucket}.cos.${this.options.region}.myqcloud.com/${key}`;
      }

      // 将默认选项与用户提供的选项合并
      const mergedOptions = { ...this.defaultSignatureOptions, ...options };

      return new Promise((resolve, reject) => {
        this.client.getObjectUrl(
          {
            Bucket: this.options.bucket,
            Region: this.options.region,
            Key: key,
            Expires: mergedOptions.expires,
            Sign: true,
          },
          (err, data) => {
            if (err) {
              reject(new HttpException(err.message || err, 500));
            } else {
              resolve(data.Url);
            }
          },
        );
      });
    } catch (error) {
      throw new HttpException(error, 500);
    }
  }

  async generateUploadSignature(
    formDto: FormSignatureDto,
  ): Promise<UploadSignatureResponse> {
    try {
      const savedKey = this.getObjectKey(formDto);
      const now = dayjs();
      const expired = now.add(1, 'day');
      const nowTimestamp = now.unix();
      const expiredTimestamp = expired.unix();

      // 1. 生成 KeyTime
      const keyTime = `${nowTimestamp};${expiredTimestamp}`;

      // 处理 ACL
      let aclToApply = formDto.acl;
      if (aclToApply === 'default' || !aclToApply) {
        aclToApply = undefined;
      }

      // 2. 构造 Policy（策略）
      const conditions: any[] = [
        { 'q-sign-algorithm': 'sha1' },
        { 'q-ak': this.options.secretId },
        { 'q-sign-time': keyTime },
        ['starts-with', '$key', savedKey],
        ['content-length-range', 0, formDto.fileSize || 1024 * 1024 * 1024 * 5],
      ];

      // 如果指定了 ACL，添加到 policy conditions
      if (aclToApply) {
        conditions.push({ 'x-cos-acl': aclToApply });
      }

      const policy = {
        expiration: expired.toISOString(),
        conditions,
      };

      // 将 Policy 转换为 JSON 并进行 base64 编码
      const policyJson = JSON.stringify(policy);
      const policyBase64 = Buffer.from(policyJson).toString('base64');

      // 3. 生成 SignKey：使用 HMAC-SHA1，以 SecretKey 为密钥，以 KeyTime 为消息
      const signKey = crypto
        .createHmac('sha1', this.options.secretKey)
        .update(keyTime)
        .digest('hex');

      // 4. 生成 StringToSign：使用 SHA1 对 Policy JSON 文本计算哈希值
      const stringToSign = crypto
        .createHash('sha1')
        .update(policyJson)
        .digest('hex');

      // 5. 生成 Signature：使用 HMAC-SHA1，以 SignKey 为密钥，以 StringToSign 为消息
      const signature = crypto
        .createHmac('sha1', signKey)
        .update(stringToSign)
        .digest('hex');

      const protocol = this.options.secure !== false ? 'https' : 'http';
      const host = `${protocol}://${this.options.bucket}.cos.${this.options.region}.myqcloud.com`;

      // 构建 formData
      const formData: Record<string, string> = {
        key: savedKey,
        policy: policyBase64,
        'q-sign-algorithm': 'sha1',
        'q-ak': this.options.secretId,
        'q-key-time': keyTime,
        'q-sign-time': keyTime,
        'q-signature': signature,
      };

      // 如果指定了 ACL，添加到 formData
      if (aclToApply) {
        formData['x-cos-acl'] = aclToApply;
      }

      return {
        type: 'tencent-cos',
        key: formDto.filename,
        postUrl: host,
        savedKey,
        bucketName: this.options.bucket,
        formData,
      };
    } catch (error) {
      throw new HttpException(error, 500);
    }
  }

  protected async deleteFileSingle(key: string): Promise<any> {
    try {
      return new Promise((resolve, reject) => {
        this.client.deleteObject(
          {
            Bucket: this.options.bucket,
            Region: this.options.region,
            Key: key,
          },
          (err, data) => {
            if (err) {
              reject(new HttpException(err.message || err, 500));
            } else {
              resolve({ res: { status: 204 }, ...data });
            }
          },
        );
      });
    } catch (error) {
      throw new HttpException(error, 500);
    }
  }

  protected async fileExistsSingle(key: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.client.headObject(
        {
          Bucket: this.options.bucket,
          Region: this.options.region,
          Key: key,
        },
        (err) => {
          if (err) {
            if (err.statusCode === 404) {
              resolve(false);
            } else {
              reject(new HttpException(err.message || err, 500));
            }
          } else {
            resolve(true);
          }
        },
      );
    });
  }

  protected async getFileInfoSingle(key: string): Promise<FileInfo | null> {
    return new Promise((resolve, reject) => {
      this.client.headObject(
        {
          Bucket: this.options.bucket,
          Region: this.options.region,
          Key: key,
        },
        (err, data) => {
          if (err) {
            if (err.statusCode === 404) {
              resolve(null);
            } else {
              reject(new HttpException(err.message || err, 500));
            }
            return;
          }
          const headers = data.headers as Record<string, string>;
          resolve({
            key,
            size: parseInt(headers['content-length'] ?? '0', 10),
            contentType: headers['content-type'] ?? '',
            lastModified: new Date(headers['last-modified'] ?? 0),
            etag: (headers['etag'] ?? '').replace(/"/g, ''),
          });
        },
      );
    });
  }

  protected async deleteFileMulti(keys: string[]): Promise<any> {
    try {
      return new Promise((resolve, reject) => {
        this.client.deleteMultipleObject(
          {
            Bucket: this.options.bucket,
            Region: this.options.region,
            Objects: keys.map((key) => ({ Key: key })),
          },
          (err, data) => {
            if (err) {
              reject(new HttpException(err.message || err, 500));
            } else {
              resolve({ res: { status: 204 }, deleted: keys, ...data });
            }
          },
        );
      });
    } catch (error) {
      throw new HttpException(error, 500);
    }
  }
}

```


#### 代码说明

# @cs/nest-files

一个用于 NestJS 的文件存储模块，支持阿里云 OSS、MinIO 和腾讯云 COS 三种存储后端，提供统一的 API 接口。

## 安装

```bash
npm install @cs/nest-files
# 或
pnpm add @cs/nest-files
```

## 功能特性

- 支持阿里云 OSS 存储
- 支持 MinIO 对象存储
- 支持腾讯云 COS 存储
- 统一的文件上传/下载 API
- 支持流式上传和下载
- 支持生成签名 URL
- 支持前端直传签名
- 支持文件删除（单个/批量）
- 支持检查文件是否存在（单个/批量）
- 支持获取文件元信息（大小、类型、修改时间等）
- 支持多租户文件隔离

## 快速开始

### 1. 同步配置

```typescript
import { Module } from '@nestjs/common';
import { FileStorageModule, StorageProvider } from '@cs/nest-files';

@Module({
  imports: [
    // 使用阿里云 OSS
    FileStorageModule.forRoot({
      provider: StorageProvider.ALI_OSS,
      region: 'oss-cn-hangzhou',
      bucket: 'your-bucket-name',
      accessKeyId: 'your-access-key-id',
      accessKeySecret: 'your-access-key-secret',
      secure: true, // 使用 HTTPS，默认为 true
    }),

    // 或使用 MinIO
    // FileStorageModule.forRoot({
    //   provider: StorageProvider.MINIO,
    //   endPoint: 'localhost',
    //   port: 9000,
    //   bucket: 'your-bucket-name',
    //   accessKey: 'your-access-key',
    //   secretKey: 'your-secret-key',
    //   secure: false, // 是否使用 SSL
    // }),

    // 或使用腾讯云 COS
    // FileStorageModule.forRoot({
    //   provider: StorageProvider.TENCENT_COS,
    //   region: 'ap-beijing',
    //   bucket: 'your-bucket-name-1250000000',
    //   secretId: 'your-secret-id',
    //   secretKey: 'your-secret-key',
    //   secure: true, // 是否使用 HTTPS，默认为 true
    // }),
  ],
})
export class AppModule {}
```

### 2. 异步配置

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { FileStorageModule, StorageProvider } from '@cs/nest-files';

@Module({
  imports: [
    ConfigModule.forRoot(),
    FileStorageModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        provider: StorageProvider.ALI_OSS,
        region: configService.get('OSS_REGION'),
        bucket: configService.get('OSS_BUCKET'),
        accessKeyId: configService.get('OSS_ACCESS_KEY_ID'),
        accessKeySecret: configService.get('OSS_ACCESS_KEY_SECRET'),
      }),
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
```

## 配置选项

### 阿里云 OSS 配置 (AliOssOptions)

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| provider | `StorageProvider.ALI_OSS` | 是 | - | 存储提供者类型 |
| region | `string` | 是 | - | OSS 区域，如 `oss-cn-hangzhou` |
| bucket | `string` | 是 | - | 存储桶名称 |
| accessKeyId | `string` | 是 | - | 阿里云 AccessKey ID |
| accessKeySecret | `string` | 是 | - | 阿里云 AccessKey Secret |
| secure | `boolean` | 否 | `true` | 是否使用 HTTPS |

### MinIO 配置 (MinioOptions)

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| provider | `StorageProvider.MINIO` | 是 | - | 存储提供者类型 |
| endPoint | `string` | 是 | - | MinIO 服务器地址 |
| port | `number` | 否 | `9000` | MinIO 服务端口 |
| bucket | `string` | 是 | - | 存储桶名称 |
| accessKey | `string` | 是 | - | MinIO Access Key |
| secretKey | `string` | 是 | - | MinIO Secret Key |
| secure | `boolean` | 否 | `true` | 是否使用 SSL |

### 腾讯云 COS 配置 (TencentCosOptions)

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| provider | `StorageProvider.TENCENT_COS` | 是 | - | 存储提供者类型 |
| region | `string` | 是 | - | COS 区域，如 `ap-beijing`、`ap-shanghai` |
| bucket | `string` | 是 | - | 存储桶名称（包含 APPID），如 `bucket-1250000000` |
| secretId | `string` | 是 | - | 腾讯云 SecretId |
| secretKey | `string` | 是 | - | 腾讯云 SecretKey |
| secure | `boolean` | 否 | `true` | 是否使用 HTTPS |

## API 使用

### 注入服务

```typescript
import { Injectable } from '@nestjs/common';
import { FileStorageService } from '@cs/nest-files';

@Injectable()
export class YourService {
  constructor(private readonly fileStorageService: FileStorageService) {}
}
```

### 上传文件

```typescript
// 通过文件路径上传
const result = await this.fileStorageService.upload({
  path: '/path/to/local/file.jpg',
  fileInfo: {
    product: 'your-product',      // 产品/模块名称
    filename: 'file.jpg',         // 文件名
    autoGenerate: true,           // 是否自动生成随机文件名
    isPublic: false,              // 是否为公开文件
    isTemp: false,                // 是否为临时文件
    prefix: 'images',             // 文件路径前缀
    tenantId: 'tenant-001',       // 租户ID（可选）
  },
}, {
  'Content-Type': 'image/jpeg',   // 可选的 Header
});

// 通过文件流上传
const result = await this.fileStorageService.uploadByStream({
  path: '/path/to/local/file.jpg',
  fileInfo: {
    product: 'your-product',
    filename: 'file.jpg',
  },
});

// 直接上传流（带服务端完整性验证）
import { Readable } from 'stream';

const stream: Readable = getYourStream();
const result = await this.fileStorageService.uploadStreamDirect(
  stream,
  {
    product: 'your-product',
    filename: 'file.jpg',
    autoGenerate: true,
  },
  1024 * 1024, // 文件大小（字节），建议传入以启用流式分片上传
  { 'Content-Type': 'image/jpeg' },
);
// result: { name: string, url: string, etag: string, size: number }
// 上传完成后 provider 内部会通过 HEAD 请求（statObject/head/headObject）
// 验证文件已落盘，size 与本地一致，否则抛出异常。
```

### 下载文件

```typescript
// 下载到本地文件
await this.fileStorageService.getFile({
  key: 'path/to/object-key.jpg',
  savePath: '/local/path/to/save/file.jpg',
});

// 通过流下载
await this.fileStorageService.getFileByStream({
  key: 'path/to/object-key.jpg',
  savePath: '/local/path/to/save/file.jpg',
});
```

### 生成签名 URL

支持传入单个 key 或 key 数组，批量时返回 `{ key: url }` 映射。

```typescript
// 生成临时访问 URL（默认有效期 30 分钟）
const url = await this.fileStorageService.signatureUrl('path/to/object-key.jpg');

// 自定义有效期（秒）
const url = await this.fileStorageService.signatureUrl('path/to/object-key.jpg', {
  expires: 3600, // 1 小时
});

// 生成公开永久链接
const url = await this.fileStorageService.signatureUrl('public/path/to/file.jpg', {
  isPublic: true,
});

// 批量生成签名 URL
const urls = await this.fileStorageService.signatureUrl([
  'path/to/file1.jpg',
  'path/to/file2.jpg',
  'path/to/file3.jpg',
]);
// 返回: { 'path/to/file1.jpg': 'https://...', 'path/to/file2.jpg': 'https://...', ... }

// 批量 + 自定义选项
const urls = await this.fileStorageService.signatureUrl(
  ['path/to/file1.jpg', 'path/to/file2.jpg'],
  { expires: 3600 },
);
```

### 生成前端直传签名

用于前端直接上传文件到 OSS/MinIO/COS，无需经过后端中转。返回统一的 `UploadSignatureResponse` 格式，客户端只需将 `formData` 中的字段加上 `file` 通过 POST 提交到 `postUrl` 即可完成上传。

```typescript
const result = await this.fileStorageService.generateUploadSignature({
  product: 'your-product',
  filename: 'upload.jpg',
  autoGenerate: true,
  fileSize: 10 * 1024 * 1024, // 最大文件大小限制，默认 1GB
  acl: 'public-read',         // 访问权限：'default' | 'private' | 'public-read' | 'public-read-write'
  isTemp: false,
  tenantId: 'tenant-001',
});

// result.type       - 存储类型：'ali-oss' | 'minio' | 'tencent-cos'
// result.key        - 原始文件名，用于匹配待上传文件
// result.postUrl    - POST 提交地址
// result.savedKey   - 存储路径 key，客户端需保存，用于后续下载/访问
// result.bucketName - 存储桶名称
// result.formData   - 表单字段，客户端只需补充 file 字段即可提交
```

#### 返回值类型 `UploadSignatureResponse`

| 字段 | 类型 | 说明 |
|------|------|------|
| `type` | `string` | 存储类型：`'ali-oss'` \| `'minio'` \| `'tencent-cos'` |
| `key` | `string` | 原始文件名，用于查找对应的待上传文件 |
| `postUrl` | `string` | POST 提交的地址 |
| `savedKey` | `string` | 客户端需要保存的 key，用于后续下载/访问 |
| `bucketName` | `string` | 存储桶名称 |
| `formData` | `Record<string, string>` | 表单字段，客户端只需补充 `file` 字段即可 |

#### 前端使用示例

```typescript
// 1. 后端获取凭证
const result = await fileStorageService.generateUploadSignature({
  product: 'my-app',
  filename: 'photo.jpg',
});

// 2. 前端拿到凭证后，构建 FormData 上传
const formData = new FormData();
// 将凭证中的 formData 字段逐一添加
Object.entries(result.formData).forEach(([key, value]) => {
  formData.append(key, value);
});
// 最后添加文件（file 字段必须在最后）
formData.append('file', fileInput.files[0]);

// 3. POST 到 postUrl
await fetch(result.postUrl, { method: 'POST', body: formData });

// 4. 上传成功后，保存 savedKey 用于后续下载/访问
const fileKey = result.savedKey;
```

### 删除文件

```typescript
// 删除单个文件
await this.fileStorageService.deleteFile('path/to/object-key.jpg');

// 批量删除文件
await this.fileStorageService.deleteFile([
  'path/to/file1.jpg',
  'path/to/file2.jpg',
  'path/to/file3.jpg',
]);
```

### 检查文件是否存在

支持传入单个 key 或 key 数组，底层通过 HEAD 请求实现，不会产生文件下载流量。

```typescript
// 检查单个文件是否存在
const exists = await this.fileStorageService.fileExists('path/to/object-key.jpg');
// 返回: true | false

// 批量检查文件是否存在
const results = await this.fileStorageService.fileExists([
  'path/to/file1.jpg',
  'path/to/file2.jpg',
  'path/to/file3.jpg',
]);
// 返回: { 'path/to/file1.jpg': true, 'path/to/file2.jpg': false, ... }
```

> **注意**：各存储后端错误码处理：
> - **阿里云 OSS**：`NoSuchKey` / HTTP 404 → 返回 `false`
> - **腾讯云 COS**：HTTP 404 → 返回 `false`
> - **MinIO**：`NotFound` / `NoSuchKey` / HTTP 404 → 返回 `false`
> - 其他错误（网络故障、权限不足等）均会抛出 `HttpException(500)`

### 获取文件元信息

通过 HEAD 请求获取文件的元数据，不产生下载流量。文件不存在时返回 `null`，可同时用于判断文件是否存在并读取信息。

```typescript
import { FileInfo } from '@cs/nest-files';

const info: FileInfo | null = await this.fileStorageService.getFileInfo('path/to/object-key.jpg');

if (!info) {
  // 文件不存在
} else {
  info.key          // 'path/to/object-key.jpg'
  info.size         // 文件字节数，如 102400
  info.contentType  // MIME 类型，如 'image/jpeg'
  info.lastModified // Date 对象
  info.etag         // 文件 ETag（已去除引号）
}
```

> **注意**：各存储后端错误码处理：
> - **阿里云 OSS**：`NoSuchKey` / HTTP 404 → 返回 `null`
> - **腾讯云 COS**：HTTP 404 → 返回 `null`
> - **MinIO**：`NotFound` / `NoSuchKey` / HTTP 404 → 返回 `null`
> - 其他错误（网络故障、权限不足等）均会抛出 `HttpException(500)`

### 获取原生客户端

如果需要使用更多原生功能，可以获取底层客户端实例。

```typescript
// 获取阿里云 OSS 客户端
const ossClient = this.fileStorageService.getClient(); // 返回 OSS 实例

// 获取 MinIO 客户端
const minioClient = this.fileStorageService.getClient(); // 返回 Minio.Client 实例

// 获取腾讯云 COS 客户端
const cosClient = this.fileStorageService.getClient(); // 返回 COS 实例
```

## 文件路径规则

上传文件时，系统会根据配置自动生成对象存储路径，格式如下：

```
[tenantId]/[public|common]/[temp/][product]/[prefix]/[filename]
```

| 字段 | 说明 |
|------|------|
| tenantId | 租户ID，用于多租户隔离 |
| public/common | `isPublic=true` 时为 `public`，否则为 `common` |
| temp | `isTemp=true` 时添加 |
| product | 产品/模块名称 |
| prefix | 自定义路径前缀 |
| filename | 文件名（可自动生成随机名） |

示例：
- `tenant-001/common/user-service/avatars/abc123.jpg`
- `tenant-001/public/temp/upload/documents/file.pdf`

## 接口类型定义

```typescript
// 上传参数
interface UploadDto {
  path: string;           // 本地文件路径
  fileInfo: FormSignatureDto;
}

// 文件信息
interface FormSignatureDto {
  fileSize?: number;      // 文件大小限制
  autoGenerate?: boolean; // 是否自动生成文件名
  isPublic?: boolean;     // 是否为公开文件
  isTemp?: boolean;       // 是否为临时文件
  product: string;        // 产品/模块名称
  filename: string;       // 原始文件名
  prefix?: string;        // 路径前缀
  tenantId?: string;      // 租户ID
  acl?: 'default' | 'private' | 'public-read' | 'public-read-write';
}

// 下载参数
interface GetFileDto {
  key: string;            // 对象存储路径
  savePath: string;       // 本地保存路径
}

// 签名选项
interface SignatureOptions {
  expires?: number;       // 过期时间（秒），默认 1800
  method?: string;        // HTTP 方法，默认 GET
  isPublic?: boolean;     // 是否返回公开链接
}

// Header 选项
interface HeaderOptions {
  'Cache-Control'?: string;
  'Content-Disposition'?: string;
  'Content-Encoding'?: string;
  'Content-Type'?: string;
  [key: string]: any;
}

// 文件元信息
interface FileInfo {
  key: string;          // 对象存储路径
  size: number;         // 文件大小（字节）
  contentType: string;  // MIME 类型，如 'image/jpeg'
  lastModified: Date;   // 最后修改时间
  etag: string;         // 文件 ETag（已去除引号）
}

// 统一的上传凭证返回格式
interface UploadSignatureResponse {
  type: string;             // 存储类型：'ali-oss' | 'minio' | 'tencent-cos'
  key: string;              // 原始文件名，用于匹配待上传文件
  postUrl: string;          // POST 提交地址
  savedKey: string;         // 存储路径 key，用于后续下载/访问
  bucketName: string;       // 存储桶名称
  formData: Record<string, string>; // 表单字段，客户端只需补充 file 即可
}
```

## 注意事项

1. **全局模块**：`FileStorageModule.forRoot()` 和 `forRootAsync()` 默认注册为全局模块，可通过第二个参数 `isGlobal` 设置为 `false` 改为局部模块。

2. **`uploadStreamDirect` 流上传**：建议提供 `size` 参数，否则会先将流全部读入内存再上传。上传完成后所有 provider（MinIO/Ali OSS/Tencent COS）均会通过 HEAD 请求验证文件落盘及 size 一致性，并返回统一格式 `{ name, url, etag, size }`。大文件（> 64 MB）在 MinIO 中会自动使用分片上传，etag 格式为 `<hash>-<分片数>`，非文件内容 MD5。

3. **文件大小限制**：`generateUploadSignature` 默认最大文件大小为 1GB，可通过 `fileSize` 参数调整。

4. **ACL 权限**：当 `acl` 设置为 `public-read` 或 `public-read-write` 时，`isPublic` 会自动设置为 `true`。


