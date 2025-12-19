/**
 * useScanner - Hook for scanner/printer integration
 */

import { useState, useEffect, useCallback } from 'react';
import { scannerService, ScannerDevice, ScanOptions, PrintOptions } from '@/lib/scannerService';
import { toast } from '@/hooks/use-toast';

export const useScanner = () => {
  const [devices, setDevices] = useState<ScannerDevice[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    const unsubscribe = scannerService.subscribe((event) => {
      switch (event.type) {
        case 'connected':
          setIsConnected(true);
          toast({
            title: 'App compagnon connectée',
            description: 'Scanner et imprimante disponibles',
          });
          break;

        case 'disconnected':
          setIsConnected(false);
          setDevices([]);
          break;

        case 'device_found':
          setDevices(scannerService.getDevices());
          break;

        case 'error':
          toast({
            title: 'Erreur périphérique',
            description: String(event.data),
            variant: 'destructive',
          });
          break;
      }
    });

    // Get initial state
    const status = scannerService.getStatus();
    setIsConnected(status.connected);
    setDevices(scannerService.getDevices());

    return unsubscribe;
  }, []);

  const scan = useCallback(async (options: Partial<ScanOptions> = {}): Promise<File | null> => {
    const scanners = devices.filter(d => d.capabilities.scan && d.status === 'online');
    
    if (scanners.length === 0) {
      toast({
        title: 'Aucun scanner disponible',
        description: 'Connectez un scanner ou lancez l\'app compagnon',
        variant: 'destructive',
      });
      return null;
    }

    const deviceId = options.deviceId || scanners[0].id;
    
    setIsScanning(true);
    try {
      const result = await scannerService.scan({
        deviceId,
        resolution: options.resolution || 300,
        colorMode: options.colorMode || 'color',
        format: options.format || 'pdf',
        duplex: options.duplex,
        autoCrop: options.autoCrop,
      });

      if (result.success && result.file) {
        const fileName = `Scan_${new Date().toISOString().slice(0, 10)}.${options.format || 'pdf'}`;
        const file = new File([result.file], fileName, { type: result.file.type });
        
        toast({
          title: 'Numérisation terminée',
          description: fileName,
        });
        
        return file;
      } else {
        toast({
          title: 'Échec de la numérisation',
          description: result.error || 'Erreur inconnue',
          variant: 'destructive',
        });
        return null;
      }
    } finally {
      setIsScanning(false);
    }
  }, [devices]);

  const print = useCallback(async (
    fileUrl: string, 
    options: Partial<PrintOptions> = {}
  ): Promise<boolean> => {
    const printers = devices.filter(d => d.capabilities.print && d.status === 'online');
    
    // Use browser print if no companion printers
    if (!isConnected || printers.length === 0) {
      try {
        const win = window.open(fileUrl, '_blank');
        if (win) {
          win.focus();
          setTimeout(() => win.print(), 500);
          return true;
        }
        return false;
      } catch {
        return false;
      }
    }

    const deviceId = options.deviceId || printers[0].id;
    
    setIsPrinting(true);
    try {
      const result = await scannerService.print(fileUrl, {
        deviceId,
        copies: options.copies || 1,
        duplex: options.duplex,
        colorMode: options.colorMode,
        pageRange: options.pageRange,
        fitToPage: options.fitToPage,
      });

      if (result.success) {
        toast({
          title: 'Impression envoyée',
          description: 'Document en cours d\'impression',
        });
        return true;
      } else {
        toast({
          title: 'Échec de l\'impression',
          description: result.error || 'Erreur inconnue',
          variant: 'destructive',
        });
        return false;
      }
    } finally {
      setIsPrinting(false);
    }
  }, [devices, isConnected]);

  const refreshDevices = useCallback(() => {
    scannerService.requestDevices();
  }, []);

  const getScanners = useCallback(() => {
    return devices.filter(d => d.capabilities.scan);
  }, [devices]);

  const getPrinters = useCallback(() => {
    return devices.filter(d => d.capabilities.print);
  }, [devices]);

  return {
    devices,
    isConnected,
    isScanning,
    isPrinting,
    scan,
    print,
    refreshDevices,
    getScanners,
    getPrinters,
  };
};
