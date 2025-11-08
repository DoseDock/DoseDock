import type { DosePill } from '@types';

export interface DispenseResult {
  ok: boolean;
  error?: string;
  errorCode?: string;
}

/**
 * Mock device API for dispensing pills
 * In production, this would communicate with the actual hardware via BLE
 */
export class MockDevice {
  private failureRate = 0.1; // 10% failure rate for simulation
  
  /**
   * Simulate dispensing pills from the device
   * Returns ok: true 90% of the time, else simulates a jam or other error
   */
  async dispense(items: DosePill[]): Promise<DispenseResult> {
    // Simulate device communication delay
    await this.delay(1500 + Math.random() * 1000);
    
    // Simulate occasional failures
    if (Math.random() < this.failureRate) {
      const errorCodes = ['JAM', 'EMPTY_CARTRIDGE', 'SENSOR_ERROR', 'MOTOR_FAULT'];
      const errorCode = errorCodes[Math.floor(Math.random() * errorCodes.length)];
      
      return {
        ok: false,
        error: this.getErrorMessage(errorCode),
        errorCode,
      };
    }
    
    // Success
    console.log('Mock device dispensed:', items);
    return { ok: true };
  }
  
  /**
   * Check device connectivity
   */
  async checkConnection(): Promise<boolean> {
    await this.delay(500);
    return Math.random() > 0.05; // 95% connection success rate
  }
  
  /**
   * Get device status (battery, cartridges, etc.)
   */
  async getStatus(): Promise<{
    batteryLevel: number;
    wifiStrength: number;
    cartridges: Array<{ index: number; level: number }>;
  }> {
    await this.delay(300);
    
    return {
      batteryLevel: 75 + Math.random() * 25, // 75-100%
      wifiStrength: 60 + Math.random() * 40, // 60-100%
      cartridges: Array.from({ length: 10 }, (_, i) => ({
        index: i,
        level: Math.floor(Math.random() * 100),
      })),
    };
  }
  
  /**
   * Test dispense a single pill from a cartridge
   */
  async testDispense(cartridgeIndex: number): Promise<DispenseResult> {
    await this.delay(1000);
    
    if (Math.random() < 0.15) {
      return {
        ok: false,
        error: `Cartridge ${cartridgeIndex} test failed`,
        errorCode: 'TEST_FAILED',
      };
    }
    
    return { ok: true };
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  
  private getErrorMessage(code: string): string {
    const messages: Record<string, string> = {
      JAM: 'Pill dispenser jammed. Please check the device.',
      EMPTY_CARTRIDGE: 'One or more cartridges are empty.',
      SENSOR_ERROR: 'Sensor malfunction detected.',
      MOTOR_FAULT: 'Motor error. Device needs service.',
      TEST_FAILED: 'Test dispense failed.',
    };
    
    return messages[code] || 'Unknown device error';
  }
}

export const mockDevice = new MockDevice();

