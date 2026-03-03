import * as dotenv from 'dotenv';
import { IGraphDatabase } from './database';
import { FalkorDBAdapter } from './database/FalkorDBAdapter';
import { AuraDBAdapter } from './database/AuraDBAdapter';
import { RealmDBAdapter } from './database/RealmDBAdapter';

// 加载环境变量
dotenv.config();

/**
 * 数据库类型
 */
export type DatabaseType = 'falkordb' | 'auradb' | 'realmdb';

/**
 * 配置接口
 */
export interface Config {
  // 服务器配置
  port: number;
  
  // 数据库配置
  database: {
    type: DatabaseType;
    graphName: string;
  };
  
  // FalkorDB 配置
  falkordb?: {
    url: string;
  };
  
  // AuraDB 配置
  auradb?: {
    uri: string;
    username: string;
    password: string;
    database: string;
  };
  
  // RealmDB 配置
  realmdb?: {
    path: string;
  };
}

/**
 * 从环境变量加载配置
 */
export function loadConfig(): Config {
  const dbType = (process.env.DB_TYPE || 'falkordb').toLowerCase() as DatabaseType;
  
  if (!['falkordb', 'auradb', 'realmdb'].includes(dbType)) {
    throw new Error(`Invalid DB_TYPE: ${dbType}. Must be either 'falkordb', 'auradb', or 'realmdb'`);
  }

  const config: Config = {
    port: parseInt(process.env.PORT || '8080', 10),
    database: {
      type: dbType,
      graphName: process.env.GRAPH_NAME || 'matchstick'
    }
  };

  // 根据数据库类型加载相应配置
  if (dbType === 'falkordb') {
    config.falkordb = {
      url: process.env.FALKORDB_URL || 'redis://localhost:6379'
    };
  } else if (dbType === 'auradb') {
    const uri = process.env.AURADB_URI;
    const username = process.env.AURADB_USERNAME;
    const password = process.env.AURADB_PASSWORD;

    if (!uri || !username || !password) {
      throw new Error(
        'AuraDB configuration incomplete. Please set AURADB_URI, AURADB_USERNAME, and AURADB_PASSWORD in .env file'
      );
    }

    config.auradb = {
      uri,
      username,
      password,
      database: process.env.AURADB_DATABASE || 'neo4j'
    };
  } else if (dbType === 'realmdb') {
    const path = process.env.REALMDB_PATH || './data/matchstick.realm';
    
    config.realmdb = {
      path
    };
  }

  return config;
}

/**
 * 创建数据库适配器实例
 */
export function createDatabaseAdapter(config: Config): IGraphDatabase {
  const { type, graphName } = config.database;

  if (type === 'falkordb') {
    if (!config.falkordb) {
      throw new Error('FalkorDB configuration not found');
    }
    return new FalkorDBAdapter(config.falkordb.url, graphName);
  } else if (type === 'auradb') {
    if (!config.auradb) {
      throw new Error('AuraDB configuration not found');
    }
    return new AuraDBAdapter(
      config.auradb.uri,
      config.auradb.username,
      config.auradb.password,
      config.auradb.database
    );
  } else if (type === 'realmdb') {
    if (!config.realmdb) {
      throw new Error('RealmDB configuration not found');
    }
    return new RealmDBAdapter(
      config.realmdb.path,
      graphName
    );
  } else {
    throw new Error(`Unsupported database type: ${type}`);
  }
}

/**
 * 打印当前配置信息（隐藏敏感信息）
 */
export function printConfig(config: Config): void {
  console.log('\n📋 Configuration:');
  console.log(`   Server Port: ${config.port}`);
  console.log(`   Database Type: ${config.database.type.toUpperCase()}`);
  console.log(`   Graph Name: ${config.database.graphName}`);
  
  if (config.database.type === 'falkordb' && config.falkordb) {
    console.log(`   FalkorDB URL: ${config.falkordb.url}`);
  } else if (config.database.type === 'auradb' && config.auradb) {
    console.log(`   AuraDB URI: ${config.auradb.uri}`);
    console.log(`   AuraDB Username: ${config.auradb.username}`);
    console.log(`   AuraDB Database: ${config.auradb.database}`);
    console.log(`   AuraDB Password: ${'*'.repeat(config.auradb.password.length)}`);
  } else if (config.database.type === 'realmdb' && config.realmdb) {
    console.log(`   RealmDB Path: ${config.realmdb.path}`);
  }
  console.log('');
}
