---
title: "@cs/nest-mail · 源码整理 v1.0.3"
type: source
aliases: ["@cs/nest-mail 源码", "nest-mail 源码"]
tags: [nestjs, mwp, code-docs, mail, nodemailer, email]
status: stable
version: "1.0.3"
created: 2026-05-14
updated: 2026-05-14
source_type: paper
source_url: "file:///C:/work/project/mwp-packages-project/apps/code-docs/output/nest-mail.md"
source_author: danielmlc
source_date: 2026-05-14
---

# @cs/nest-mail · 源码整理

## 元信息

- 类型：工作类代码文档（@cs 平台包）
- 归属项目：MWP Packages Project
- 版本：1.0.3
- 作者：danielmlc
- 摄入日期：2026-05-14
- 摄入方式：文件路径模式

## 正文 / 摘录

> 此处存放原始资料正文。**只追加、不修改。**

### @cs/nest-mail代码库源码整理

#### 代码目录
```
@cs/nest-mail/
├── src/
├── index.ts
├── mail.constants.ts
├── mail.interface.ts
├── mail.module.ts
└── mail.service.ts
└── package.json
```

#### 代码文件

> 代码路径  `package.json`

```json
{
  "name": "@cs/nest-mail",
  "version": "1.0.3",
  "description": "邮件工具包",
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
    "reflect-metadata": "^0.2.2",
    "rxjs": "^7.8.1",
    "nodemailer": "^7.0.3"
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


> 代码路径  `src\index.ts`

```typescript
export * from './mail.module';
export * from './mail.service';
export * from './mail.interface';

```


> 代码路径  `src\mail.constants.ts`

```typescript
export const MAIL_MODULE_OPTIONS = Symbol('MAIL_MODULE_OPTIONS');

```


> 代码路径  `src\mail.interface.ts`

```typescript
import { ModuleMetadata } from '@nestjs/common';
import { SendMailOptions } from 'nodemailer';
interface auth {
  user: string;
  pass: string;
}

export interface MailModuleOptions {
  host?: string;
  port: number;
  secure: boolean; //（官网解释：如果为true，则连接到服务器时连接将使用TLS。 如果为false（默认值），则在服务器支持STARTTLS扩展名的情况下使用TLS。 在大多数情况下，如果要连接到端口465，请将此值设置为true。对于端口587或25，请将其保留为false）
  auth: auth;
  sender: string;
}

export type SendMailDto = Pick<
  SendMailOptions,
  'to' | 'subject' | 'text' | 'html' | 'cc'
>;

export interface MailModuleAsyncOptions
  extends Pick<ModuleMetadata, 'imports'> {
  useFactory?: (
    ...args: any[]
  ) => MailModuleOptions | Promise<MailModuleOptions>;
  inject?: any[];
}

```


> 代码路径  `src\mail.module.ts`

```typescript
import { DynamicModule, Module } from '@nestjs/common';
import { MAIL_MODULE_OPTIONS } from './mail.constants';
import { MailModuleOptions, MailModuleAsyncOptions } from './mail.interface';
import { MailService } from './mail.service';
@Module({})
export class MailModule {
  static forRoot(options: MailModuleOptions, isGlobal = false): DynamicModule {
    return {
      global: isGlobal,
      module: MailModule,
      providers: [
        MailService,
        {
          provide: MAIL_MODULE_OPTIONS,
          useValue: options,
        },
      ],
      exports: [MailService, MAIL_MODULE_OPTIONS],
    };
  }

  static forRootAsync(
    options: MailModuleAsyncOptions,
    isGlobal = false,
  ): DynamicModule {
    return {
      global: isGlobal,
      module: MailModule,
      imports: options.imports,
      providers: [
        MailService,
        {
          provide: MAIL_MODULE_OPTIONS,
          useFactory: options.useFactory,
          inject: options.inject,
        },
      ],
      exports: [MailService, MAIL_MODULE_OPTIONS],
    };
  }
}

```


> 代码路径  `src\mail.service.ts`

```typescript
import { Injectable, Optional, Inject } from '@nestjs/common';
import { SendMailOptions, createTransport } from 'nodemailer';
import { MAIL_MODULE_OPTIONS } from './mail.constants';
import { MailModuleOptions } from './mail.interface';
@Injectable()
export class MailService {
  private mailClinet;
  constructor(
    @Optional()
    @Inject(MAIL_MODULE_OPTIONS)
    protected options: MailModuleOptions,
  ) {
    // 初始化实例
    this.createClient();
  }

  private createClient() {
    this.mailClinet = createTransport(this.options);
  }

  async sendMail(sendMailDto: SendMailOptions): Promise<any> {
    sendMailDto.from = `"${this.options.sender}"<${this.options.auth.user}>`;
    return await this.mailClinet.sendMail(sendMailDto);
  }
}

```

