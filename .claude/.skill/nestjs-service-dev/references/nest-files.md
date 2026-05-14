# @cs/nest-files - 文件存储

> **源码**：[`libs/nest-files`](../../../libs/nest-files) ｜ **对齐版本**：v1.2.7 ｜ **同步时间**：2026-05-06 ｜ **状态**：✅ 已对齐

## 目录

- [安装](#安装)
- [模块配置](#模块配置)
- [FileStorageService 完整 API](#filestorageservice-完整-api)
- [接口定义](#接口定义)
- [使用示例](#使用示例)

## 安装

```bash
pnpm add @cs/nest-files
```

## 模块配置

### ShareModule 中注册

```typescript
import { FileStorageModule } from '@cs/nest-files';

@Global()
@CSModule({
  imports: [
    FileStorageModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        return { ...config.get('fileStorage') };
      },
    }),
  ],
  exports: [FileStorageModule],
})
export class ShareModule {}
```

### config.yaml 配置

```yaml
# MinIO
fileStorage:
  provider: 'minio'
  endPoint: 'localhost'
  port: 9000
  bucket: 'my-bucket'
  accessKey: 'minioadmin'
  secretKey: 'minioadmin'
  secure: false

# 阿里云 OSS
fileStorage:
  provider: 'ali-oss'
  region: 'oss-cn-hangzhou'
  bucket: 'my-bucket'
  accessKeyId: 'your-access-key'
  accessKeySecret: 'your-secret-key'

# 腾讯云 COS
fileStorage:
  provider: 'tencent-cos'
  region: 'ap-guangzhou'
  bucket: 'my-bucket-1234567890'
  secretId: 'your-secret-id'
  secretKey: 'your-secret-key'
```

### 配置接口

```typescript
enum StorageProvider {
  ALI_OSS = 'ali-oss',
  MINIO = 'minio',
  TENCENT_COS = 'tencent-cos',
}

// 公共配置
interface CommonStorageOptions {
  provider: StorageProvider;
  region?: string;
  bucket: string;
  secure?: boolean;
}

// MinIO 专有配置
interface MinioOptions extends CommonStorageOptions {
  endPoint: string;
  port?: number;
  accessKey: string;
  secretKey: string;
}

// 阿里云 OSS 专有配置
interface AliOssOptions extends CommonStorageOptions {
  accessKeyId: string;
  accessKeySecret: string;
}

// 腾讯云 COS 专有配置（注意：region 在此为必填）
interface TencentCosOptions extends CommonStorageOptions {
  region: string;              // 覆盖父接口，必填
  secretId: string;
  secretKey: string;
}
```

## FileStorageService 完整 API

```typescript
import { FileStorageService } from '@cs/nest-files';

@Injectable()
export class MyFileService {
  constructor(private readonly fileStorage: FileStorageService) {}
}
```

### 上传

```typescript
// 通过文件路径上传
await this.fileStorage.upload(dto: UploadDto, options?: HeaderOptions)

// 通过流上传
await this.fileStorage.uploadByStream(dto: UploadDto, options?: HeaderOptions)

// 直接上传流（key 由 fileInfo 自动生成）
await this.fileStorage.uploadStreamDirect(
  stream: Readable,
  fileInfo: FormSignatureDto,
  size?: number,
  options?: HeaderOptions
)
```

### 下载

```typescript
// 下载到文件
await this.fileStorage.getFile(dto: GetFileDto)

// 获取文件流
await this.fileStorage.getFileByStream(dto: GetFileDto)
```

### 签名与授权

```typescript
// 生成临时访问URL（单个 key）
const url = await this.fileStorage.signatureUrl(
  key: string,
  options?: SignatureOptions
)

// 批量生成签名URL（传入 key 数组，返回 { key: url } 映射）
const urls = await this.fileStorage.signatureUrl(
  keys: string[],
  options?: SignatureOptions
)

// 生成 Web 直传签名凭证（返回 UploadSignatureResponse）
const result = await this.fileStorage.generateUploadSignature(
  formDto: FormSignatureDto
)
// result.postUrl    - POST 提交地址
// result.formData   - 表单字段，客户端只需补充 file 即可
// result.savedKey   - 存储路径 key，用于后续下载
// result.key        - 原始文件名，用于匹配待上传文件
// result.bucketName - 存储桶名称
```

### 删除

```typescript
// 删除单个文件
await this.fileStorage.deleteFile(key: string)

// 批量删除
await this.fileStorage.deleteFile(keys: string[])
```

### 文件检测与信息

```typescript
// 检查文件是否存在
await this.fileStorage.fileExists(key: string): Promise<boolean>

// 批量检查（返回 { key: boolean } 映射）
await this.fileStorage.fileExists(keys: string[]): Promise<Record<string, boolean>>

// 获取文件元信息
await this.fileStorage.getFileInfo(key: string): Promise<FileInfo | null>
// FileInfo: { key, size, contentType, lastModified, etag }
```

### 获取底层客户端

```typescript
const client = this.fileStorage.getClient();  // 返回底层 SDK 实例（OSS/MinIO/COS）
```

## 接口定义

```typescript
interface UploadDto {
  path: string;                      // 本地文件路径
  fileInfo: FormSignatureDto;
}

interface GetFileDto {
  key: string;                       // 文件在存储中的 key
  savePath: string;                  // 本地保存路径
}

interface FormSignatureDto {
  product: string;                   // 产品标识
  filename: string;                  // 文件名
  fileSize?: number;
  autoGenerate?: boolean;            // 自动生成文件名
  isPublic?: boolean;                // 是否公开访问
  isTemp?: boolean;                  // 是否临时文件
  prefix?: string;                   // 路径前缀
  tenantId?: string;                 // 租户ID
  acl?: 'default' | 'private' | 'public-read' | 'public-read-write';
}

interface SignatureOptions {
  expires?: number;                  // 过期时间（秒）
  method?: string;                   // HTTP 方法
  isPublic?: boolean;
}

interface HeaderOptions {
  'Cache-Control'?: string;
  'Content-Disposition'?: string;
  'Content-Encoding'?: string;
  'Content-Type'?: string;
}

/** 统一的上传凭证返回格式 */
interface UploadSignatureResponse {
  type: string;                       // 存储类型：'ali-oss' | 'minio' | 'tencent-cos'
  key: string;                        // 原始文件名，用于匹配待上传文件
  postUrl: string;                    // POST 提交地址
  savedKey: string;                   // 存储路径 key，用于后续下载
  bucketName: string;                 // 存储桶名称
  formData: Record<string, string>;   // 表单字段，客户端只需补充 file 即可
}
```

## 使用示例

```typescript
@Injectable()
@RpcService({ name: 'file', description: '文件服务' })
export class FileService {
  constructor(
    private readonly fileStorage: FileStorageService,
    private readonly logger: LoggerService,
  ) {}

  @RpcMethod({ name: 'fromSignature', description: '生成上传签名' })
  async fromSignature(@RpcParam('formDto') formDto: FormSignatureDto) {
    return await this.fileStorage.generateUploadSignature(formDto);
  }

  @RpcMethod({ name: 'signatureUrl', description: '生成临时访问URL' })
  async signatureUrl(
    @RpcParam('key') key: string,
    @RpcParam('options') options?: SignatureOptions,
  ) {
    return await this.fileStorage.signatureUrl(key, options);
  }

  @RpcMethod({ name: 'deleteFile', description: '删除文件' })
  async deleteFile(@RpcParam('key') key: string) {
    return await this.fileStorage.deleteFile(key);
  }
}
```
