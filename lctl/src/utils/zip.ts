import * as fs from 'fs/promises';
import * as path from 'path';
import * as archiver from 'archiver';
import { glob } from 'glob';
import { Logger } from './logger';
import { createWriteStream } from 'fs';

export class ZipManager {
  constructor(private logger: Logger) {}

  async createZip(functionName: string, files: string[] = ['.']): Promise<string> {
    const zipPath = path.join(process.cwd(), `${functionName}-deploy.zip`);
    
    this.logger.verbose(`Creating ZIP file: ${zipPath}`);
    
    const output = createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    return new Promise(async (resolve, reject) => {
      output.on('close', () => {
        this.logger.verbose(`ZIP file created: ${archive.pointer()} bytes`);
        resolve(zipPath);
      });

      archive.on('error', (err) => {
        reject(err);
      });

      archive.pipe(output);

      try {
        // Add files to archive
        for (const filePattern of files) {
          await this.addFilesToArchive(archive, filePattern);
        }

        await archive.finalize();
      } catch (error) {
        reject(error);
      }
    });
  }

  private async addFilesToArchive(archive: archiver.Archiver, filePattern: string): Promise<void> {
    const isGlobPattern = filePattern.includes('*') || filePattern.includes('?');
    
    if (isGlobPattern) {
      // Handle glob patterns
      const matches = await glob(filePattern, { 
        cwd: process.cwd(),
        ignore: ['node_modules/**', '.git/**', '*.zip', 'dist/**']
      });
      
      for (const match of matches) {
        const fullPath = path.join(process.cwd(), match);
        const stat = await fs.stat(fullPath);
        
        if (stat.isFile()) {
          archive.file(fullPath, { name: match });
          this.logger.verbose(`Added file: ${match}`);
        }
      }
    } else {
      // Handle direct file/directory paths
      const fullPath = path.join(process.cwd(), filePattern);
      
      try {
        const stat = await fs.stat(fullPath);
        
        if (stat.isFile()) {
          archive.file(fullPath, { name: filePattern });
          this.logger.verbose(`Added file: ${filePattern}`);
        } else if (stat.isDirectory()) {
          archive.directory(fullPath, filePattern === '.' ? false : filePattern);
          this.logger.verbose(`Added directory: ${filePattern}`);
        }
      } catch (error) {
        this.logger.warning(`File not found: ${filePattern}`);
      }
    }
  }

  async cleanup(zipPath: string): Promise<void> {
    try {
      await fs.unlink(zipPath);
      this.logger.verbose(`Cleaned up ZIP file: ${zipPath}`);
    } catch (error) {
      this.logger.verbose(`Failed to clean up ZIP file: ${zipPath}`);
    }
  }
}