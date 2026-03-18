/**
 * ConnectionQualityMonitor — tracks network quality based on positionCorrection frequency.
 *
 * Uses a 5-second sliding window of correction timestamps to classify connection quality
 * as 'good', 'degraded', or 'poor'. Calls back on quality changes so the UI can react.
 */

export type ConnectionQuality = 'good' | 'degraded' | 'poor';

export class ConnectionQualityMonitor {
  private correctionTimestamps: number[] = [];

  /** Sliding window duration in milliseconds. */
  private readonly WINDOW_MS = 5000;

  /** More than this many corrections in the window = degraded. */
  private readonly DEGRADED_THRESHOLD = 3;

  /** More than this many corrections in the window = poor. */
  private readonly POOR_THRESHOLD = 8;

  private currentQuality: ConnectionQuality = 'good';
  private onQualityChange: ((quality: ConnectionQuality) => void) | null = null;

  setOnQualityChange(callback: (quality: ConnectionQuality) => void): void {
    this.onQualityChange = callback;
  }

  /** Record a positionCorrection event. */
  recordCorrection(): void {
    const now = Date.now();
    this.correctionTimestamps.push(now);
    // Prune entries older than the window
    this.correctionTimestamps = this.correctionTimestamps.filter(
      (t) => now - t < this.WINDOW_MS,
    );
    this.evaluate();
  }

  private evaluate(): void {
    const count = this.correctionTimestamps.length;
    let newQuality: ConnectionQuality;

    if (count > this.POOR_THRESHOLD) {
      newQuality = 'poor';
    } else if (count > this.DEGRADED_THRESHOLD) {
      newQuality = 'degraded';
    } else {
      newQuality = 'good';
    }

    if (newQuality !== this.currentQuality) {
      this.currentQuality = newQuality;
      this.onQualityChange?.(newQuality);
    }
  }

  getQuality(): ConnectionQuality {
    // Prune before reading
    const now = Date.now();
    this.correctionTimestamps = this.correctionTimestamps.filter(
      (t) => now - t < this.WINDOW_MS,
    );
    this.evaluate();
    return this.currentQuality;
  }

  reset(): void {
    this.correctionTimestamps = [];
    this.currentQuality = 'good';
    this.onQualityChange?.('good');
  }
}
