import { round } from './utils/round';

export class Progress {
  private count = 0;
  private lastTime = 0;
  private startTime = 0;

  constructor(
    private total: number,
    private interval: number,
    private logger: (s: string) => void = console.log,
  ) {}

  start(): void {
    this.startTime = Date.now();
    this.lastTime = this.startTime;

    this.logger(`[progress] total: ${this.total}`);
  }

  tick(): void {
    this.count += 1;
    const currentTime = Date.now();
    if (currentTime - this.lastTime > this.interval) {
      const elapsed = currentTime - this.startTime;
      const progress = round((this.count / this.total) * 100, 2);
      const remainingRate = (elapsed / this.count) * (this.total - this.count);
      const remainingSeconds = round(remainingRate / 1000, 2);
      this.lastTime = currentTime;
      this.logger(`[progress] ${progress}% remaining: ${remainingSeconds}s`);
    }
  }
}
