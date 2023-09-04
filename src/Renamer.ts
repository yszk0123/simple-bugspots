import { Fix } from './Fix';

export class Renamer {
  private index = 0;
  private mapByIndex = new Map<number, Map<string, string>>();
  private head = new Map<string, string>();

  add(commitIndex: number, src: string, dest: string): void {
    const map = this.mapByIndex.get(commitIndex) ?? new Map();
    map.set(src, dest);
    this.mapByIndex.set(commitIndex, map);
  }

  applyRename(fixes: Fix[]): void {
    for (const fix of fixes) {
      this.proceedTo(fix.commitIndex);
      fix.files = fix.files.map((file) => this.head.get(file) ?? file);
    }
  }

  private proceedTo(commitIndex: number): void {
    for (; this.index <= commitIndex; this.index += 1) {
      const map = this.mapByIndex.get(this.index);
      if (map) {
        for (const [src, dest] of map) {
          const latest = this.head.get(dest) ?? dest;
          this.head.set(src, latest);
        }
      }
    }
  }
}
