import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import * as sqlite3 from 'sqlite3';
import * as sqliteVec from 'sqlite-vec';
import * as path from 'path';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private db!: sqlite3.Database;
  private readonly logger = new Logger(DatabaseService.name);

  async onModuleInit() {
    this.logger.log('Initializing SQLite database with sqlite-vec extension...');

    // Connect to SQLite DB
    const dbPath = path.resolve(__dirname, '../../data.db');

    this.db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        this.logger.error('Failed to connect to database', err);
      }
    });

    // Load sqlite-vec (cast to any to bypass strict type mismatch between sqlite3 types and sqlite-vec typings)
    sqliteVec.load(this.db as any);

    await this.initSchema();
    this.logger.log('Database initialized successfully.');
  }

  onModuleDestroy() {
    if (this.db) {
      this.db.close();
      this.logger.log('Database connection closed.');
    }
  }

  private async initSchema() {
    return new Promise<void>((resolve, reject) => {
      this.db.serialize(() => {
        // Create table for documents
        this.db.run(`
          CREATE TABLE IF NOT EXISTS documents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT,
            path TEXT UNIQUE,
            content TEXT,
            summary TEXT,
            tags TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // Create virtual table for embeddings using sqlite-vec
        this.db.run(`
          CREATE VIRTUAL TABLE IF NOT EXISTS vec_documents USING vec0(
            id INTEGER PRIMARY KEY,
            embedding float[1536]
          )
        `);
        resolve();
      });
    });
  }

  async run(sql: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }

  async get(sql: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  async all(sql: string, params: any[] = []): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
}
