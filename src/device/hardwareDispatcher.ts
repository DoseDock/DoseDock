import type { HardwareCommand, PillHardwareProfile } from '@types';

export type HardwareSimulationResult = {
  ok: boolean;
  command: HardwareCommand;
  message: string;
};

export class HardwareDispatcher {
  async previewCommand(profile: PillHardwareProfile): Promise<HardwareSimulationResult> {
    if (!profile.serialNumber || profile.siloSlot == null) {
      return {
        ok: false,
        command: this.buildCommand(profile),
        message: 'Profile missing serial number or silo slot',
      };
    }

    // Simulate latency
    await this.delay(400);

    return {
      ok: true,
      command: this.buildCommand(profile),
      message: `Trapdoor would open for ${profile.trapdoorOpenMs ?? 1200}ms`,
    };
  }

  async dispatch(profile: PillHardwareProfile): Promise<HardwareSimulationResult> {
    const command = this.buildCommand(profile);
    console.log('[hardware] dispatching command', command);
    await this.delay(800);
    return {
      ok: true,
      command,
      message: 'Command queued for silo controller',
    };
  }

  private buildCommand(profile: PillHardwareProfile): HardwareCommand {
    return {
      serialNumber: profile.serialNumber,
      siloSlot: profile.siloSlot ?? -1,
      trapdoorOpenMs: profile.trapdoorOpenMs ?? 1200,
      trapdoorHoldMs: profile.trapdoorHoldMs ?? 800,
      payload: {
        dimensions: {
          diameterMm: profile.diameterMm,
          lengthMm: profile.lengthMm,
          widthMm: profile.widthMm,
          heightMm: profile.heightMm,
        },
        weightMg: profile.weightMg,
        density: profile.density,
        timestamp: Date.now(),
      },
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const hardwareDispatcher = new HardwareDispatcher();

