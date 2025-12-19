/**
 * ScannerService - Communication with companion app for scanners/printers
 * Uses WebSocket for real-time communication
 */

type ScannerEventListener = (event: ScannerEvent) => void;

export interface ScannerDevice {
  id: string;
  name: string;
  type: 'scanner' | 'printer' | 'multifunction';
  status: 'online' | 'offline' | 'busy';
  capabilities: {
    scan?: boolean;
    print?: boolean;
    duplex?: boolean;
    color?: boolean;
    maxDpi?: number;
  };
}

export interface ScannerEvent {
  type: 'connected' | 'disconnected' | 'device_found' | 'scan_complete' | 'print_complete' | 'error';
  data?: unknown;
}

export interface ScanOptions {
  deviceId: string;
  resolution?: number; // DPI
  colorMode?: 'color' | 'grayscale' | 'bw';
  format?: 'pdf' | 'png' | 'jpeg';
  duplex?: boolean;
  autoCrop?: boolean;
}

export interface PrintOptions {
  deviceId: string;
  copies?: number;
  duplex?: boolean;
  colorMode?: 'color' | 'grayscale' | 'bw';
  pageRange?: string;
  fitToPage?: boolean;
}

class ScannerService {
  private ws: WebSocket | null = null;
  private reconnectInterval: number | null = null;
  private listeners: Set<ScannerEventListener> = new Set();
  private devices: Map<string, ScannerDevice> = new Map();
  private isConnected: boolean = false;
  private companionPort: number = 9876;

  // Get companion app URL
  private getCompanionUrl(): string {
    return `ws://localhost:${this.companionPort}`;
  }

  // Connect to companion app
  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    try {
      this.ws = new WebSocket(this.getCompanionUrl());

      this.ws.onopen = () => {
        this.isConnected = true;
        this.emit({ type: 'connected' });
        this.requestDevices();
        
        if (this.reconnectInterval) {
          clearInterval(this.reconnectInterval);
          this.reconnectInterval = null;
        }
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.emit({ type: 'disconnected' });
        this.startReconnect();
      };

      this.ws.onerror = () => {
        console.log('Scanner companion app not available');
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (e) {
          console.error('Invalid message from companion:', e);
        }
      };
    } catch (e) {
      console.log('Could not connect to scanner companion app');
      this.startReconnect();
    }
  }

  private startReconnect(): void {
    if (this.reconnectInterval) return;
    this.reconnectInterval = window.setInterval(() => {
      if (!this.isConnected) {
        this.connect();
      }
    }, 5000);
  }

  disconnect(): void {
    if (this.reconnectInterval) {
      clearInterval(this.reconnectInterval);
      this.reconnectInterval = null;
    }
    this.ws?.close();
    this.ws = null;
    this.isConnected = false;
  }

  private handleMessage(message: { type: string; payload?: unknown }): void {
    switch (message.type) {
      case 'devices':
        const devices = message.payload as ScannerDevice[];
        this.devices.clear();
        devices.forEach(d => {
          this.devices.set(d.id, d);
          this.emit({ type: 'device_found', data: d });
        });
        break;

      case 'scan_complete':
        this.emit({ type: 'scan_complete', data: message.payload });
        break;

      case 'print_complete':
        this.emit({ type: 'print_complete', data: message.payload });
        break;

      case 'error':
        this.emit({ type: 'error', data: message.payload });
        break;
    }
  }

  // Event handling
  subscribe(listener: ScannerEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: ScannerEvent): void {
    this.listeners.forEach(listener => listener(event));
  }

  // Device discovery
  requestDevices(): void {
    this.send({ type: 'discover_devices' });
  }

  getDevices(): ScannerDevice[] {
    return Array.from(this.devices.values());
  }

  getDevice(id: string): ScannerDevice | undefined {
    return this.devices.get(id);
  }

  // Scanning
  async scan(options: ScanOptions): Promise<{ success: boolean; file?: Blob; error?: string }> {
    if (!this.isConnected) {
      return { success: false, error: 'Companion app not connected' };
    }

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve({ success: false, error: 'Scan timeout' });
      }, 60000);

      const unsubscribe = this.subscribe((event) => {
        if (event.type === 'scan_complete') {
          clearTimeout(timeout);
          unsubscribe();
          const data = event.data as { base64: string; mimeType: string };
          const bytes = atob(data.base64);
          const arr = new Uint8Array(bytes.length);
          for (let i = 0; i < bytes.length; i++) {
            arr[i] = bytes.charCodeAt(i);
          }
          resolve({ success: true, file: new Blob([arr], { type: data.mimeType }) });
        } else if (event.type === 'error') {
          clearTimeout(timeout);
          unsubscribe();
          resolve({ success: false, error: String(event.data) });
        }
      });

      this.send({
        type: 'scan',
        payload: {
          deviceId: options.deviceId,
          resolution: options.resolution || 300,
          colorMode: options.colorMode || 'color',
          format: options.format || 'pdf',
          duplex: options.duplex || false,
          autoCrop: options.autoCrop !== false,
        },
      });
    });
  }

  // Printing
  async print(fileUrl: string, options: PrintOptions): Promise<{ success: boolean; error?: string }> {
    if (!this.isConnected) {
      // Fallback to browser print
      return this.browserPrint(fileUrl);
    }

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve({ success: false, error: 'Print timeout' });
      }, 120000);

      const unsubscribe = this.subscribe((event) => {
        if (event.type === 'print_complete') {
          clearTimeout(timeout);
          unsubscribe();
          resolve({ success: true });
        } else if (event.type === 'error') {
          clearTimeout(timeout);
          unsubscribe();
          resolve({ success: false, error: String(event.data) });
        }
      });

      this.send({
        type: 'print',
        payload: {
          fileUrl,
          ...options,
        },
      });
    });
  }

  // Browser fallback for printing
  private browserPrint(fileUrl: string): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      try {
        const win = window.open(fileUrl, '_blank');
        if (win) {
          win.onload = () => {
            win.print();
            resolve({ success: true });
          };
        } else {
          resolve({ success: false, error: 'Could not open print window' });
        }
      } catch (e) {
        resolve({ success: false, error: 'Print failed' });
      }
    });
  }

  // Utility
  private send(message: { type: string; payload?: unknown }): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  getStatus(): { connected: boolean; deviceCount: number } {
    return {
      connected: this.isConnected,
      deviceCount: this.devices.size,
    };
  }
}

export const scannerService = new ScannerService();

// Auto-connect when module loads
if (typeof window !== 'undefined') {
  scannerService.connect();
}
