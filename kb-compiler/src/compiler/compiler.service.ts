import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import * as chokidar from 'chokidar';
import * as fs from 'fs/promises';
import * as path from 'path';
import { DatabaseService } from '../database/database.service';
import { LlmService } from '../llm/llm.service';

@Injectable()
export class CompilerService implements OnModuleInit, OnModuleDestroy {
  private watcher: chokidar.FSWatcher;
  private readonly logger = new Logger(CompilerService.name);
  private readonly rawDir = path.resolve(__dirname, '../../../Obsidian-NoteBook/10-Raw');
  private readonly wikiDir = path.resolve(__dirname, '../../../Obsidian-NoteBook/20-Wiki');

  constructor(
    private readonly dbService: DatabaseService,
    private readonly llmService: LlmService,
  ) {}

  onModuleInit() {
    this.logger.log(`Starting file watcher on: ${this.rawDir}`);

    // Ensure directories exist before watching
    fs.mkdir(this.rawDir, { recursive: true }).catch(console.error);
    fs.mkdir(this.wikiDir, { recursive: true }).catch(console.error);

    this.watcher = chokidar.watch(this.rawDir, {
      ignored: /(^|[\/\\])\../, // ignore dotfiles
      persistent: true,
      awaitWriteFinish: {
        stabilityThreshold: 2000,
        pollInterval: 100
      },
    });

    this.watcher.on('add', (filePath) => this.handleNewFile(filePath));
  }

  onModuleDestroy() {
    if (this.watcher) {
      this.watcher.close();
      this.logger.log('File watcher closed.');
    }
  }

  private async handleNewFile(filePath: string) {
    this.logger.log(`New file detected: ${filePath}`);
    try {
      // 1. Check if already processed
      const existing = await this.dbService.get(`SELECT id FROM documents WHERE path = ?`, [filePath]);
      if (existing) {
        this.logger.log(`File already processed: ${filePath}`);
        return;
      }

      // 2. Read content (Basic support for Markdown/txt for MVP)
      const content = await fs.readFile(filePath, 'utf-8');
      const filename = path.basename(filePath, path.extname(filePath));

      // 3. Compile using LLM (Mock)
      const compileResult = await this.llmService.compileText(content);

      // 4. Generate Embedding (Mock)
      const embedding = await this.llmService.generateEmbedding(compileResult.summary);

      // 5. Generate Markdown
      const mdOutput = this.generateMarkdown(filename, filePath, compileResult);

      // 6. Write to Wiki Directory
      const categoryDir = path.join(this.wikiDir, compileResult.category);
      await fs.mkdir(categoryDir, { recursive: true });

      const outPath = path.join(categoryDir, `${filename}.md`);
      await fs.writeFile(outPath, mdOutput, 'utf-8');

      // 7. Save to DB
      const dbResult = await this.dbService.run(
        `INSERT INTO documents (title, path, content, summary, tags) VALUES (?, ?, ?, ?, ?)`,
        [filename, filePath, compileResult.content, compileResult.summary, JSON.stringify(compileResult.tags)]
      );

      // Save vector embedding using the id from documents
      await this.dbService.run(
        `INSERT INTO vec_documents(id, embedding) VALUES (?, ?)`,
        [dbResult.lastID, JSON.stringify(embedding)] // serialize array as json string, depending on sqlite-vec exact insertion syntax
      );

      this.logger.log(`Successfully compiled ${filename} to Wiki!`);

    } catch (error) {
      this.logger.error(`Error processing file ${filePath}:`, error);
    }
  }

  private generateMarkdown(title: string, sourcePath: string, result: any): string {
    const now = new Date().toISOString().split('T')[0];
    const tagsYaml = result.tags.map((t: string) => `  - ${t}`).join('\n');
    const linksMd = result.links.map((l: string) => `- [[${l}]]`).join('\n');
    const conceptsMd = result.keyConcepts.map((c: string) => `- **${c}**`).join('\n');

    // Relative path for Obsidian link
    const relSourcePath = path.relative(path.resolve(__dirname, '../../../Obsidian-NoteBook'), sourcePath);

    return `---
title: ${title}
date: ${now}
tags:
${tagsYaml}
source: ${relSourcePath}
compiled_at: ${new Date().toISOString()}
status: compiled
---

# ${title}

## 摘要

${result.summary}

## 关键概念

${conceptsMd}

## 详细内容

${result.content}

## 关联知识

${linksMd || '- 无'}

## 原始来源

![[${relSourcePath}]]
`;
  }
}
